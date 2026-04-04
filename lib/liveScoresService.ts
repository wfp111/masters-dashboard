import { PARTICIPANT_PICKS } from "../data/picks";
import { VALERO_PARTICIPANT_PICKS } from "../data/valeroPicks";
import { buildLiveScoresResponse } from "./scoring";
import { getGolfData } from "../providers/golfProvider";
import { enrichPayloadWithHeadshots } from "./headshots";
import type { LiveScoresResponse } from "./types";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

let lastValidPayload: LiveScoresResponse | null = null;
const MAX_GRAPH_HISTORY_POINTS = 36;
const GRAPH_HISTORY_FILE = path.join(process.cwd(), "data", "graphHistory.json");
let graphHistoryLoaded = false;

interface HistorySnapshot {
  key: string;
  label: string;
  values: Map<string, number | null>;
}

interface StoredHistorySnapshot {
  key: string;
  label: string;
  values: Record<string, number | null>;
}

const graphHistoryByMode = new Map<string, HistorySnapshot[]>();

function getConfiguredMode(): "mock" | "valero" | "live" {
  if (process.env.GOLF_DATA_MODE === "valero") {
    return "valero";
  }

  return process.env.GOLF_DATA_MODE === "live" ? "live" : "mock";
}

function getConfiguredPicks(mode: "mock" | "valero" | "live") {
  if (mode === "valero") {
    return VALERO_PARTICIPANT_PICKS;
  }

  return PARTICIPANT_PICKS;
}

function getValeroLiveConfig() {
  return {
    tournamentId: process.env.SPORTRADAR_VALERO_TOURNAMENT_ID,
    baseUrl: process.env.SPORTRADAR_VALERO_BASE_URL,
  };
}

function getHistoryKey(mode: "mock" | "valero" | "live", tournament: string): string {
  return `${mode}:${tournament}`;
}

function formatHistoryLabel(updatedAt: string, historyLength: number): string {
  if (!updatedAt) {
    return `Update ${historyLength + 1}`;
  }

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return `Update ${historyLength + 1}`;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildSnapshotKey(payload: LiveScoresResponse): string {
  return payload.standings
    .map((entry) => `${entry.name}:${entry.bestFourTotal ?? "null"}:${entry.today ?? "null"}:${entry.rank}`)
    .join("|");
}

function collapseDuplicateSnapshots(snapshots: HistorySnapshot[]): HistorySnapshot[] {
  const collapsed: HistorySnapshot[] = [];

  for (const snapshot of snapshots) {
    const previous = collapsed[collapsed.length - 1];

    if (previous?.key === snapshot.key) {
      collapsed[collapsed.length - 1] = snapshot;
      continue;
    }

    collapsed.push(snapshot);
  }

  return collapsed;
}

async function ensureGraphHistoryLoaded(): Promise<void> {
  if (graphHistoryLoaded) {
    return;
  }

  graphHistoryLoaded = true;

  try {
    const raw = await readFile(GRAPH_HISTORY_FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, StoredHistorySnapshot[]>;

    for (const [historyKey, snapshots] of Object.entries(parsed)) {
      graphHistoryByMode.set(
        historyKey,
        collapseDuplicateSnapshots(
          snapshots.map((snapshot) => ({
            key: snapshot.key,
            label: snapshot.label,
            values: new Map(Object.entries(snapshot.values)),
          })),
        ),
      );
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      console.warn("[liveScoresService] Unable to load graph history cache.", error);
    }
  }
}

async function persistGraphHistory(): Promise<void> {
  try {
    await mkdir(path.dirname(GRAPH_HISTORY_FILE), { recursive: true });

    const serializableHistory = Object.fromEntries(
      [...graphHistoryByMode.entries()].map(([historyKey, snapshots]) => [
        historyKey,
        snapshots.map((snapshot) => ({
          key: snapshot.key,
          label: snapshot.label,
          values: Object.fromEntries(snapshot.values),
        })),
      ]),
    );

    await writeFile(GRAPH_HISTORY_FILE, JSON.stringify(serializableHistory, null, 2), "utf8");
  } catch (error) {
    console.warn("[liveScoresService] Unable to persist graph history cache.", error);
  }
}

async function applyGraphHistory(payload: LiveScoresResponse, mode: "mock" | "valero" | "live"): Promise<LiveScoresResponse> {
  await ensureGraphHistoryLoaded();

  const historyKey = getHistoryKey(mode, payload.tournament);
  const history = graphHistoryByMode.get(historyKey) ?? [];
  const snapshotKey = buildSnapshotKey(payload);

  if (history.length === 0 || history[history.length - 1]?.key !== snapshotKey) {
    history.push({
      key: snapshotKey,
      label: formatHistoryLabel(payload.updatedAt, history.length),
      values: new Map(payload.standings.map((entry) => [entry.name, entry.bestFourTotal])),
    });
  } else {
    history[history.length - 1] = {
      key: snapshotKey,
      label: formatHistoryLabel(payload.updatedAt, history.length - 1),
      values: new Map(payload.standings.map((entry) => [entry.name, entry.bestFourTotal])),
    };
  }

  const trimmedHistory = collapseDuplicateSnapshots(history).slice(-MAX_GRAPH_HISTORY_POINTS);
  graphHistoryByMode.set(historyKey, trimmedHistory);
  await persistGraphHistory();

  return {
    ...payload,
    graphSeries: payload.standings.map((entry) => ({
      name: entry.name,
      points: [
        { label: "Start", value: 0 },
        ...trimmedHistory.map((snapshot) => ({
          label: snapshot.label,
          value: snapshot.values.get(entry.name) ?? null,
        })),
      ],
    })),
  };
}

export async function getLiveScoresPayload(): Promise<LiveScoresResponse> {
  const mode = getConfiguredMode();
  const picks = getConfiguredPicks(mode);

  if (mode === "mock") {
    const mockData = await getGolfData({
      mode: "mock",
      picks,
      tournamentName: "Masters Tournament",
      seedPrefix: "masters",
    });
    const payload = await applyGraphHistory(await enrichPayloadWithHeadshots(buildLiveScoresResponse(mockData, picks)), mode);
    lastValidPayload = payload;
    return payload;
  }

  if (mode === "valero") {
    const valeroLiveConfig = getValeroLiveConfig();

    if (valeroLiveConfig.tournamentId && valeroLiveConfig.baseUrl) {
      try {
        const liveValeroData = await getGolfData({
          mode: "live",
          picks,
          tournamentId: valeroLiveConfig.tournamentId,
          baseUrl: valeroLiveConfig.baseUrl,
        });
        const payload = await applyGraphHistory(await enrichPayloadWithHeadshots(buildLiveScoresResponse(liveValeroData, picks)), mode);
        lastValidPayload = payload;
        return payload;
      } catch (error) {
        console.warn("[liveScoresService] Valero live feed failed. Falling back to Valero practice data.", error);
      }
    }

    const practiceData = await getGolfData({
      mode: "valero",
      picks,
      tournamentName: "Valero Texas Open",
      seedPrefix: "valero",
    });
    const payload = await applyGraphHistory(await enrichPayloadWithHeadshots(buildLiveScoresResponse(practiceData, picks)), mode);
    lastValidPayload = payload;
    return payload;
  }

  try {
    const liveData = await getGolfData({ mode: "live", picks });
    const payload = await applyGraphHistory(await enrichPayloadWithHeadshots(buildLiveScoresResponse(liveData, picks)), mode);
    lastValidPayload = payload;
    return payload;
  } catch (error) {
    console.warn("[liveScoresService] Live golf provider failed. Falling back.", error);

    if (lastValidPayload) {
      return lastValidPayload;
    }

    const mockData = await getGolfData({
      mode: "mock",
      picks: PARTICIPANT_PICKS,
      tournamentName: "Masters Tournament",
      seedPrefix: "masters",
    });
    const payload = await applyGraphHistory(await enrichPayloadWithHeadshots(buildLiveScoresResponse(mockData, PARTICIPANT_PICKS)), "mock");
    lastValidPayload = payload;
    return payload;
  }
}
