// js/analytics.js (ES Module)
import { isoDate } from "./utils.js";

function weekXpMap(entries) {
  const m = new Map();
  for (const e of entries) {
    const w = Number(e.week || 0);
    if (!w) continue;
    m.set(w, (m.get(w) || 0) + Number(e.xp || 0));
  }
  return m;
}

function topExercises(entries, week) {
  const m = new Map();
  for (const e of entries) {
    if (Number(e.week) !== Number(week)) continue;
    const name = String(e.exercise || "");
    if (!name) continue;
    m.set(name, (m.get(name) || 0) + Number(e.xp || 0));
  }
  return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
}

function typeDist(entries, week) {
  const m = new Map();
  for (const e of entries) {
    if (Number(e.week) !== Number(week)) continue;
    const t = String(e.type || "Other");
    m.set(t, (m.get(t) || 0) + Number(e.xp || 0));
  }
  return [...m.entries()].sort((a,b)=>b[1]-a[1]);
}

function drawBars(canvas, labels, values) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const pad = 28;
  const innerW = W - pad*2;
  const innerH = H - pad*2;
  const maxV = Math.max(1, ...values);
  const n = values.length;

  const gap = 10;
  const bw = Math.max(10, Math.floor((innerW - gap*(n-1)) / n));

  ctx.globalAlpha = 0.25;
  ctx.fillRect(pad, H-pad, innerW, 2);
  ctx.globalAlpha = 1;

  ctx.font = "20px system-ui, -apple-system, Segoe UI, Roboto";
  for (let i=0;i<n;i++){
    const v = values[i];
    const h = Math.round((v/maxV) * (innerH-24));
    const x = pad + i*(bw+gap);
    const y = pad + (innerH - h);
    ctx.fillRect(x, y, bw, h);

    ctx.globalAlpha = 0.85;
    ctx.fillText(labels[i], x, H - 6);
    ctx.globalAlpha = 1;
  }
}

export function renderAnalyticsPanel(container, entries, curWeek) {
  if (!container) return;

  const weekMap = weekXpMap(entries);
  const startW = Math.max(1, curWeek - 7);
  const weeks = [];
  for (let w=startW; w<=curWeek; w++) weeks.push(w);
  const vals = weeks.map(w => weekMap.get(w) || 0);
  const labels = weeks.map(w => `W${w}`);

  const top10 = topExercises(entries, curWeek);
  const dist = typeDist(entries, curWeek);

  container.innerHTML = `
    <div class="card">
      <h2>Analytics</h2>
      <p class="hint">Wochen-XP, Top Übungen, Typ-Verteilung</p>

      <div class="pill"><b>Aktuelle Woche:</b> W${curWeek}</div>

      <div class="divider"></div>

      <h3>Wochen-XP (letzte 8 Wochen)</h3>
      <canvas id="anChart" width="900" height="260" style="width:100%;height:auto;border-radius:12px;"></canvas>

      <div class="divider"></div>

      <div class="grid2">
        <div class="skillbox">
          <h3>Top 10 Übungen (W${curWeek})</h3>
          <ul class="skilllist" id="anTop"></ul>
        </div>
        <div class="skillbox">
          <h3>XP nach Typ (W${curWeek})</h3>
          <ul class="skilllist" id="anType"></ul>
        </div>
      </div>
    </div>
  `;

  drawBars(container.querySelector("#anChart"), labels, vals);

  const ulTop = container.querySelector("#anTop");
  ulTop.innerHTML = top10.length ? "" : "<li>—</li>";
  top10.forEach(([name,xp], i) => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="entryRow"><div><b>${i+1}.</b> ${name}</div><span class="badge">${Math.round(xp)} XP</span></div>`;
    ulTop.appendChild(li);
  });

  const ulType = container.querySelector("#anType");
  ulType.innerHTML = dist.length ? "" : "<li>—</li>";
  dist.forEach(([t,xp]) => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="entryRow"><div><b>${t}</b></div><span class="badge">${Math.round(xp)} XP</span></div>`;
    ulType.appendChild(li);
  });
}
