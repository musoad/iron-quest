(function(){
  function weekXP(entries){
    const map = {};
    for (const e of entries){
      const w = Number(e.week||1);
      map[w] = (map[w]||0) + (e.xp||0);
    }
    return map;
  }

  function drawBars(canvas, labels, values){
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);

    const pad = 26;
    const innerW = W - pad*2;
    const innerH = H - pad*2;

    const maxV = Math.max(1, ...values);
    const n = values.length;
    const gap = Math.max(10, Math.floor(innerW/(n*8)));
    const barW = Math.floor((innerW - gap*(n-1)) / n);

    // baseline
    ctx.globalAlpha = 0.35;
    ctx.fillRect(pad, H-pad, innerW, 2);
    ctx.globalAlpha = 1;

    for (let i=0;i<n;i++){
      const v = values[i];
      const h = Math.round((v/maxV) * (innerH-20));
      const x = pad + i*(barW+gap);
      const y = pad + (innerH - h);

      ctx.fillRect(x, y, barW, h);

      ctx.globalAlpha = 0.85;
      ctx.font = "22px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText(labels[i], x, H-6);
      ctx.globalAlpha = 1;
    }
  }

  function renderAnalytics(container, entries, curWeek){
    const wmap = weekXP(entries);
    const start = Math.max(1, curWeek-7);
    const weeks = [];
    for (let w=start; w<=curWeek; w++) weeks.push(w);
    const labels = weeks.map(w=>"W"+w);
    const vals = weeks.map(w=>wmap[w]||0);

    const top = {};
    for (const e of entries){
      const ex = String(e.exercise||"");
      top[ex] = (top[ex]||0) + (e.xp||0);
    }
    const top10 = Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,10);

    container.innerHTML = `
      <div class="card">
        <h2>Analytics</h2>
        <div class="row2">
          <div class="pill"><b>Aktuelle Woche:</b> W${curWeek}</div>
          <div class="pill"><b>Einträge:</b> ${entries.length}</div>
        </div>
        <div class="divider"></div>
        <h2>Wochen-XP (letzte 8)</h2>
        <canvas id="anBars" width="900" height="260"></canvas>
        <p class="hint">Tipp: Mehr Konstanz → mehr Streak Bonus.</p>
      </div>

      <div class="card">
        <h2>Top 10 Übungen (gesamt)</h2>
        <ul class="list" id="anTop"></ul>
      </div>
    `;

    drawBars(document.getElementById("anBars"), labels, vals);

    const ul = document.getElementById("anTop");
    ul.innerHTML = top10.length ? "" : "<li>—</li>";
    top10.forEach(([name,xp], i)=>{
      const li = document.createElement("li");
      li.innerHTML = `<div class="row" style="justify-content:space-between;align-items:center;">
        <div><b>${i+1}.</b> ${name}</div>
        <span class="badge">${Math.round(xp)} XP</span>
      </div>`;
      ul.appendChild(li);
    });
  }

  window.IronQuestAnalytics = { renderAnalytics };
})();
