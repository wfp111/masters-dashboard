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
  const firstParticipant = PARTICIPANT_PICKS[0];

  console.log(
    `[liveScoresService] mode=${mode} first participant=${firstParticipant?.name ?? "n/a"} golfers=${JSON.stringify(firstParticipant?.golfers ?? [])}`,
  );

  if (mode === "mock") {
    const mockData = await getGolfData({ mode: "mock" });
    const payload = buildLiveScoresResponse(mockData, PARTICIPANT_PICKS);
    console.log(
      `[liveScoresService] mock payload built standings=${payload.standings.length} rosters=${payload.rosters.length} graphSeries=${payload.graphSeries.length}`,
    );
    lastValidPayload = payload;
    return payload;
  }

  try {
    const liveData = await getGolfData({ mode: "live" });
    const payload = buildLiveScoresResponse(liveData, PARTICIPANT_PICKS);
    console.log(
      `[liveScoresService] live payload built standings=${payload.standings.length} rosters=${payload.rosters.length} graphSeries=${payload.graphSeries.length}`,
    );
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
