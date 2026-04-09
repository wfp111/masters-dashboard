const REFRESH_INTERVAL_MS = 2 * 60 * 1000;

const CHART_COLORS = [
  "#0f4d2f",
  "#c9a44c",
  "#467d58",
  "#7a8f3b",
  "#2d7f78",
  "#9b6a3f",
  "#5f7ad9",
  "#a24545",
  "#7d57a8",
  "#b6762b",
  "#446b50",
];

const elements = {
  leadersList: document.getElementById("leaders-list"),
  leadersState: document.getElementById("leaders-state"),
  standingsTable: document.getElementById("standings-table"),
  standingsState: document.getElementById("standings-state"),
  rostersGrid: document.getElementById("rosters-grid"),
  rostersState: document.getElementById("rosters-state"),
  graphLegend: document.getElementById("graph-legend"),
  graphState: document.getElementById("graph-state"),
  chartWrap: document.getElementById("chart-wrap"),
  chartCanvas: document.getElementById("progress-chart"),
  lastSync: document.getElementById("last-sync"),
  graphUpdated: document.getElementById("graph-updated"),
};

let progressChart = null;

const WIKIPEDIA_SUMMARY_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary";
const WIKIPEDIA_SEARCH_BASE = "https://en.wikipedia.org/w/api.php?action=opensearch&limit=1&namespace=0&format=json&origin=*";
const CLIENT_HEADSHOT_TITLE_MAP = {
  "tommy fleetwood": "Tommy Fleetwood",
  "hideki matsuyama": "Hideki Matsuyama",
  "maverick mcnealy": "Maverick McNealy",
  "sepp straka": "Sepp Straka",
  "tony finau": "Tony Finau",
  "alex noren": "Alex Noren",
  "ludvig aberg": "Ludvig ?berg",
  "ludvig ?berg": "Ludvig ?berg",
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
const clientHeadshotCache = new Map();

function toAnchorId(value) {
  return `roster-${String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

function getInitials(value) {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getHeadshotTitle(value) {
  return CLIENT_HEADSHOT_TITLE_MAP[String(value).trim().toLowerCase()] ?? value;
}

async function fetchClientHeadshotUrl(name) {
  const key = String(name).trim().toLowerCase();

  if (clientHeadshotCache.has(key)) {
    return clientHeadshotCache.get(key);
  }

  const title = getHeadshotTitle(name);
  const fromSummary = await fetchClientHeadshotFromSummary(title);
  if (fromSummary) {
    clientHeadshotCache.set(key, fromSummary);
    return fromSummary;
  }

  const searchedTitle = await searchClientHeadshotTitle(name);
  if (!searchedTitle) {
    clientHeadshotCache.set(key, null);
    return null;
  }

  const searchedUrl = await fetchClientHeadshotFromSummary(searchedTitle);
  clientHeadshotCache.set(key, searchedUrl);
  return searchedUrl;
}

async function fetchClientHeadshotFromSummary(title) {
  const endpoint = WIKIPEDIA_SUMMARY_BASE + "/" + encodeURIComponent(title);

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data?.thumbnail?.source ?? data?.originalimage?.source ?? null;
  } catch {
    return null;
  }
}

async function searchClientHeadshotTitle(name) {
  const endpoint = WIKIPEDIA_SEARCH_BASE + "&search=" + encodeURIComponent(String(name) + " golfer");

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const titles = Array.isArray(data) ? data[1] : null;
    return Array.isArray(titles) && typeof titles[0] === "string" ? titles[0] : null;
  } catch {
    return null;
  }
}

async function hydrateRosterHeadshots() {
  const fallbacks = [...document.querySelectorAll(".golfer-headshot-fallback[data-headshot-name]")];

  await Promise.all(
    fallbacks.map(async (fallback) => {
      const name = fallback.getAttribute("data-headshot-name");
      if (!name) {
        return;
      }

      const url = await fetchClientHeadshotUrl(name);
      if (!url || !fallback.parentElement) {
        return;
      }

      const img = document.createElement("img");
      img.className = "golfer-headshot";
      img.src = url;
      img.alt = name;
      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      fallback.replaceWith(img);
    }),
  );
}

function formatScore(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  if (value === 0) {
    return "E";
  }

  return value > 0 ? `+${value}` : `${value}`;
}

function formatScoreLong(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  if (value === 0) {
    return "Even";
  }

  return value > 0 ? `+${value}` : `${value}`;
}

function formatMovement(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  if (value === 0) {
    return "0";
  }

  return value > 0 ? `+${value}` : `${value}`;
}

function formatThru(value, status, today) {
  if (status === "wd") {
    return "WD";
  }

  if (status === "cut") {
    return "CUT";
  }

  if (!value) {
    return typeof today === "number" ? "Finished" : "";
  }

  if (value === "F") {
    return "Finished";
  }

  return `Thru ${value}`;
}

function formatRosterToday(value, thru, status) {
  if (status === "active" && !thru && value === null) {
    return "--";
  }

  return formatScore(value);
}

function formatRoundScore(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  if (value === 0) {
    return "E";
  }

  return String(value);
}

function scoreToneClass(value) {
  if (value === null || value === undefined || value === 0) {
    return "";
  }

  return value < 0 ? "score-negative" : "score-positive";
}

function movementClass(value) {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "steady";
}

function movementSymbol(value) {
  if (value > 0) return "&#9650;";
  if (value < 0) return "&#9660;";
  return "&bull;";
}

function formatTimestamp(value) {
  if (!value) {
    return "Unavailable";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function setPanelState(target, message, tone, hidden = false) {
  target.hidden = hidden;
  if (hidden) {
    return;
  }

  target.textContent = message;
  target.className = `panel-feedback ${tone}-state`;
}

function renderLeaders(leaders) {
  if (!leaders?.length) {
    elements.leadersList.hidden = true;
    setPanelState(elements.leadersState, "No leader data is available yet.", "empty");
    return;
  }

  elements.leadersList.innerHTML = leaders
    .map((leader, index) => {
      const suffix = index === 0 ? "st" : index === 1 ? "nd" : "rd";
      const podiumClass = ["first", "second", "third"][index] || "";

      return `
        <article class="leader-podium ${podiumClass}">
          <span class="podium-place">${index + 1}${suffix}</span>
          <div class="podium-copy">
            <strong class="podium-name">${leader.name}</strong>
            <span class="podium-score">Top 4: ${formatScore(leader.bestFourTotal)}</span>
            <span class="podium-meta">Today ${formatScore(leader.today)}</span>
            <span class="podium-meta">Move ${formatMovement(leader.movement)}</span>
          </div>
        </article>
      `;
    })
    .join("");

  elements.leadersList.hidden = false;
  setPanelState(elements.leadersState, "", "loading", true);
}

function renderStandings(standings) {
  if (!standings?.length) {
    elements.standingsTable.hidden = true;
    setPanelState(elements.standingsState, "No standings are available yet.", "empty");
    return;
  }

  const header = `
    <div class="table-row table-head" role="row">
      <span role="columnheader">Rank</span>
      <span role="columnheader">Name</span>
      <span role="columnheader">TOP 4</span>
      <span role="columnheader">Today</span>
      <span role="columnheader">Movement</span>
    </div>
  `;

  const rows = standings
    .map(
      (entry, index) => `
        <article class="table-row ${index === 0 ? "featured" : ""}" role="row">
          <span class="rank-badge">${entry.rank}</span>
          <a class="player-name player-link" href="#${toAnchorId(entry.name)}">${entry.name}</a>
          <span class="score total-score score-emphasis ${scoreToneClass(entry.bestFourTotal)}">${formatScore(entry.bestFourTotal)}</span>
          <span class="score daily-score ${scoreToneClass(entry.today)}">${formatScore(entry.today)}</span>
          <span class="movement ${movementClass(entry.movement)}">${movementSymbol(entry.movement)} ${formatMovement(entry.movement)}</span>
        </article>
      `,
    )
    .join("");

  elements.standingsTable.innerHTML = header + rows;
  elements.standingsTable.hidden = false;
  setPanelState(elements.standingsState, "", "loading", true);
}

function renderRosters(rosters, standings) {
  if (!rosters?.length) {
    elements.rostersGrid.hidden = true;
    setPanelState(elements.rostersState, "No roster data is available yet.", "empty");
    return;
  }

  const standingsLookup = new Map((standings || []).map((entry) => [entry.name, entry]));

  elements.rostersGrid.innerHTML = rosters
    .map((roster) => {
      const standing = standingsLookup.get(roster.name);

      return `
        <article class="roster-card" id="${toAnchorId(roster.name)}">
          <div class="roster-top">
            <h3>${roster.name}</h3>
            <span class="roster-score">TOP 4: ${formatScore(standing?.bestFourTotal ?? null)}</span>
          </div>
          <ul class="pick-list">
            ${roster.golfers
              .map(
                (golfer) => `
                  <li class="${golfer.countingTowardBestFour ? "counting" : ""}">
                    <div class="golfer-summary">
                      <span class="golfer-heading">
                        <span class="golfer-identity">
                          <span class="golfer-headshot-frame">
                            ${golfer.headshotUrl ? `<img class="golfer-headshot" src="${golfer.headshotUrl}" alt="${golfer.name}" loading="lazy" decoding="async" referrerpolicy="no-referrer" />` : `<span class="golfer-headshot-fallback" data-headshot-name="${golfer.name}">${getInitials(golfer.name)}</span>`}
                          </span>
                          <span class="golfer-name">${golfer.name}</span>
                        </span>
                      </span>
                      <strong class="golfer-total-bubble">${formatScore(golfer.totalToPar)}</strong>
                      <div class="golfer-meta">
                        <span class="golfer-side">
                          <span class="golfer-today">Today ${formatRosterToday(golfer.today, golfer.thru, golfer.status)}</span>
                          ${formatThru(golfer.thru, golfer.status, golfer.today) ? `<span class="golfer-thru">${formatThru(golfer.thru, golfer.status, golfer.today)}</span>` : ""}
                        </span>
                      </div>
                    </div>
                    <span class="round-breakdown">
                      <span class="round-chip">R1: ${formatRoundScore(golfer.rounds?.[0] ?? null)}</span>
                      <span class="round-chip">R2: ${formatRoundScore(golfer.rounds?.[1] ?? null)}</span>
                      <span class="round-chip">R3: ${formatRoundScore(golfer.rounds?.[2] ?? null)}</span>
                      <span class="round-chip">R4: ${formatRoundScore(golfer.rounds?.[3] ?? null)}</span>
                    </span>
                  </li>
                `,
              )
              .join("")}
          </ul>
        </article>
      `;
    })
    .join("");

  elements.rostersGrid.hidden = false;
  setPanelState(elements.rostersState, "", "loading", true);
  void hydrateRosterHeadshots();
}

function getCurrentRoundFromRosters(rosters) {
  if (!Array.isArray(rosters) || rosters.length === 0) {
    return 1;
  }

  let latestStartedRound = 1;

  for (const roster of rosters) {
    for (const golfer of roster.golfers ?? []) {
      const startedRounds = Array.isArray(golfer.rounds)
        ? golfer.rounds.filter((round) => round !== null && round !== undefined).length
        : 0;

      latestStartedRound = Math.max(latestStartedRound, Math.min(Math.max(startedRounds, 1), 4));
    }
  }

  return latestStartedRound;
}

function renderGraphLegend(graphSeries) {
  elements.graphLegend.innerHTML = graphSeries
    .map(
      (entry, index) => `
        <span><i class="legend-swatch" style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></i>${entry.name}</span>
      `,
    )
    .join("");
}

function renderGraph(graphSeries, rosters) {
  if (!graphSeries?.length) {
    elements.chartWrap.hidden = true;
    setPanelState(elements.graphState, "No graph data is available yet.", "empty");
    return;
  }

  const currentRound = getCurrentRoundFromRosters(rosters);

  const datasets = graphSeries.map((series, index) => {
    const roundPoints = series.points.filter((point) => /^Round\s+\d+$/i.test(point.label));
    const snapshotPoints = series.points.filter((point) => point.label !== "Start" && !/^Round\s+\d+$/i.test(point.label));
    const liveSegmentStart = Math.max(currentRound - 1, 0);
    const snapshotCount = Math.max(snapshotPoints.length, 1);

    const data = series.points.map((point) => {
      if (point.label === "Start") {
        return { x: 0, y: point.value };
      }

      const roundMatch = point.label.match(/^Round\s+(\d+)$/i);
      if (roundMatch) {
        return { x: Number(roundMatch[1]), y: point.value };
      }

      const snapshotIndex = snapshotPoints.findIndex((entry) => entry.label === point.label && entry.value === point.value);
      const spreadIndex = snapshotIndex >= 0 ? snapshotIndex + 1 : snapshotCount;
      const x = liveSegmentStart + (spreadIndex / snapshotCount);
      return { x, y: point.value };
    });

    return {
      label: series.name,
      data,
      borderColor: CHART_COLORS[index % CHART_COLORS.length],
      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
      borderWidth: 2.5,
      tension: 0.86,
      pointRadius: 0,
      pointHoverRadius: 0,
      pointHitRadius: 10,
      spanGaps: true,
    };
  });

  if (progressChart) {
    progressChart.destroy();
  }

  progressChart = new window.Chart(elements.chartCanvas, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "nearest",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(10, 51, 31, 0.94)",
          titleFont: { family: "Merriweather" },
          bodyFont: { family: "Merriweather" },
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${formatScore(context.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: currentRound,
          grid: {
            color: "rgba(15, 77, 47, 0.08)",
          },
          ticks: {
            color: "#617567",
            stepSize: 1,
            callback(value) {
              if (value < 1 || value > currentRound || !Number.isInteger(value)) {
                return "";
              }

              return `Round ${value}`;
            },
          },
        },
        y: {
          reverse: true,
          grid: {
            color: "rgba(15, 77, 47, 0.08)",
          },
          ticks: {
            color: "#617567",
            callback(value) {
              return formatScore(value);
            },
          },
        },
      },
    },
  });

  renderGraphLegend(graphSeries);
  elements.chartWrap.hidden = false;
  setPanelState(elements.graphState, "", "loading", true);
}
async function getLiveScores() {
  const response = await fetch("/api/live-scores", {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Live scores request failed with status ${response.status}`);
  }

  return response.json();
}

function renderError(message) {
  elements.leadersList.hidden = true;
  elements.standingsTable.hidden = true;
  elements.rostersGrid.hidden = true;
  elements.chartWrap.hidden = true;

  setPanelState(elements.leadersState, message, "error");
  setPanelState(elements.standingsState, message, "error");
  setPanelState(elements.rostersState, message, "error");
  setPanelState(elements.graphState, message, "error");
}

function renderLiveData(data) {
  renderLeaders(data.leaders);
  renderStandings(data.standings);
  renderRosters(data.rosters, data.standings);
  renderGraph(data.graphSeries, data.rosters);

  const formattedUpdated = formatTimestamp(data.updatedAt);
  elements.lastSync.textContent = formattedUpdated;
  elements.graphUpdated.textContent = `Last updated: ${formattedUpdated}`;
}

async function refreshLiveData() {
  try {
    const data = await getLiveScores();
    renderLiveData(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load live scores.";
    renderError(message);
  }
}

refreshLiveData();
window.setInterval(refreshLiveData, REFRESH_INTERVAL_MS);
