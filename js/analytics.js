// analyticsPro.js
import { $, isoDate, addDays, startOfWeekMonday } from "./utils.js";

export function ensureAnalyticsTab(){
  const nav = document.querySelector("nav.tabs");
  const main = document.querySelector("main");
  if (!nav || !main) return;

  if (!document.querySelector('.tab[data-tab="analytics"]')) {
    const btn = document.createElement("button");
    btn.type="button";
    btn.className="tab";
    btn.dataset.tab="analytics";
    btn.textContent="Analytics";
    const exportBtn = nav.querySelector('.tab[data-tab="export"]');
    if (exportBtn) nav.insertBefore(btn, exportBtn);
    else nav.appendChild(btn);
  }

  if (!document.getElementById("tab-analytics")) {
    const sec = document.createElement("section");
    sec.id="tab-analytics";
    sec.className="panel";
    sec.innerHTML = `
      <div class="card">
        <h2>Advanced Analytics</h2>
        <p class="hint">Echte Canvas Graphen (offline).</p>

        <div class="row2">
          <div class="pill"><b>Woche:</b> <span id="anWeek">—</span></div>
          <div class="pill"><b>Trend:</b> <span id="anTrend">—</span></div>
        </div>

        <div class="divider"></div>

        <h2>Wochen-XP (letzte 10 Wochen)</h2>
        <canvas id="chartWeeks" width="900" height="240" style="width:100%; height:auto; border-radius:12px;"></canvas>

        <div class="divider"></div>

        <h2>XP nach Typ (aktuelle Woche)</h2>
        <canvas id="chartTypes" width="900" height="240" style="width:100%; height:auto; border-radius:12px;"></canvas>

        <div class="divider"></div>

        <h2>⭐ Heatmap (aktuelle Woche)</h2>
        <div id="starHeat" class="calGrid"></div>

        <div class="divider"></div>

        <h2>Top 10 Übungen (Woche)</h2>
        <ul id="anTop" class="skilllist"></ul>
      </div>
    `;
    main.appendChild(sec);
  }
}

function pctChange(cur, prev){
  if (prev <= 0 && cur > 0) return "↑ neu";
  if (prev <= 0 && cur <= 0) return "—";
  const p = ((cur - prev) / prev) * 100;
  const sign = p >= 0 ? "+" : "";
  return `${sign}${Math.round(p)}%`;
}

function drawBars(canvas, labels, values){
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const pad = 24;
  const innerW = W - pad*2;
  const innerH = H - pad*2;

  const maxV = Math.max(1, ...values);
  const n = values.length;
  const gap = Math.max(6, Math.floor(innerW / (n*12)));
  const barW = Math.floor((innerW - gap*(n-1)) / n);

  ctx.globalAlpha = 0.25;
  ctx.fillRect(pad, H-pad, innerW, 2);
  ctx.globalAlpha = 1;

  for (let i=0;i<n;i++){
    const v = values[i] || 0;
    const h = Math.round((v/maxV) * (innerH-30));
    const x = pad + i*(barW+gap);
    const y = pad + (innerH - h);

    ctx.fillRect(x, y, barW, h);

    ctx.globalAlpha = 0.85;
    ctx.font = "20px system-ui";
    ctx.fillText(labels[i], x, H - 8);
    ctx.globalAlpha = 1;
  }
}

export function renderAnalyticsPro(entries, curWeek, thr, starsForDayFn, getWeekFromDateFn, startDateISO){
  ensureAnalyticsTab();

  // Weeks map
  const weekMap = {};
  for (const e of entries){
    const w = e.week || getWeekFromDateFn(e.date);
    weekMap[w] = (weekMap[w] || 0) + (e.xp || 0);
  }

  const weeks = [];
  for (let w = Math.max(1, curWeek-9); w <= curWeek; w++) weeks.push(w);

  const vals = weeks.map(w=>weekMap[w]||0);
  const labels = weeks.map(w=>`W${w}`);

  const cur = weekMap[curWeek] || 0;
  const prev = weekMap[curWeek-1] || 0;

  if ($("#anWeek")) $("#anWeek").textContent = `W${curWeek}`;
  if ($("#anTrend")) $("#anTrend").textContent = `${pctChange(cur, prev)} (${cur} XP)`;

  drawBars($("#chartWeeks"), labels, vals);

  // Type distribution current week
  const typeMap = {};
  for (const e of entries){
    if ((e.week || getWeekFromDateFn(e.date)) !== curWeek) continue;
    const t = e.type || "Other";
    typeMap[t] = (typeMap[t] || 0) + (e.xp || 0);
  }
  const dist = Object.entries(typeMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  drawBars($("#chartTypes"), dist.map(x=>x[0].slice(0,6)), dist.map(x=>Math.round(x[1])));

  // Top 10 exercises
  const exMap = {};
  for (const e of entries){
    if ((e.week || getWeekFromDateFn(e.date)) !== curWeek) continue;
    const name = String(e.exercise||"");
    if (name.startsWith("Bossfight CLEARED")) continue;
    exMap[name] = (exMap[name] || 0) + (e.xp || 0);
  }
  const top10 = Object.entries(exMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const ul = $("#anTop");
  if (ul){
    ul.innerHTML = top10.length ? "" : "<li>—</li>";
    top10.forEach(([name,xp],i)=>{
      const li=document.createElement("li");
      li.innerHTML = `<div class="entryRow"><div style="min-width:0;"><b>${i+1}.</b> ${name}</div><span class="badge">${Math.round(xp)} XP</span></div>`;
      ul.appendChild(li);
    });
  }

  // Star heat (7 days of current week)
  const start = startDateISO;
  const weekStart = addDays(start, (curWeek-1)*7);
  const monday = startOfWeekMonday(weekStart);
  const days = Array.from({length:7}, (_,i)=>addDays(monday,i));

  const dayXP = Object.fromEntries(days.map(d=>[d,0]));
  for (const e of entries){
    if ((e.week || getWeekFromDateFn(e.date)) !== curWeek) continue;
    if (dayXP[e.date] != null) dayXP[e.date] += (e.xp||0);
  }

  const grid = $("#starHeat");
  if (grid){
    const DOW = ["Mo","Di","Mi","Do","Fr","Sa","So"];
    grid.innerHTML = "";
    for (let i=0;i<7;i++){
      const d = days[i];
      const xp = dayXP[d]||0;
      const s = starsForDayFn(xp, thr);
      const cell=document.createElement("div");
      cell.className="calCell";
      cell.innerHTML = `
        <div class="calTop">
          <div class="calDow">${DOW[i]}</div>
          <div class="calDate">${d.slice(5)}</div>
        </div>
        <div class="calXP"><b>${xp}</b> XP</div>
        <div class="calStars">${s}</div>
      `;
      grid.appendChild(cell);
    }
  }
}
