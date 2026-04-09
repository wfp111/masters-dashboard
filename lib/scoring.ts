import { PREVIOUS_STANDINGS } from "../data/previousStandings";
import type {
  GraphSeriesItem,
  LiveScoresResponse,
  NormalizedGolfer,
  NormalizedTournamentData,
  ParticipantPickSet,
  RosterGolferResponseItem,
} from "./types";

const MASTERS_PAR = 72;
const WEEKEND_PENALTY_TO_PAR = 10;
const WEEKEND_ROUND_INDEXES = [2, 3] as const;

interface ScoredParticipant {
  name: string;
  rank: number;
  bestFourTotal: number | null;
  today: number | null;
  movement: number;
  golfers: RosterGolferResponseItem[];
  graphPoints: GraphSeriesItem["points"];
}

const PLAYER_NAME_ALIASES: Record<string, string> = {
  "matthew mccarty": "matt mccarty",
};

function toLookupKey(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return PLAYER_NAME_ALIASES[normalized] ?? normalized;
}

function compareScoresAscending(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function sumNumbers(values: Array<number | null>): number | null {
  const filtered = values.filter((value): value is number => typeof value === "number");
  if (filtered.length === 0) {
    return null;
  }

  return filtered.reduce((total, value) => total + value, 0);
}

function sumRoundToPar(rounds: [number | null, number | null, number | null, number | null]): number | null {
  const roundToParValues = rounds.map((roundScore) => (roundScore === null ? null : roundScore - MASTERS_PAR));
  return sumNumbers(roundToParValues);
}

function applyWeekendPenalty(livePlayer: NormalizedGolfer, latestStartedRoundIndex: number) {
  const adjustedRounds: [number | null, number | null, number | null, number | null] = [...livePlayer.rounds] as [number | null, number | null, number | null, number | null];
  const penalizedRounds = new Set<number>();
  const penaltyEligible = livePlayer.status === "wd" || livePlayer.status === "cut";

  if (penaltyEligible) {
    for (const roundIndex of WEEKEND_ROUND_INDEXES) {
      if (latestStartedRoundIndex >= roundIndex && adjustedRounds[roundIndex] === null) {
        adjustedRounds[roundIndex] = MASTERS_PAR + WEEKEND_PENALTY_TO_PAR;
        penalizedRounds.add(roundIndex);
      }
    }
  }

  const baseTotal = typeof livePlayer.totalToPar === "number" ? livePlayer.totalToPar : sumRoundToPar(adjustedRounds);
  const adjustedTotalToPar = baseTotal === null ? null : baseTotal + penalizedRounds.size * WEEKEND_PENALTY_TO_PAR;

  let adjustedToday = livePlayer.today;
  if (penalizedRounds.has(latestStartedRoundIndex)) {
    adjustedToday = WEEKEND_PENALTY_TO_PAR;
  }

  return {
    adjustedRounds,
    adjustedTotalToPar,
    adjustedToday,
  };
}

function buildRosterGolfer(pickName: string, latestStartedRoundIndex: number, livePlayer?: NormalizedGolfer): RosterGolferResponseItem {
  if (!livePlayer) {
    return {
      name: pickName,
      totalToPar: null,
      today: null,
      thru: "",
      rounds: [null, null, null, null],
      status: "missing",
      countingTowardBestFour: false,
    };
  }

  const { adjustedRounds, adjustedTotalToPar, adjustedToday } = applyWeekendPenalty(livePlayer, latestStartedRoundIndex);

  return {
    name: livePlayer.name,
    totalToPar: adjustedTotalToPar,
    today: adjustedToday,
    thru: livePlayer.thru,
    rounds: adjustedRounds,
    status: livePlayer.status,
    countingTowardBestFour: false,
  };
}

function getEligibleGolfers(golfers: RosterGolferResponseItem[]): RosterGolferResponseItem[] {
  return golfers
    .filter((golfer) => golfer.totalToPar !== null)
    .sort((left, right) => compareScoresAscending(left.totalToPar, right.totalToPar));
}

function calculateGraphPoints(golfers: RosterGolferResponseItem[]): GraphSeriesItem["points"] {
  const points: GraphSeriesItem["points"] = [{ label: "Start", value: 0 }];

  for (let roundIndex = 0; roundIndex < 4; roundIndex += 1) {
    const roundCandidates = golfers
      .map((golfer) => {
        if (golfer.rounds[roundIndex] === null) {
          return null;
        }

        const cumulativeToPar = golfer.rounds
          .slice(0, roundIndex + 1)
          .reduce<number | null>((total, roundScore) => {
            if (roundScore === null) {
              return total;
            }

            return (total ?? 0) + (roundScore - MASTERS_PAR);
          }, null);

        if (cumulativeToPar === null) {
          return null;
        }

        return {
          name: golfer.name,
          score: cumulativeToPar,
        };
      })
      .filter((entry): entry is { name: string; score: number } => entry !== null)
      .sort((left, right) => left.score - right.score)
      .slice(0, 4);

    points.push({
      label: `Round ${roundIndex + 1}`,
      value: roundCandidates.length > 0 ? roundCandidates.reduce((total, golfer) => total + golfer.score, 0) : null,
    });
  }

  return points;
}

function getLatestStartedRoundIndex(liveData: NormalizedTournamentData): number {
  let latestStartedRoundIndex = -1;

  for (const player of liveData.players) {
    for (let roundIndex = 0; roundIndex < player.rounds.length; roundIndex += 1) {
      if (player.rounds[roundIndex] !== null) {
        latestStartedRoundIndex = Math.max(latestStartedRoundIndex, roundIndex);
      }
    }
  }

  return latestStartedRoundIndex;
}

function buildScoredParticipant(
  participant: ParticipantPickSet,
  golferLookup: Map<string, NormalizedGolfer>,
  latestStartedRoundIndex: number,
): Omit<ScoredParticipant, "rank" | "movement"> {
  const golfers = participant.golfers.map((pickName) => buildRosterGolfer(pickName, latestStartedRoundIndex, golferLookup.get(toLookupKey(pickName))));
  const bestFour = getEligibleGolfers(golfers).slice(0, 4);
  const bestFourKeys = new Set(bestFour.map((golfer) => toLookupKey(golfer.name)));

  for (const golfer of golfers) {
    golfer.countingTowardBestFour = bestFourKeys.has(toLookupKey(golfer.name));
  }

  return {
    name: participant.name,
    bestFourTotal: sumNumbers(bestFour.map((golfer) => golfer.totalToPar)),
    today: sumNumbers(bestFour.map((golfer) => golfer.today)),
    golfers,
    graphPoints: calculateGraphPoints(golfers),
  };
}

function rankParticipants(participants: Array<Omit<ScoredParticipant, "rank" | "movement">>): ScoredParticipant[] {
  const previousRankMap = new Map(PREVIOUS_STANDINGS.map((entry) => [toLookupKey(entry.name), entry.rank]));

  const sorted = [...participants].sort((left, right) => {
    const byScore = compareScoresAscending(left.bestFourTotal, right.bestFourTotal);
    if (byScore !== 0) {
      return byScore;
    }

    return left.name.localeCompare(right.name);
  });

  return sorted.map((participant, index) => {
    const rank = index + 1;
    const previousRank = previousRankMap.get(toLookupKey(participant.name));
    const movement = previousRank ? previousRank - rank : 0;

    return {
      ...participant,
      rank,
      movement,
    };
  });
}

export function buildLiveScoresResponse(
  liveData: NormalizedTournamentData,
  participantPicks: ParticipantPickSet[],
): LiveScoresResponse {
  const golferLookup = new Map(liveData.players.map((player) => [toLookupKey(player.name), player]));
  const latestStartedRoundIndex = getLatestStartedRoundIndex(liveData);
  const rankedParticipants = rankParticipants(
    participantPicks.map((participant) => buildScoredParticipant(participant, golferLookup, latestStartedRoundIndex)),
  );

  return {
    tournament: liveData.tournament,
    updatedAt: liveData.updatedAt,
    leaders: rankedParticipants.slice(0, 3).map((participant) => ({
      name: participant.name,
      bestFourTotal: participant.bestFourTotal,
      today: participant.today,
      movement: participant.movement,
    })),
    standings: rankedParticipants.map((participant) => ({
      name: participant.name,
      bestFourTotal: participant.bestFourTotal,
      today: participant.today,
      movement: participant.movement,
      rank: participant.rank,
    })),
    rosters: rankedParticipants.map((participant) => ({
      name: participant.name,
      golfers: participant.golfers,
    })),
    graphSeries: rankedParticipants.map((participant) => ({
      name: participant.name,
      points:
        latestStartedRoundIndex >= 0
          ? participant.graphPoints.slice(0, latestStartedRoundIndex + 2)
          : participant.graphPoints.slice(0, 1),
    })),
  };
}
