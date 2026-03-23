import type { IncomingMessage, ServerResponse } from "http";
import { getLiveScoresPayload } from "../lib/liveScoresService";

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse & { status: (code: number) => any; json: (body: unknown) => void; setHeader: (name: string, value: string | string[]) => void }) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await getLiveScoresPayload();

    // Vercel edge/cache hint: serve a fresh result for 5 minutes, then revalidate.
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=59");
    return res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return res.status(500).json({
      error: "Unable to load live scores",
      message,
    });
  }
}
