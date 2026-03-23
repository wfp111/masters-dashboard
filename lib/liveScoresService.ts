import { PARTICIPANT_PICKS } from "../data/picks";
import { buildLiveScoresResponse } from "./scoring";
import { getGolfData } from "../providers/golfProvider";
import type { LiveScoresResponse } from "./types";

export async function getLiveScoresPayload(): Promise<LiveScoresResponse> {
  const liveData = await getGolfData();
  return buildLiveScoresResponse(liveData, PARTICIPANT_PICKS);
}
