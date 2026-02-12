/* analytics.js – Canvas charts (ES Module, no libs) */

import { isoDate } from "./utils.js";

function weekXpMap(entries) {
  const m = {};
  for (const e of entries) {
    const w = e.week || 1;
    m[w] = (m[w] || 0) + (e.xp || 0);
  }
  return m;
}

function drawBars(canvas, labels, values) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const pad = 28;
  const iw = W - pad * 2;
  const ih = H - pad * 2;
  const maxV = Math.max(1, ...values);
  const n = values.length;

  const gap = 10;
  const bw = Math.floor((iw - gap * (n - 1)) / n);

  // baseline
  ctx.globalAlpha = 0.35;
  ctx.fillRect(pad, H - pad, iw, 2);
  ctx.globalAlpha = 1;

  values.forEach((v, i) => {
    const h = Math.round((v / maxV) * (ih - 30));
    const x = pad + i * (bw + gap);
    const y = pad + (ih - h);

    ctx.fillRect(x, y, bw, h);

    ctx.globalAlpha = 0.85;
    ctx.font = "22px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(labels[i], x, H - 6);
    ctx.globalAlpha = 1;
  });
}

function topExercises(entries, limit = 10) {
  const m = {};
  for (const e of entries) {
    const k = e.exercise || "—";
    m[k] = (m[k] || 0) + (e.xp || 0);
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export function renderAnalyticsPanel(container, player, entries) {
  if (!container) return;

  const wm = weekXpMap(entries);
  const curW = player.week || 1;
  const weeks = [];
  for (let w = Math.max(1, curW - 7); w <= curW; w++) weeks.push(w);
  const vals = weeks.map(w => wm[w] || 0);

  container.innerHTML = `
    <div class="card">
      <h2>Analytics</h2>
      <p class="hint">Echte Canvas-Charts (ohne Libs) + Top-Übungen.</p>
      <div class="row2">
        <div class="pill"><b>Woche:</b> W${curW}</div>
        <div class="pill"><b>Woche XP:</b> ${wm[curW] || 0}</div>
        <div class="pill"><b>Gesamt XP:</b> ${player.totalXp || 0}</div>
      </div>
    </div>

    <div class="card">
      <h2>Wochen-XP (letzte 8 Wochen)</h2>
      <canvas id="anChart" width="900" height="260" style="width:100%;height:auto;border-radius:12px;"></canvas>
    </div>

    <div class="card">
      <h2>Top 10 Übungen (All-Time)</h2>
      <ul id="anTop" class="skilllist"></ul>
    </div>
  `;

  const labels = weeks.map(w => `W${w}`);
  drawBars(container.querySelector("#anChart"), labels, vals);

  const ul = container.querySelector("#anTop");
  const top = topExercises(entries, 10);
  ul.innerHTML = top.length ? "" : "<li>—</li>";
  top.forEach(([name, xp], i) => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="entryRow"><div style="min-width:0;"><b>${i + 1}.</b> ${name}</div><span class="badge">${Math.round(xp)} XP</span></div>`;
    ul.appendChild(li);
  });
}
