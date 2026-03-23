import type { PreviousStanding } from "../lib/types";

// This is the comparison snapshot used to calculate movement.
// Replace this with the prior saved standings if you later persist snapshots in a database or KV store.
export const PREVIOUS_STANDINGS: PreviousStanding[] = [
  { name: "Matt", rank: 1 },
  { name: "Chris", rank: 2 },
  { name: "Christian", rank: 3 },
  { name: "Will", rank: 4 },
  { name: "Dom", rank: 5 },
  { name: "Jeff", rank: 6 },
  { name: "Drew", rank: 7 },
  { name: "Mike", rank: 8 },
  { name: "Kyle", rank: 9 },
  { name: "Nick", rank: 10 },
  { name: "Reed", rank: 11 },
];
