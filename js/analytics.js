import { $, fmt } from "./utils.js";

function drawBarChart(canvas, labels, values) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const pad = 28;
  const innerW = W - pad*2;
  const innerH = H - pad*2;

  const maxV = Math.max(1, ...values);
  const n = values.length;
  const gap = Math.max(8, Math.floor(innerW / (n*10)));
  const barW = Math.floor((innerW - gap*(n-1)) / n);

  ctx.globalAlpha = 0.25;
  ctx.fillRect(pad, H-pad, innerW, 2);
  ctx.globalAlpha = 1;

  for (let i=0;i<n;i++){
    const v = values[i];
    const h = Math.round((v/maxV) * (innerH-22));
    const x = pad + i*(barW+gap);
    const y = pad + (innerH - h);

    ctx.fillRect(x, y, barW, h);

    ctx.globalAlpha = 0.85;
    ctx.font = "20px system-ui";
    ctx.fillText(labels[i], x, H - 8);
    ctx.globalAlpha = 1;
  }
}

function drawLine(canvas, labels, values) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const pad = 28;
  const innerW = W - pad*2;
  const innerH = H - pad*2;

  const maxV = Math.max(1, ...values);
  const minV = Math.min(...values, 0);
  const range = Math.max(1, maxV - minV);

  const pts = values.map((v, i) => {
    const x = pad + (i / Math.max(1, values.length - 1)) * innerW;
    const y = pad + innerH - ((v - minV) / range) * innerH;
    return {x,y};
  });

  ctx.beginPath();
  pts.forEach((p,i)=> i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.9;
  ctx.stroke();
  ctx.globalAlpha = 1;

  pts.forEach(p=>{
    ctx.beginPath();
    ctx.arc(p.x,p.y,4,0,Math.PI*2);
    ctx.fill();
  });

  ctx.globalAlpha = 0.85;
  ctx.font = "18px system-ui";
  ctx.fillText(labels[0] || "", pad, 20);
  ctx.globalAlpha = 1;
}

export function renderAnalyticsPanel(container, entries, currentWeek) {
  container.innerHTML = `
    <div class="card">
      <h2>📊 Advanced Analytics</h2>
      <p class="hint">Echte Canvas-Charts (Offline). Fokus: Trend, Top-Übungen, Typ-Verteilung.</p>

      <div class="row2">
        <div class="pill"><b>Aktuelle Woche:</b> W${currentWeek}</div>
        <div class="pill"><b>Einträge:</b> ${fmt(entries.length)}</div>
      </div>

      <div class="divider"></div>

      <h3>Wochen-XP (letzte 12 Wochen)</h3>
      <div class="canvasBox"><canvas id="anWeekBar" width="900" height="260"></canvas></div>
      <p class="hint" id="anWeekHint">—</p>

      <div class="divider"></div>

      <div class="grid2">
        <div class="card">
          <h3>Top 10 Übungen (nach XP)</h3>
          <ul id="anTopEx" class="list"></ul>
        </div>
        <div class="card">
          <h3>XP nach Typ</h3>
          <ul id="anType" class="list"></ul>
        </div>
      </div>
    </div>
  `;

  const weekMap = {};
  for (const e of entries) {
    const w = Number(e.week || 1);
    weekMap[w] = (weekMap[w] || 0) + (e.xp || 0);
  }

  const startW = Math.max(1, currentWeek - 11);
  const weeks = [];
  for (let w = startW; w <= currentWeek; w++) weeks.push(w);

  const labels = weeks.map(w => `W${w}`);
  const vals = weeks.map(w => weekMap[w] || 0);

  drawBarChart($("#anWeekBar"), labels, vals);

  const cur = weekMap[currentWeek] || 0;
  const prev = weekMap[currentWeek-1] || 0;
  const trend =
    prev <= 0 && cur > 0 ? "↑ neu" :
    prev <= 0 ? "—" :
    `${Math.round(((cur-prev)/prev)*100)}%`;

  $("#anWeekHint").textContent = `Trend vs. letzte Woche: ${trend} (W${currentWeek}: ${fmt(cur)} XP, W${currentWeek-1}: ${fmt(prev)} XP)`;

  // Top Exercises
  const exMap = {};
  for (const e of entries) {
    if (e.week !== currentWeek) continue;
    const name = String(e.exercise || "—");
    if (name.startsWith("Bossfight CLEARED")) continue;
    exMap[name] = (exMap[name] || 0) + (e.xp || 0);
  }
  const top10 = Object.entries(exMap).sort((a,b)=>b[1]-a[1]).slice(0,10);

  const ulTop = $("#anTopEx");
  ulTop.innerHTML = top10.length ? "" : `<li>—</li>`;
  top10.forEach(([name, xp], i) => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="entryRow"><div><b>${i+1}.</b> ${name}</div><span class="badge">${fmt(Math.round(xp))} XP</span></div>`;
    ulTop.appendChild(li);
  });

  // Type Dist
  const typeMap = {};
  for (const e of entries) {
    if (e.week !== currentWeek) continue;
    const t = e.type || "Other";
    typeMap[t] = (typeMap[t] || 0) + (e.xp || 0);
  }
  const dist = Object.entries(typeMap).sort((a,b)=>b[1]-a[1]);
  const total = dist.reduce((s,[_t,x])=>s+x,0) || 1;

  const ulType = $("#anType");
  ulType.innerHTML = dist.length ? "" : `<li>—</li>`;
  dist.forEach(([t,x]) => {
    const pct = Math.round((x/total)*100);
    const li = document.createElement("li");
    li.innerHTML = `<div class="entryRow"><div><b>${t}</b> <span class="small">(${pct}%)</span></div><span class="badge">${fmt(Math.round(x))} XP</span></div>`;
    ulType.appendChild(li);
  });
}

export function renderDashboardMiniAnalytics(container, entries, currentWeek) {
  const weekMap = {};
  for (const e of entries) weekMap[e.week] = (weekMap[e.week] || 0) + (e.xp || 0);

  const cur = weekMap[currentWeek] || 0;
  const prev = weekMap[currentWeek-1] || 0;
  const trend =
    prev <= 0 && cur > 0 ? "↑ neu" :
    prev <= 0 ? "—" :
    `${Math.round(((cur-prev)/prev)*100)}%`;

  // Spark line: simple line chart
  const weeks = [];
  for (let w = Math.max(1, currentWeek-7); w <= currentWeek; w++) weeks.push(w);
  const labels = weeks.map(w=>`W${w}`);
  const vals = weeks.map(w=>weekMap[w]||0);

  container.innerHTML = `
    <div class="card">
      <h2>Mini-Analytics</h2>
      <div class="row2">
        <div class="pill"><b>Trend:</b> ${trend} (${fmt(cur)} XP)</div>
        <div class="pill"><b>Letzte Woche:</b> ${fmt(prev)} XP</div>
      </div>
      <div class="divider"></div>
      <div class="canvasBox"><canvas id="dashLine" width="900" height="180"></canvas></div>
      <p class="hint">Letzte 8 Wochen</p>
    </div>
  `;

  drawLine($("#dashLine"), labels, vals);
}
