import type { NormalizedGolfer, NormalizedTournamentData } from "../lib/types";

type ProviderName = "mock" | "espn";

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

// This is the seam for wiring in a real provider later.
// Keep the output normalized so the frontend and scoring code never change.
async function getEspnGolfData(): Promise<NormalizedTournamentData> {
  throw new Error("Real provider not connected yet. Set GOLF_DATA_PROVIDER=mock or implement getEspnGolfData.");
}

export async function getGolfData(providerName: ProviderName = (process.env.GOLF_DATA_PROVIDER as ProviderName) || "mock"): Promise<NormalizedTournamentData> {
  switch (providerName) {
    case "mock":
      return getMockGolfData();
    case "espn":
      return getEspnGolfData();
    default:
      throw new Error(`Unsupported golf provider: ${providerName}`);
  }
}
