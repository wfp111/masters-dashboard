import type { ParticipantPickSet } from "../lib/types";

const PICK_SLOT_COUNT = 6;

// Valero Texas Open practice setup:
// Replace these lineups if you want to test a different Valero pool while keeping
// the Masters picks separate in data/picks.ts.
const RAW_VALERO_PARTICIPANT_PICKS: ParticipantPickSet[] = [
  {
    name: "Chris",
    golfers: ["Tommy Fleetwood", "Hideki Matsuyama", "Maverick McNealy", "Sepp Straka", "Tony Finau", "Alex Noren"],
  },
  {
    name: "Christian",
    golfers: ["Ludvig Aberg", "Collin Morikawa", "Rickie Fowler", "Si Woo Kim", "Brian Harman", "Keith Mitchell"],
  },
  {
    name: "Dom",
    golfers: ["Russell Henley", "Jordan Spieth", "Robert MacIntyre", "J.J. Spaun", "Daniel Berger", "Gary Woodland"],
  },
  {
    name: "Drew",
    golfers: ["Tommy Fleetwood", "Collin Morikawa", "Maverick McNealy", "Rickie Fowler", "Brian Harman", "Tony Finau"],
  },
  {
    name: "Jeff",
    golfers: ["Ludvig Aberg", "Hideki Matsuyama", "Sepp Straka", "Si Woo Kim", "Alex Noren", "Keith Mitchell"],
  },
  {
    name: "Kyle",
    golfers: ["Russell Henley", "Jordan Spieth", "Robert MacIntyre", "Maverick McNealy", "Daniel Berger", "Tony Finau"],
  },
  {
    name: "Matt",
    golfers: ["Tommy Fleetwood", "Hideki Matsuyama", "J.J. Spaun", "Rickie Fowler", "Gary Woodland", "Keith Mitchell"],
  },
  {
    name: "Mike",
    golfers: ["Collin Morikawa", "Russell Henley", "Sepp Straka", "Maverick McNealy", "Alex Noren", "Brian Harman"],
  },
  {
    name: "Nick",
    golfers: ["Ludvig Aberg", "Jordan Spieth", "Si Woo Kim", "Robert MacIntyre", "Daniel Berger", "Gary Woodland"],
  },
  {
    name: "Reed",
    golfers: ["Tommy Fleetwood", "Collin Morikawa", "Rickie Fowler", "J.J. Spaun", "Tony Finau", "Keith Mitchell"],
  },
  {
    name: "Will",
    golfers: ["Ludvig Aberg", "Hideki Matsuyama", "Sepp Straka", "Si Woo Kim", "Alex Noren", "Brian Harman"],
  },
];

function normalizePickName(value: string): string {
  return value.trim().toLowerCase();
}

function validateParticipantPicks(picks: ParticipantPickSet[]): ParticipantPickSet[] {
  const errors: string[] = [];

  for (const participant of picks) {
    if (participant.golfers.length !== PICK_SLOT_COUNT) {
      errors.push(`${participant.name} has ${participant.golfers.length} golfers. Expected ${PICK_SLOT_COUNT}.`);
    }

    const cleanedGolfers = participant.golfers
      .map((golfer) => golfer.trim())
      .filter((golfer) => golfer.length > 0);

    if (cleanedGolfers.length !== PICK_SLOT_COUNT) {
      errors.push(`${participant.name} has empty golfer slots. Fill all ${PICK_SLOT_COUNT} slots.`);
    }

    const duplicateGolfers = cleanedGolfers.filter((golfer, index) => {
      const normalized = normalizePickName(golfer);
      return cleanedGolfers.findIndex((entry) => normalizePickName(entry) === normalized) !== index;
    });

    if (duplicateGolfers.length > 0) {
      errors.push(`${participant.name} has duplicate golfers: ${[...new Set(duplicateGolfers)].join(", ")}.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Valero participant picks validation failed:\n- ${errors.join("\n- ")}`);
  }

  return picks;
}

export const VALERO_PARTICIPANT_PICKS: ParticipantPickSet[] = validateParticipantPicks(RAW_VALERO_PARTICIPANT_PICKS);
