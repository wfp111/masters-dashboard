import type { NormalizedGolfer, NormalizedTournamentData } from "../lib/types";

export type GolfDataMode = "mock" | "live";
export type LiveProviderName = "sportradar";

interface GolfDataOptions {
  mode?: GolfDataMode;
  liveProvider?: LiveProviderName;
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

// Mock data lets the site work immediately before a real provider is wired up.
const MOCK_DATA: RawMockTournamentData = {
  tournament: "Masters Tournament",
  updatedAt: "2026-04-12T19:15:00.000Z",
  players: [
    { id: "p1", name: "Scottie Scheffler", position: "1", totalToPar: -8, today: -1, thru: "F", rounds: [69, 70, 70, 71], status: "active" },
    { id: "p2", name: "Rory McIlroy", position: "T2", totalToPar: -6, today: -2, thru: "15", rounds: [71, 70, 71, null], status: "active" },
    { id: "p3", name: "Hideki Matsuyama", position: "T4", totalToPar: -5, today: -2, thru: "F", rounds: [70, 72, 71, 70], status: "active" },
    { id: "p4", name: "Patrick Cantlay", position: "T10", totalToPar: -3, today: -1, thru: "16", rounds: [71, 71, 72, null], status: "active" },
    { id: "p5", name: "Sahith Theegala", position: "T6", totalToPar: -4, today: -1, thru: "F", rounds: [72, 70, 71, 71], status: "active" },
    { id: "p6", name: "Min Woo Lee", position: "T24", totalToPar: 1, today: 0, thru: "14", rounds: [73, 72, 72, null], status: "active" },
    { id: "p7", name: "Jon Rahm", position: "T2", totalToPar: -6, today: -2, thru: "F", rounds: [70, 71, 71, 70], status: "active" },
    { id: "p8", name: "Xander Schauffele", position: "T6", totalToPar: -4, today: -2, thru: "F", rounds: [71, 71, 72, 70], status: "active" },
    { id: "p9", name: "Tommy Fleetwood", position: "T6", totalToPar: -4, today: -1, thru: "17", rounds: [71, 71, 71, null], status: "active" },
    { id: "p10", name: "Viktor Hovland", position: "T10", totalToPar: -3, today: -1, thru: "16", rounds: [72, 70, 72, null], status: "active" },
    { id: "p11", name: "Cameron Young", position: "T18", totalToPar: -1, today: 0, thru: "13", rounds: [71, 72, 72, null], status: "active" },
    { id: "p12", name: "Sepp Straka", position: "T28", totalToPar: 2, today: 0, thru: "14", rounds: [73, 72, 73, null], status: "active" },
    { id: "p13", name: "Collin Morikawa", position: "T4", totalToPar: -5, today: -1, thru: "F", rounds: [71, 70, 71, 71], status: "active" },
    { id: "p14", name: "Ludvig Aberg", position: "T6", totalToPar: -4, today: -2, thru: "F", rounds: [71, 70, 73, 70], status: "active" },
    { id: "p15", name: "Justin Thomas", position: "T10", totalToPar: -3, today: -1, thru: "15", rounds: [71, 71, 72, null], status: "active" },
    { id: "p16", name: "Tony Finau", position: "T18", totalToPar: -1, today: 0, thru: "13", rounds: [72, 71, 72, null], status: "active" },
    { id: "p17", name: "Akshay Bhatia", position: "T14", totalToPar: -2, today: 0, thru: "14", rounds: [71, 72, 71, null], status: "active" },
    { id: "p18", name: "Jason Day", position: "T24", totalToPar: 1, today: 0, thru: "12", rounds: [73, 72, 72, null], status: "active" },
    { id: "p19", name: "Brooks Koepka", position: "T10", totalToPar: -3, today: -1, thru: "16", rounds: [71, 71, 72, null], status: "active" },
    { id: "p20", name: "Wyndham Clark", position: "T18", totalToPar: -1, today: -1, thru: "F", rounds: [72, 72, 72, 71], status: "active" },
    { id: "p21", name: "Matt Fitzpatrick", position: "T14", totalToPar: -2, today: -1, thru: "F", rounds: [71, 72, 72, 71], status: "active" },
    { id: "p22", name: "Sungjae Im", position: "T14", totalToPar: -2, today: -1, thru: "17", rounds: [71, 72, 72, null], status: "active" },
    { id: "p23", name: "Russell Henley", position: "T18", totalToPar: -1, today: -1, thru: "F", rounds: [72, 71, 73, 71], status: "active" },
    { id: "p24", name: "Tom Kim", position: "T22", totalToPar: 0, today: 0, thru: "15", rounds: [72, 72, 72, null], status: "active" },
    { id: "p25", name: "Jordan Spieth", position: "T14", totalToPar: -2, today: -1, thru: "18", rounds: [71, 72, 72, 71], status: "active" },
    { id: "p26", name: "Patrick Reed", position: "T18", totalToPar: -1, today: -1, thru: "18", rounds: [72, 71, 74, 71], status: "active" },
    { id: "p27", name: "Shane Lowry", position: "T18", totalToPar: -1, today: -1, thru: "16", rounds: [72, 71, 74, null], status: "active" },
    { id: "p28", name: "Corey Conners", position: "T22", totalToPar: 0, today: 0, thru: "14", rounds: [72, 72, 72, null], status: "active" },
    { id: "p29", name: "Denny McCarthy", position: "T30", totalToPar: 2, today: 0, thru: "12", rounds: [73, 72, 73, null], status: "active" },
    { id: "p30", name: "Harris English", position: "T34", totalToPar: 3, today: 0, thru: "13", rounds: [73, 73, 73, null], status: "active" },
    { id: "p31", name: "Sam Burns", position: "T22", totalToPar: 0, today: -1, thru: "18", rounds: [72, 72, 73, 71], status: "active" },
    { id: "p32", name: "Max Homa", position: "T14", totalToPar: -2, today: -1, thru: "18", rounds: [71, 72, 73, 70], status: "active" },
    { id: "p33", name: "Cameron Smith", position: "T28", totalToPar: 2, today: 0, thru: "14", rounds: [73, 72, 73, null], status: "active" },
    { id: "p34", name: "Keegan Bradley", position: "T30", totalToPar: 2, today: 0, thru: "13", rounds: [73, 73, 72, null], status: "active" },
    { id: "p35", name: "Brian Harman", position: "T24", totalToPar: 1, today: 0, thru: "15", rounds: [72, 73, 72, null], status: "active" },
    { id: "p36", name: "Adam Scott", position: "T30", totalToPar: 2, today: 1, thru: "16", rounds: [72, 73, 72, null], status: "active" },
  ],
};

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

async function getMockGolfData(): Promise<NormalizedTournamentData> {
  return normalizeTournamentData(MOCK_DATA);
}

// Real/live provider placeholder prepared for Sportradar golf data.
// Paste real provider credentials into environment variables, not directly in code:
// - SPORTRADAR_GOLF_API_KEY=your_api_key_here
// - SPORTRADAR_GOLF_TOURNAMENT_ID=your_tournament_id_here
// - SPORTRADAR_GOLF_BASE_URL=https://api.sportradar.com/golf/trial/v2/en
//
// Then replace `mapSportradarResponseToNormalized` with the real response mapping logic.
// Keep the output normalized so the frontend and scoring code never change.
async function getSportradarGolfData(): Promise<NormalizedTournamentData> {
  const apiKey = process.env.SPORTRADAR_GOLF_API_KEY;
  const tournamentId = process.env.SPORTRADAR_GOLF_TOURNAMENT_ID;
  const baseUrl = process.env.SPORTRADAR_GOLF_BASE_URL;

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
  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/tournaments/${tournamentId}/leaderboard.json?api_key=${encodeURIComponent(apiKey)}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Live provider request failed with status ${response.status}.`);
  }

  const rawData = (await response.json()) as unknown;
  return mapSportradarResponseToNormalized(rawData);
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

    rounds[roundNumber - 1] = strokes;
  }

  return rounds;
}

function calculateTodayScore(player: UnknownRecord, rounds: [number | null, number | null, number | null, number | null]): number | null {
  const explicitToday = getNumber(getRecordValue(player, ["today", "round_score", "current_round_score"]));
  if (explicitToday !== null) {
    return explicitToday;
  }

  const currentRound = getNumber(getRecordValue(player, ["current_round", "round"]));
  if (currentRound !== null && currentRound >= 1 && currentRound <= 4) {
    const roundNode = getArray(getRecordValue(player, ["rounds", "round", "scorecards", "scores"])).find((item) => {
      const roundRecord = getRecord(item);
      return getNumber(getRecordValue(roundRecord, ["number", "round", "sequence"])) === currentRound;
    });

    const roundRecord = getRecord(roundNode);
    const scoreToPar =
      getNumber(getRecordValue(roundRecord, ["score", "score_to_par", "to_par"])) ??
      getNumber(getRecordValue(getRecord(roundRecord?.scorecard), ["score", "score_to_par", "to_par"]));

    if (scoreToPar !== null) {
      return scoreToPar;
    }
  }

  const lastKnownRound = [...rounds].reverse().find((score) => score !== null);
  return lastKnownRound !== undefined ? null : null;
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
    thru: normalizeThru(getRecordValue(player, ["thru", "holes_completed"]), getRecordValue(player, ["status", "result", "state"])),
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
      return getMockGolfData();
    case "live":
      switch (liveProvider) {
        case "sportradar":
          return getSportradarGolfData();
        default:
          throw new Error(`Unsupported live golf provider: ${liveProvider}`);
      }
    default:
      throw new Error(`Unsupported golf data mode: ${mode}`);
  }
}
