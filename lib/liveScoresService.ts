import { PARTICIPANT_PICKS } from "../data/picks";
import { buildLiveScoresResponse } from "./scoring";
import { getGolfData } from "../providers/golfProvider";
import type { LiveScoresResponse } from "./types";

let lastValidPayload: LiveScoresResponse | null = null;

function getConfiguredMode(): "mock" | "live" {
  return process.env.GOLF_DATA_MODE === "live" ? "live" : "mock";
}

export async function getLiveScoresPayload(): Promise<LiveScoresResponse> {
  const mode = getConfiguredMode();

  if (mode === "mock") {
    const mockData = await getGolfData({ mode: "mock" });
    const payload = buildLiveScoresResponse(mockData, PARTICIPANT_PICKS);
    lastValidPayload = payload;
    return payload;
  }

  try {
    const liveData = await getGolfData({ mode: "live" });
    const payload = buildLiveScoresResponse(liveData, PARTICIPANT_PICKS);
    lastValidPayload = payload;
    return payload;
  } catch (error) {
    console.warn("[liveScoresService] Live golf provider failed. Falling back.", error);

    if (lastValidPayload) {
      return lastValidPayload;
    }

    const mockData = await getGolfData({ mode: "mock" });
    const payload = buildLiveScoresResponse(mockData, PARTICIPANT_PICKS);
    lastValidPayload = payload;
    return payload;
  }
}
