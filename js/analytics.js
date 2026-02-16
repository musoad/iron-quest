// js/analytics.js
window.Analytics = (function(){
  const { isoDate, startOfWeekMonday, addDays } = window.Utils;
  const { weekNumberFor } = window.Progression;

  function weekXpMap(entries){
    const m = {};
    for (const e of entries){
      const w = Number(e.week||0);
      if (!w) continue;
      m[w] = (m[w]||0) + (e.xp||0);
    }
    return m;
  }

  function drawBars(canvas, labels, values){
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);

    const pad=28;
    const maxV = Math.max(1, ...values);
    const innerW = W - pad*2;
    const innerH = H - pad*2;
    const n = values.length;
    const gap = 10;
    const bw = Math.floor((innerW - gap*(n-1))/n);

    // baseline
    ctx.globalAlpha = 0.35;
    ctx.fillRect(pad, H-pad, innerW, 2);
    ctx.globalAlpha = 1;

    ctx.font = "18px system-ui";
    for (let i=0;i<n;i++){
      const v = values[i];
      const h = Math.round((v/maxV) * (innerH-20));
      const x = pad + i*(bw+gap);
      const y = pad + (innerH - h);
      ctx.fillRect(x, y, bw, h);
      ctx.globalAlpha = 0.85;
      ctx.fillText(labels[i], x, H-8);
      ctx.globalAlpha = 1;
    }
  }

  function render(elId, entries){
    const el = document.getElementById(elId);
    if (!el) return;

    const today = isoDate(new Date());
    const curWeek = weekNumberFor(today);
    const map = weekXpMap(entries);

    const weeks = [];
    for (let w = Math.max(1, curWeek-7); w <= curWeek; w++) weeks.push(w);
    const vals = weeks.map(w=>map[w]||0);
    const labels = weeks.map(w=>`W${w}`);

    // top exercises this week
    const ex = {};
    for (const e of entries){
      if (Number(e.week) !== curWeek) continue;
      const name = String(e.exercise||"");
      ex[name] = (ex[name]||0) + (e.xp||0);
    }
    const top10 = Object.entries(ex).sort((a,b)=>b[1]-a[1]).slice(0,10);

    el.innerHTML = `
      <div class="card">
        <h2>Analytics</h2>
        <p class="hint">Wochen-XP Chart + Top Übungen (aktuelle Woche).</p>
        <div class="row2">
          <div class="pill"><b>Aktuelle Woche:</b> W${curWeek}</div>
          <div class="pill"><b>Einträge:</b> ${entries.length}</div>
        </div>
        <hr>
        <h2>Wochen-XP (letzte 8 Wochen)</h2>
        <canvas id="anChart" width="900" height="260"></canvas>
        <hr>
        <h2>Top 10 Übungen (W${curWeek})</h2>
        <ul class="list" id="anTop"></ul>
      </div>
    `;

    drawBars(document.getElementById("anChart"), labels, vals);

    const ul = document.getElementById("anTop");
    if (!top10.length) ul.innerHTML = `<li>—</li>`;
    else {
      ul.innerHTML = "";
      top10.forEach(([name,xp],i)=>{
        const li = document.createElement("li");
        li.innerHTML = `<div class="itemTop"><div><b>${i+1}. ${name}</b></div><span class="badge">${Math.round(xp)} XP</span></div>`;
        ul.appendChild(li);
      });
    }
  }

  return { render };
})();
