import type { Handler } from "@netlify/functions";
import { getLiveScoresPayload } from "../../lib/liveScoresService";

export const handler: Handler = async () => {
  try {
    const payload = await getLiveScoresPayload();

    return {
      statusCode: 200,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        error: "Unable to load live scores",
        message,
      }),
    };
  }
};
