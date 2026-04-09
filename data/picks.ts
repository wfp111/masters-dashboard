import type { ParticipantPickSet } from "../lib/types";

const PICK_SLOT_COUNT = 6;

const RAW_PARTICIPANT_PICKS: ParticipantPickSet[] = [
  {
    name: "Dom",
    golfers: [
      "Scottie Scheffler",
      "Cameron Young",
      "Jake Knapp",
      "Corey Conners",
      "Sam Stevens",
      "Matt McCarty",
    ],
  },
  {
    name: "Kyle",
    golfers: [
      "Scottie Scheffler",
      "Cameron Young",
      "Nicolai Hojgaard",
      "Akshay Bhatia",
      "Wyndham Clark",
      "Zach Johnson",
    ],
  },
  {
    name: "Matt",
    golfers: [
      "Scottie Scheffler",
      "Collin Morikawa",
      "Sam Burns",
      "Si Woo Kim",
      "Ben Griffin",
      "Bubba Watson",
    ],
  },
  {
    name: "Will",
    golfers: [
      "Scottie Scheffler",
      "Ludvig Aberg",
      "Tyrrell Hatton",
      "Adam Scott",
      "Max Homa",
      "Michael Brennan",
    ],
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
    throw new Error(`Participant picks validation failed:\n- ${errors.join("\n- ")}`);
  }

  return picks;
}

export const PARTICIPANT_PICKS: ParticipantPickSet[] = validateParticipantPicks(RAW_PARTICIPANT_PICKS);
