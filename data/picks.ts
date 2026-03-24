import type { ParticipantPickSet } from "../lib/types";

const PICK_SLOT_COUNT = 6;

// Pre-tournament setup:
// Replace each placeholder string below with the real golfer name once picks are finalized.
// Keep exactly 6 golfer slots per participant.
const RAW_PARTICIPANT_PICKS: ParticipantPickSet[] = [
  {
    name: "Chris",
    golfers: [
      "Chris Golfer 1",
      "Chris Golfer 2",
      "Chris Golfer 3",
      "Chris Golfer 4",
      "Chris Golfer 5",
      "Chris Golfer 6",
    ],
  },
  {
    name: "Christian",
    golfers: [
      "Christian Golfer 1",
      "Christian Golfer 2",
      "Christian Golfer 3",
      "Christian Golfer 4",
      "Christian Golfer 5",
      "Christian Golfer 6",
    ],
  },
  {
    name: "Dom",
    golfers: [
      "Dom Golfer 1",
      "Dom Golfer 2",
      "Dom Golfer 3",
      "Dom Golfer 4",
      "Dom Golfer 5",
      "Dom Golfer 6",
    ],
  },
  {
    name: "Drew",
    golfers: [
      "Drew Golfer 1",
      "Drew Golfer 2",
      "Drew Golfer 3",
      "Drew Golfer 4",
      "Drew Golfer 5",
      "Drew Golfer 6",
    ],
  },
  {
    name: "Jeff",
    golfers: [
      "Jeff Golfer 1",
      "Jeff Golfer 2",
      "Jeff Golfer 3",
      "Jeff Golfer 4",
      "Jeff Golfer 5",
      "Jeff Golfer 6",
    ],
  },
  {
    name: "Kyle",
    golfers: [
      "Kyle Golfer 1",
      "Kyle Golfer 2",
      "Kyle Golfer 3",
      "Kyle Golfer 4",
      "Kyle Golfer 5",
      "Kyle Golfer 6",
    ],
  },
  {
    name: "Matt",
    golfers: [
      "Matt Golfer 1",
      "Matt Golfer 2",
      "Matt Golfer 3",
      "Matt Golfer 4",
      "Matt Golfer 5",
      "Matt Golfer 6",
    ],
  },
  {
    name: "Mike",
    golfers: [
      "Mike Golfer 1",
      "Mike Golfer 2",
      "Mike Golfer 3",
      "Mike Golfer 4",
      "Mike Golfer 5",
      "Mike Golfer 6",
    ],
  },
  {
    name: "Nick",
    golfers: [
      "Nick Golfer 1",
      "Nick Golfer 2",
      "Nick Golfer 3",
      "Nick Golfer 4",
      "Nick Golfer 5",
      "Nick Golfer 6",
    ],
  },
  {
    name: "Reed",
    golfers: [
      "Reed Golfer 1",
      "Reed Golfer 2",
      "Reed Golfer 3",
      "Reed Golfer 4",
      "Reed Golfer 5",
      "Reed Golfer 6",
    ],
  },
  {
    name: "Will",
    golfers: [
      "Will Golfer 1",
      "Will Golfer 2",
      "Will Golfer 3",
      "Will Golfer 4",
      "Will Golfer 5",
      "Will Golfer 6",
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
