import type { LiveScoresResponse } from "./types";

const WIKIPEDIA_SUMMARY_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary";
const WIKIPEDIA_SEARCH_BASE = "https://en.wikipedia.org/w/api.php?action=opensearch&limit=1&namespace=0&format=json&origin=*";

const GOLFER_WIKIPEDIA_TITLES: Record<string, string> = {
  "tommy fleetwood": "Tommy Fleetwood",
  "hideki matsuyama": "Hideki Matsuyama",
  "maverick mcnealy": "Maverick McNealy",
  "sepp straka": "Sepp Straka",
  "tony finau": "Tony Finau",
  "alex noren": "Alex Noren",
  "ludvig aberg": "Ludvig �berg",
  "ludvig �berg": "Ludvig �berg",
  "collin morikawa": "Collin Morikawa",
  "rickie fowler": "Rickie Fowler",
  "si woo kim": "Kim Si-woo",
  "brian harman": "Brian Harman",
  "keith mitchell": "Keith Mitchell (golfer)",
  "russell henley": "Russell Henley",
  "jordan spieth": "Jordan Spieth",
  "robert macintyre": "Robert MacIntyre",
  "j.j. spaun": "J. J. Spaun",
  "daniel berger": "Daniel Berger",
  "gary woodland": "Gary Woodland",
  "scottie scheffler": "Scottie Scheffler",
  "rory mcilroy": "Rory McIlroy",
  "jon rahm": "Jon Rahm",
  "xander schauffele": "Xander Schauffele",
  "viktor hovland": "Viktor Hovland",
  "brooks koepka": "Brooks Koepka",
  "justin thomas": "Justin Thomas",
  "patrick cantlay": "Patrick Cantlay",
  "shane lowry": "Shane Lowry",
  "cameron smith": "Cameron Smith",
  "max homa": "Max Homa",
  "adam scott": "Adam Scott",
  "tom kim": "Tom Kim"
};

const headshotCache = new Map<string, string | null>();

function toLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function getWikipediaTitle(name: string): string {
  return GOLFER_WIKIPEDIA_TITLES[toLookupKey(name)] ?? name;
}

async function fetchHeadshotUrl(name: string): Promise<string | null> {
  const title = getWikipediaTitle(name);

  const fromSummary = await fetchHeadshotFromSummaryTitle(title);
  if (fromSummary) {
    return fromSummary;
  }

  const searchedTitle = await searchWikipediaTitle(name);
  if (!searchedTitle) {
    return null;
  }

  return fetchHeadshotFromSummaryTitle(searchedTitle);
}

async function fetchHeadshotFromSummaryTitle(title: string): Promise<string | null> {
  const endpoint = WIKIPEDIA_SUMMARY_BASE + "/" + encodeURIComponent(title);

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "User-Agent": "RoundTableMastersPickem/1.0 (golf roster headshots)",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
    };

    return data.thumbnail?.source ?? data.originalimage?.source ?? null;
  } catch {
    return null;
  }
}

async function searchWikipediaTitle(name: string): Promise<string | null> {
  const query = encodeURIComponent(name + " golfer");
  const endpoint = WIKIPEDIA_SEARCH_BASE + "&search=" + query;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "User-Agent": "RoundTableMastersPickem/1.0 (golf roster headshots)",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as unknown;
    const titles = Array.isArray(data) ? data[1] : null;
    return Array.isArray(titles) && typeof titles[0] === "string" ? titles[0] : null;
  } catch {
    return null;
  }
}

export async function resolveGolferHeadshotUrl(name: string): Promise<string | null> {
  const key = toLookupKey(name);

  if (headshotCache.has(key)) {
    return headshotCache.get(key) ?? null;
  }

  const url = await fetchHeadshotUrl(name);
  headshotCache.set(key, url);
  return url;
}

export async function enrichPayloadWithHeadshots(payload: LiveScoresResponse): Promise<LiveScoresResponse> {
  const uniqueGolferNames = [...new Set(payload.rosters.flatMap((roster) => roster.golfers.map((golfer) => golfer.name)))];
  const resolved = await Promise.all(uniqueGolferNames.map(async (name) => [name, await resolveGolferHeadshotUrl(name)] as const));
  const headshotMap = new Map(resolved);

  return {
    ...payload,
    rosters: payload.rosters.map((roster) => ({
      ...roster,
      golfers: roster.golfers.map((golfer) => ({
        ...golfer,
        headshotUrl: headshotMap.get(golfer.name) ?? null,
      })),
    })),
  };
}
