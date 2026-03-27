const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

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
          <span class="player-name">${entry.name}</span>
          <span class="score total-score score-emphasis ${scoreToneClass(entry.bestFourTotal)}">${formatScore(entry.bestFourTotal)}</span>
          <span class="score daily-score ${scoreToneClass(entry.today)}">${formatScore(entry.today)}</span>
          <span class="movement ${movementClass(entry.movement)}">${entry.movement > 0 ? "▲" : entry.movement < 0 ? "▼" : "•"} ${formatMovement(entry.movement)}</span>
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
        <article class="roster-card">
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
                      <span class="golfer-name">${golfer.name}</span>
                      <strong class="golfer-total">${formatScore(golfer.totalToPar)}</strong>
                      <span class="golfer-today">Today ${formatScore(golfer.today)}</span>
                    </div>
                    <span class="round-breakdown">
                      <span class="round-chip">R1 ${formatScore(golfer.rounds?.[0] ?? null)}</span>
                      <span class="round-chip">R2 ${formatScore(golfer.rounds?.[1] ?? null)}</span>
                      <span class="round-chip">R3 ${formatScore(golfer.rounds?.[2] ?? null)}</span>
                      <span class="round-chip">R4 ${formatScore(golfer.rounds?.[3] ?? null)}</span>
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

function renderGraph(graphSeries) {
  if (!graphSeries?.length) {
    elements.chartWrap.hidden = true;
    setPanelState(elements.graphState, "No graph data is available yet.", "empty");
    return;
  }

  const labels = graphSeries[0].points.map((point) => point.label);
  const datasets = graphSeries.map((series, index) => ({
    label: series.name,
    data: series.points.map((point) => point.value),
    borderColor: CHART_COLORS[index % CHART_COLORS.length],
    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
    borderWidth: 2,
    tension: 0.32,
    pointRadius: 3,
    pointHoverRadius: 5,
    spanGaps: true,
  }));

  if (progressChart) {
    progressChart.destroy();
  }

  progressChart = new window.Chart(elements.chartCanvas, {
    type: "line",
    data: { labels, datasets },
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
          grid: {
            color: "rgba(15, 77, 47, 0.08)",
          },
          ticks: {
            color: "#617567",
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
  renderGraph(data.graphSeries);

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
