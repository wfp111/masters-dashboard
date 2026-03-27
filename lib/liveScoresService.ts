import { PARTICIPANT_PICKS } from "../data/picks";
import { buildLiveScoresResponse } from "./scoring";
import { getGolfData } from "../providers/golfProvider";
import type { LiveScoresResponse } from "./types";
import path from "path";
import { fileURLToPath } from "url";

let lastValidPayload: LiveScoresResponse | null = null;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const runtimePicksPath = path.resolve(__dirname, "../data/picks.ts");

function getConfiguredMode(): "mock" | "live" {
  return process.env.GOLF_DATA_MODE === "live" ? "live" : "mock";
}

export async function getLiveScoresPayload(): Promise<LiveScoresResponse> {
  const mode = getConfiguredMode();
  const firstParticipant = PARTICIPANT_PICKS[0];

  console.log(`[liveScoresService] active project root=${path.resolve(__dirname, "..")}`);
  console.log(`[liveScoresService] runtime picks import path=${runtimePicksPath}`);
  console.log(
    `[liveScoresService] first participant=${firstParticipant?.name ?? "n/a"} golfers=${JSON.stringify(firstParticipant?.golfers ?? [])}`,
  );

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
