import { PARTICIPANT_PICKS } from "../data/picks";
import { VALERO_PARTICIPANT_PICKS } from "../data/valeroPicks";
import { buildLiveScoresResponse } from "./scoring";
import { getGolfData } from "../providers/golfProvider";
import { enrichPayloadWithHeadshots } from "./headshots";
import type { LiveScoresResponse, PreviousStanding } from "./types";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

let lastValidPayload: LiveScoresResponse | null = null;
const MAX_GRAPH_HISTORY_POINTS = 36;
const LIVE_CACHE_TTL_MS = 2 * 60 * 1000;
const RUNTIME_DATA_DIR = process.env.NETLIFY ? path.join("/tmp", "roundtable-masters-pickem") : path.join(process.cwd(), "data");
const GRAPH_HISTORY_FILE = path.join(RUNTIME_DATA_DIR, "graphHistory.json");
const MOVEMENT_BASELINE_FILE = path.join(RUNTIME_DATA_DIR, "movementBaseline.json");
let cachedLivePayload: { mode: "mock" | "valero" | "live"; payload: LiveScoresResponse; expiresAt: number } | null = null;
let graphHistoryLoaded = false;
let movementBaselineLoaded = false;

interface HistorySnapshot {
  key: string;
  label: string;
  round: number;
  values: Map<string, number | null>;
}

interface StoredHistorySnapshot {
  key: string;
  label: string;
  round: number;
  values: Record<string, number | null>;
}

const graphHistoryByMode = new Map<string, HistorySnapshot[]>();
const movementBaselineByKey = new Map<string, PreviousStanding[]>();

function getFreshCachedPayload(mode: "mock" | "valero" | "live"): LiveScoresResponse | null {
  if (!cachedLivePayload) {
    return null;
  }

  if (cachedLivePayload.mode !== mode) {
    return null;
  }

  if (Date.now() > cachedLivePayload.expiresAt) {
    return null;
  }

  return cachedLivePayload.payload;
}

function setFreshCachedPayload(mode: "mock" | "valero" | "live", payload: LiveScoresResponse): void {
  cachedLivePayload = {
    mode,
    payload,
    expiresAt: Date.now() + LIVE_CACHE_TTL_MS,
  };
}

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

function getMovementDateKey(updatedAt: string): string {
  const date = updatedAt ? new Date(updatedAt) : new Date();

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(Number.isNaN(date.getTime()) ? new Date() : date);
}

function getMovementBaselineKey(mode: "mock" | "valero" | "live", tournament: string, updatedAt: string): string {
  return `${mode}:${tournament}:${getMovementDateKey(updatedAt)}`;
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

function getCurrentRoundFromPayload(payload: LiveScoresResponse): number {
  const firstSeries = payload.graphSeries[0];
  if (!firstSeries?.points?.length) {
    return 1;
  }

  const roundCount = Math.max(firstSeries.points.length - 1, 1);
  return Math.min(roundCount, 4);
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
          round: snapshot.round,
          values: Object.fromEntries(snapshot.values),
        })),
      ]),
    );

    await writeFile(GRAPH_HISTORY_FILE, JSON.stringify(serializableHistory, null, 2), "utf8");
  } catch (error) {
    console.warn("[liveScoresService] Unable to persist graph history cache.", error);
  }
}

async function ensureMovementBaselineLoaded(): Promise<void> {
  if (movementBaselineLoaded) {
    return;
  }

  movementBaselineLoaded = true;

  try {
    const raw = await readFile(MOVEMENT_BASELINE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, PreviousStanding[]>;

    for (const [baselineKey, standings] of Object.entries(parsed)) {
      movementBaselineByKey.set(baselineKey, standings);
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      console.warn("[liveScoresService] Unable to load movement baseline cache.", error);
    }
  }
}

async function persistMovementBaseline(): Promise<void> {
  try {
    await mkdir(path.dirname(MOVEMENT_BASELINE_FILE), { recursive: true });
    await writeFile(
      MOVEMENT_BASELINE_FILE,
      JSON.stringify(Object.fromEntries(movementBaselineByKey), null, 2),
      "utf8",
    );
  } catch (error) {
    console.warn("[liveScoresService] Unable to persist movement baseline cache.", error);
  }
}

async function getMovementBaseline(
  mode: "mock" | "valero" | "live",
  tournament: string,
  updatedAt: string,
  participantNames: string[],
): Promise<PreviousStanding[]> {
  await ensureMovementBaselineLoaded();

  const baselineKey = getMovementBaselineKey(mode, tournament, updatedAt);
  const existingBaseline = movementBaselineByKey.get(baselineKey);

  if (existingBaseline?.length) {
    return existingBaseline;
  }

  const baseline = participantNames.map((name, index) => ({
    name,
    rank: index + 1,
  }));

  movementBaselineByKey.set(baselineKey, baseline);
  await persistMovementBaseline();
  return baseline;
}

async function applyGraphHistory(payload: LiveScoresResponse, mode: "mock" | "valero" | "live"): Promise<LiveScoresResponse> {
  await ensureGraphHistoryLoaded();

  const historyKey = getHistoryKey(mode, payload.tournament);
  const history = graphHistoryByMode.get(historyKey) ?? [];
  const snapshotKey = buildSnapshotKey(payload);
  const currentRound = getCurrentRoundFromPayload(payload);

  if (history.length === 0 || history[history.length - 1]?.key !== snapshotKey) {
    history.push({
      key: snapshotKey,
      label: formatHistoryLabel(payload.updatedAt, history.length),
      round: currentRound,
      values: new Map(payload.standings.map((entry) => [entry.name, entry.bestFourTotal])),
    });
  } else {
    history[history.length - 1] = {
      key: snapshotKey,
      label: formatHistoryLabel(payload.updatedAt, history.length - 1),
      round: currentRound,
      values: new Map(payload.standings.map((entry) => [entry.name, entry.bestFourTotal])),
    };
  }

  const trimmedHistory = collapseDuplicateSnapshots(history).slice(-MAX_GRAPH_HISTORY_POINTS);
  graphHistoryByMode.set(historyKey, trimmedHistory);
  await persistGraphHistory();

  return {
    ...payload,
    graphSeries: payload.graphSeries.map((series) => {
      const completedRoundPoints = series.points.filter((point) => point.label === "Start" || /^Round\s+\d+$/i.test(point.label)).slice(0, Math.max(currentRound, 1));
      const currentRoundSnapshots = trimmedHistory
        .filter((snapshot) => snapshot.round === currentRound)
        .map((snapshot) => ({
          label: snapshot.label,
          value: snapshot.values.get(series.name) ?? null,
        }));

      return {
        name: series.name,
        points: [...completedRoundPoints, ...currentRoundSnapshots],
      };
    }),
  };
}

async function buildEnrichedPayload(
  liveData: Awaited<ReturnType<typeof getGolfData>>,
  picks: typeof PARTICIPANT_PICKS,
  mode: "mock" | "valero" | "live",
): Promise<LiveScoresResponse> {
  const openingPayload = buildLiveScoresResponse(liveData, picks, []);
  const movementBaseline = await getMovementBaseline(
    mode,
    liveData.tournament,
    liveData.updatedAt,
    openingPayload.standings.map((entry) => entry.name),
  );

  const payload = buildLiveScoresResponse(liveData, picks, movementBaseline);
  return applyGraphHistory(await enrichPayloadWithHeadshots(payload), mode);
}

export async function getLiveScoresPayload(): Promise<LiveScoresResponse> {
  const mode = getConfiguredMode();
  const picks = getConfiguredPicks(mode);

  const freshCachedPayload = getFreshCachedPayload(mode);
  if (freshCachedPayload) {
    return freshCachedPayload;
  }

  if (mode === "mock") {
    const mockData = await getGolfData({
      mode: "mock",
      picks,
      tournamentName: "Masters Tournament",
      seedPrefix: "masters",
    });
    const payload = await buildEnrichedPayload(mockData, picks, mode);
    lastValidPayload = payload;
    setFreshCachedPayload(mode, payload);
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
        const payload = await buildEnrichedPayload(liveValeroData, picks, mode);
        lastValidPayload = payload;
        setFreshCachedPayload(mode, payload);
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
    const payload = await buildEnrichedPayload(practiceData, picks, mode);
    lastValidPayload = payload;
    setFreshCachedPayload(mode, payload);
    return payload;
  }

  try {
    const liveData = await getGolfData({ mode: "live", picks });
    const payload = await buildEnrichedPayload(liveData, picks, mode);
    lastValidPayload = payload;
    setFreshCachedPayload(mode, payload);
    return payload;
  } catch (error) {
    console.warn("[liveScoresService] Live golf provider failed. Falling back.", error);

    const staleCachedPayload = cachedLivePayload?.mode === mode ? cachedLivePayload.payload : null;
    if (staleCachedPayload) {
      return staleCachedPayload;
    }

    if (lastValidPayload) {
      return lastValidPayload;
    }

    const mockData = await getGolfData({
      mode: "mock",
      picks: PARTICIPANT_PICKS,
      tournamentName: "Masters Tournament",
      seedPrefix: "masters",
    });
    const payload = await buildEnrichedPayload(mockData, PARTICIPANT_PICKS, "mock");
    lastValidPayload = payload;
    setFreshCachedPayload("mock", payload);
    return payload;
  }
}
