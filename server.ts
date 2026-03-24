import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getLiveScoresPayload } from "./lib/liveScoresService";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env.local") });

const publicDir = path.join(__dirname, "public");
const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.static(publicDir));

app.get("/api/live-scores", async (_req, res) => {
  try {
    const payload = await getLiveScoresPayload();
    res.setHeader("Cache-Control", "no-store");
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: "Unable to load live scores",
      message,
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Round Table Masters Pick'em 2026 running at http://localhost:${port}`);
});
