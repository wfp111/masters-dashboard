import type { NormalizedGolfer, NormalizedTournamentData, ParticipantPickSet } from "../lib/types";
import https from "node:https";
import dns from "node:dns";

export type GolfDataMode = "mock" | "valero" | "live";
export type LiveProviderName = "sportradar";

interface GolfDataOptions {
  mode?: GolfDataMode;
  liveProvider?: LiveProviderName;
  picks?: ParticipantPickSet[];
  tournamentName?: string;
  seedPrefix?: string;
  tournamentId?: string;
  baseUrl?: string;
}

interface RawMockPlayer {
  id: string;
  name: string;
  position: string;
  totalToPar: number;
  today: number;
  thru: string;
  rounds: [number | null, number | null, number | null, number | null];
  status: "active" | "wd" | "cut";
}

interface RawMockTournamentData {
  tournament: string;
  updatedAt: string;
  players: RawMockPlayer[];
}

type UnknownRecord = Record<string, unknown>;
const SPORTRADAR_USER_AGENT = "round-table-masters-pickem/1.0";

function toLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function seededHash(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRange(seed: string, min: number, max: number): number {
  const hash = seededHash(seed);
  return min + (hash % (max - min + 1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildMockRounds(name: string): [number, number, number, number] {
  const roundToPar: [number, number, number, number] = [
    seededRange(`${name}:r1`, -3, 3),
    seededRange(`${name}:r2`, -3, 3),
    seededRange(`${name}:r3`, -2, 4),
    seededRange(`${name}:r4`, -3, 3),
  ];

  const totalToPar = roundToPar.reduce((sum, score) => sum + score, 0);
  if (totalToPar < -8) {
    roundToPar[3] += -8 - totalToPar;
  } else if (totalToPar > 6) {
    roundToPar[3] -= totalToPar - 6;
  }

  roundToPar[3] = clamp(roundToPar[3], -3, 3);

  return [
    72 + roundToPar[0],
    72 + roundToPar[1],
    72 + roundToPar[2],
    72 + roundToPar[3],
  ];
}

function buildMockTournamentData(
  picks: ParticipantPickSet[],
  tournamentName = "Masters Tournament",
  seedPrefix = "masters",
): RawMockTournamentData {
  const uniqueNames = [
    ...new Set(picks.flatMap((participant) => participant.golfers.map((golfer) => golfer.trim()))),
  ];

  const players = uniqueNames.map((name, index) => {
    const rounds = buildMockRounds(`${seedPrefix}:${name}`);
    const totalToPar = rounds.reduce((sum, round) => sum + (round - 72), 0);
    const today = rounds[3] - 72;

    return {
      id: `mock-${index + 1}`,
      name,
      position: "",
      totalToPar,
      today,
      thru: "F",
      rounds,
      status: "active" as const,
    };
  });

  const rankedPlayers = [...players]
    .sort((left, right) => left.totalToPar - right.totalToPar)
    .map((player, index) => ({
      ...player,
      position: String(index + 1),
    }));

  return {
    tournament: tournamentName,
    updatedAt: new Date().toISOString(),
    players: rankedPlayers,
  };
}

function normalizePlayer(player: Partial<NormalizedGolfer> & { id: string; name: string }): NormalizedGolfer {
  return {
    id: String(player.id),
    name: player.name,
    position: player.position ?? "",
    totalToPar: typeof player.totalToPar === "number" ? player.totalToPar : null,
    today: typeof player.today === "number" ? player.today : null,
    thru: player.thru ?? "",
    rounds: [
      player.rounds?.[0] ?? null,
      player.rounds?.[1] ?? null,
      player.rounds?.[2] ?? null,
      player.rounds?.[3] ?? null,
    ],
    status: player.status ?? "active",
  };
}

function normalizeTournamentData(data: { tournament?: string; updatedAt?: string; players?: Array<Partial<NormalizedGolfer> & { id: string; name: string }> }): NormalizedTournamentData {
  return {
    tournament: data.tournament ?? "Masters Tournament",
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    players: Array.isArray(data.players) ? data.players.map(normalizePlayer) : [],
  };
}

async function getMockGolfData(options: GolfDataOptions = {}): Promise<NormalizedTournamentData> {
  const picks = options.picks ?? [];
  const tournamentName = options.tournamentName ?? "Masters Tournament";
  const seedPrefix = options.seedPrefix ?? "masters";
  return normalizeTournamentData(buildMockTournamentData(picks, tournamentName, seedPrefix));
}

// Real/live provider placeholder prepared for Sportradar golf data.
// Paste real provider credentials into environment variables, not directly in code:
// - SPORTRADAR_GOLF_API_KEY=your_api_key_here
// - SPORTRADAR_GOLF_TOURNAMENT_ID=your_tournament_id_here
// - SPORTRADAR_GOLF_BASE_URL=https://api.sportradar.com/golf/trial/v2/en
//
// Then replace `mapSportradarResponseToNormalized` with the real response mapping logic.
// Keep the output normalized so the frontend and scoring code never change.
async function getSportradarGolfData(options: GolfDataOptions = {}): Promise<NormalizedTournamentData> {
  const apiKey = process.env.SPORTRADAR_GOLF_API_KEY;
  const tournamentId = options.tournamentId ?? process.env.SPORTRADAR_GOLF_TOURNAMENT_ID;
  const baseUrl = options.baseUrl ?? process.env.SPORTRADAR_GOLF_BASE_URL;

  if (!apiKey || !tournamentId || !baseUrl) {
    throw new Error(
      "Live golf mode is enabled, but SPORTRADAR_GOLF_API_KEY, SPORTRADAR_GOLF_TOURNAMENT_ID, or SPORTRADAR_GOLF_BASE_URL is missing.",
    );
  }

  // Tournament Leaderboard endpoint reference:
  // https://developer.sportradar.com/golf/reference/golf-tournament-leaderboard
  //
  // Expected base URL example:
  // https://api.sportradar.com/golf/trial/pga/v3/en/2026
  const requestUrl = `${baseUrl.replace(/\/$/, "")}/tournaments/${tournamentId}/leaderboard.json`;
  const rawData = await fetchSportradarJson(requestUrl, apiKey);
  return mapSportradarResponseToNormalized(rawData);
}

function fetchSportradarJson(url: string, apiKey: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({
      family: 4,
      keepAlive: false,
      minVersion: "TLSv1.2",
      lookup(hostname, options, callback) {
        return dns.lookup(hostname, { ...options, family: 4, all: false }, callback);
      },
    });

    const request = https.request(
      url,
      {
        method: "GET",
        agent,
        headers: {
          "x-api-key": apiKey,
          accept: "application/json",
          "user-agent": SPORTRADAR_USER_AGENT,
        },
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          const statusCode = response.statusCode ?? 500;

          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`Live provider request failed with status ${statusCode}.`));
            return;
          }

          try {
            resolve(JSON.parse(body) as unknown);
          } catch (error) {
            reject(new Error(`Live provider returned invalid JSON: ${error instanceof Error ? error.message : "Unknown parse error"}`));
          }
        });
      },
    );

    request.on("error", reject);
    request.end();
  });
}

function getRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getRecordValue(record: UnknownRecord | null, keys: string[]): unknown {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
}

function formatPlayerName(player: UnknownRecord): string {
  const explicitName = getString(getRecordValue(player, ["name", "full_name", "display_name"]));
  if (explicitName) {
    return explicitName;
  }

  const firstName = getString(getRecordValue(player, ["first_name", "firstname", "given_name"])) ?? "";
  const lastName = getString(getRecordValue(player, ["last_name", "lastname", "family_name"])) ?? "";
  const combined = `${firstName} ${lastName}`.trim();

  return combined || "Unknown Player";
}

function mapPlayerStatus(rawStatus: unknown): NormalizedGolfer["status"] {
  const status = (getString(rawStatus) ?? "active").toLowerCase();

  if (["wd", "withdrawn"].includes(status)) {
    return "wd";
  }

  if (["cut", "mc"].includes(status)) {
    return "cut";
  }

  return "active";
}

function normalizeThru(rawThru: unknown, rawStatus: unknown): string {
  const thruNumber = getNumber(rawThru);
  const status = (getString(rawStatus) ?? "").toLowerCase();

  if (status === "closed" || status === "complete" || status === "complete_round" || status === "finished") {
    return "F";
  }

  if (thruNumber === 18) {
    return "F";
  }

  if (thruNumber !== null) {
    return String(thruNumber);
  }

  return getString(rawThru) ?? "";
}

function extractRounds(player: UnknownRecord): [number | null, number | null, number | null, number | null] {
  const roundSource = getArray(
    getRecordValue(player, ["rounds", "round", "scorecards", "scores"]),
  );

  const rounds: [number | null, number | null, number | null, number | null] = [null, null, null, null];

  for (const item of roundSource) {
    const round = getRecord(item);
    if (!round) {
      continue;
    }

    const roundNumber = getNumber(getRecordValue(round, ["number", "round", "sequence"]));
    if (roundNumber === null || roundNumber < 1 || roundNumber > 4) {
      continue;
    }

    const strokes =
      getNumber(getRecordValue(round, ["strokes", "score", "total_strokes"])) ??
      getNumber(getRecordValue(getRecord(round.scorecard), ["strokes", "total_strokes"]));
    const thru = getNumber(getRecordValue(round, ["thru", "holes_completed"]));

    if (strokes !== null && (strokes > 0 || (thru !== null && thru > 0))) {
      rounds[roundNumber - 1] = strokes;
    }
  }

  return rounds;
}

function calculateTodayScore(player: UnknownRecord, rounds: [number | null, number | null, number | null, number | null]): number | null {
  const explicitToday = getNumber(getRecordValue(player, ["today", "round_score", "current_round_score"]));
  if (explicitToday !== null) {
    return explicitToday;
  }

  const roundSource = getArray(getRecordValue(player, ["rounds", "round", "scorecards", "scores"]));
  const normalizedRounds = roundSource
    .map((item) => getRecord(item))
    .filter((round): round is UnknownRecord => Boolean(round))
    .sort((left, right) => {
      const leftSequence = getNumber(getRecordValue(left, ["number", "round", "sequence"])) ?? 0;
      const rightSequence = getNumber(getRecordValue(right, ["number", "round", "sequence"])) ?? 0;
      return rightSequence - leftSequence;
    });

  const latestRound = normalizedRounds[0];
  let hasPlaceholderUpcomingRound = false;

  if (latestRound) {
    const latestThru = getNumber(getRecordValue(latestRound, ["thru", "holes_completed"])) ?? 0;
    const latestStrokes = getNumber(getRecordValue(latestRound, ["strokes", "total_strokes"])) ?? 0;
    const latestScore = getNumber(getRecordValue(latestRound, ["score", "score_to_par", "to_par"])) ?? 0;

    // Sportradar often includes a zeroed-out upcoming round placeholder.
    // We should ignore it and keep looking for the latest started round instead of blanking today's score.
    hasPlaceholderUpcomingRound = latestThru === 0 && latestStrokes === 0 && latestScore === 0;
  }

  const currentRound = getNumber(getRecordValue(player, ["current_round", "round"]));
  if (currentRound !== null && currentRound >= 1 && currentRound <= 4) {
    const roundNode = normalizedRounds.find((roundRecord) => {
      return getNumber(getRecordValue(roundRecord, ["number", "round", "sequence"])) === currentRound;
    });

    const scoreToPar =
      getNumber(getRecordValue(roundNode, ["score", "score_to_par", "to_par"])) ??
      getNumber(getRecordValue(getRecord(roundNode?.scorecard), ["score", "score_to_par", "to_par"]));

    if (scoreToPar !== null) {
      return scoreToPar;
    }
  }

  const latestStartedRound = normalizedRounds.find((round) => {
    const thru = getNumber(getRecordValue(round, ["thru", "holes_completed"])) ?? 0;
    const strokes = getNumber(getRecordValue(round, ["strokes", "total_strokes"])) ?? 0;
    const score = getNumber(getRecordValue(round, ["score", "score_to_par", "to_par"])) ?? 0;
    return thru > 0 || strokes > 0 || score !== 0;
  });

  if (latestStartedRound) {
    const latestScore = getNumber(getRecordValue(latestStartedRound, ["score", "score_to_par", "to_par"]));
    if (latestScore !== null) {
      return latestScore;
    }
  }

  if (hasPlaceholderUpcomingRound) {
    return null;
  }

  const lastKnownRound = [...rounds].reverse().find((score) => score !== null);
  return lastKnownRound !== undefined ? 0 : null;
}

function deriveThruFromRounds(player: UnknownRecord): string {
  const roundSource = getArray(getRecordValue(player, ["rounds", "round", "scorecards", "scores"]))
    .map((item) => getRecord(item))
    .filter((round): round is UnknownRecord => Boolean(round))
    .sort((left, right) => {
      const leftSequence = getNumber(getRecordValue(left, ["number", "round", "sequence"])) ?? 0;
      const rightSequence = getNumber(getRecordValue(right, ["number", "round", "sequence"])) ?? 0;
      return rightSequence - leftSequence;
    });

  const latestStartedRound = roundSource.find((round) => {
    const thru = getNumber(getRecordValue(round, ["thru", "holes_completed"])) ?? 0;
    const strokes = getNumber(getRecordValue(round, ["strokes", "total_strokes"])) ?? 0;
    const score = getNumber(getRecordValue(round, ["score", "score_to_par", "to_par"])) ?? 0;
    return thru > 0 || strokes > 0 || score !== 0;
  });

  if (!latestStartedRound) {
    return "";
  }

  const latestStartedSequence = getNumber(
    getRecordValue(latestStartedRound, ["number", "round", "sequence"]),
  ) ?? 0;
  const thru = getNumber(getRecordValue(latestStartedRound, ["thru", "holes_completed"]));
  if (thru === 18) {
    return "F";
  }

  if (thru !== null && thru > 0) {
    return String(thru);
  }

  if (latestStartedSequence >= 1) {
    return "F";
  }

  return "F";
}

function normalizePosition(rawPosition: unknown): string {
  const stringPosition = getString(rawPosition);
  if (stringPosition) {
    return stringPosition;
  }

  const numberPosition = getNumber(rawPosition);
  return numberPosition !== null ? String(numberPosition) : "";
}

function positionSortValue(position: string): number {
  const match = position.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function mapSportradarPlayer(playerNode: unknown): NormalizedGolfer | null {
  const player = getRecord(playerNode);
  if (!player) {
    return null;
  }

  const id = getString(getRecordValue(player, ["id", "player_id"]));
  if (!id) {
    return null;
  }

  const rounds = extractRounds(player);
  const status = mapPlayerStatus(getRecordValue(player, ["status", "result", "state"]));
  const totalToPar =
    getNumber(getRecordValue(player, ["score", "total_to_par", "to_par"])) ??
    getNumber(getRecordValue(getRecord(player.tournament), ["score", "total_to_par", "to_par"]));

  return {
    id,
    name: formatPlayerName(player),
    position: normalizePosition(getRecordValue(player, ["position", "rank", "place"])),
    totalToPar,
    today: calculateTodayScore(player, rounds),
    thru:
      normalizeThru(getRecordValue(player, ["thru", "holes_completed"]), getRecordValue(player, ["status", "result", "state"])) ||
      deriveThruFromRounds(player),
    rounds,
    status,
  };
}

function extractLeaderboardPlayers(data: UnknownRecord): NormalizedGolfer[] {
  const possibleArrays = [
    getRecordValue(data, ["leaderboard"]),
    getRecordValue(data, ["players"]),
    getRecordValue(getRecord(data.tournament), ["leaderboard", "players"]),
  ];

  for (const candidate of possibleArrays) {
    const players = getArray(candidate)
      .map(mapSportradarPlayer)
      .filter((player): player is NormalizedGolfer => Boolean(player));

    if (players.length) {
      return players.sort((a, b) => positionSortValue(a.position) - positionSortValue(b.position));
    }
  }

  return [];
}

function mapSportradarResponseToNormalized(rawData: unknown): NormalizedTournamentData {
  const data = getRecord(rawData);

  if (!data) {
    throw new Error("Sportradar leaderboard response is not an object.");
  }

  const tournamentRecord = getRecord(data.tournament) ?? data;
  const players = extractLeaderboardPlayers(data);

  if (!players.length) {
    throw new Error("Sportradar leaderboard response did not contain any players.");
  }

  return {
    tournament: getString(getRecordValue(tournamentRecord, ["name", "tournament"])) ?? "Masters Tournament",
    updatedAt:
      getString(getRecordValue(data, ["generated_at", "updated_at", "last_updated"])) ??
      getString(getRecordValue(tournamentRecord, ["updated_at", "generated_at"])) ??
      new Date().toISOString(),
    players,
  };
}

function resolveMode(explicitMode?: GolfDataMode): GolfDataMode {
  if (explicitMode) {
    return explicitMode;
  }

  const envMode = process.env.GOLF_DATA_MODE;

  if (envMode === "valero") {
    return "valero";
  }

  if (envMode === "live") {
    return "live";
  }

  return "mock";
}

function resolveLiveProvider(explicitProvider?: LiveProviderName): LiveProviderName {
  if (explicitProvider) {
    return explicitProvider;
  }

  const envProvider = process.env.GOLF_LIVE_PROVIDER;

  if (envProvider === "sportradar") {
    return "sportradar";
  }

  return "sportradar";
}

export async function getGolfData(options: GolfDataOptions = {}): Promise<NormalizedTournamentData> {
  const mode = resolveMode(options.mode);
  const liveProvider = resolveLiveProvider(options.liveProvider);

  switch (mode) {
    case "mock":
      return getMockGolfData(options);
    case "valero":
      return getMockGolfData({
        ...options,
        mode: "valero",
        tournamentName: options.tournamentName ?? "Valero Texas Open",
        seedPrefix: options.seedPrefix ?? "valero",
      });
    case "live":
      switch (liveProvider) {
        case "sportradar":
          return getSportradarGolfData(options);
        default:
          throw new Error(`Unsupported live golf provider: ${liveProvider}`);
      }
    default:
      throw new Error(`Unsupported golf data mode: ${mode}`);
  }
}
