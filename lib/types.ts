export type RoundScore = number | null;

export type GolferStatus = "active" | "wd" | "cut" | "missing";

export interface NormalizedGolfer {
  id: string;
  name: string;
  position: string;
  totalToPar: number | null;
  today: number | null;
  thru: string;
  rounds: [RoundScore, RoundScore, RoundScore, RoundScore];
  status: GolferStatus;
}

export interface NormalizedTournamentData {
  tournament: string;
  updatedAt: string;
  players: NormalizedGolfer[];
}

export interface ParticipantPickSet {
  name: string;
  golfers: string[];
}

export interface PreviousStanding {
  name: string;
  rank: number;
}

export interface LeaderResponseItem {
  name: string;
  bestFourTotal: number | null;
  today: number | null;
  movement: number;
}

export interface StandingResponseItem extends LeaderResponseItem {
  rank: number;
}

export interface RosterGolferResponseItem {
  name: string;
  totalToPar: number | null;
  today: number | null;
  rounds: [RoundScore, RoundScore, RoundScore, RoundScore];
  status: GolferStatus;
  countingTowardBestFour: boolean;
}

export interface RosterResponseItem {
  name: string;
  golfers: RosterGolferResponseItem[];
}

export interface GraphPoint {
  label: string;
  value: number | null;
}

export interface GraphSeriesItem {
  name: string;
  points: GraphPoint[];
}

export interface LiveScoresResponse {
  tournament: string;
  updatedAt: string;
  leaders: LeaderResponseItem[];
  standings: StandingResponseItem[];
  rosters: RosterResponseItem[];
  graphSeries: GraphSeriesItem[];
}
