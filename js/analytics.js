/* =========================
   IRON QUEST – analytics.js (Classic)
   Exposes: window.IronQuestAnalytics.render(state)
========================= */

(function () {
  function $(id) { return document.getElementById(id); }

  function drawBars(canvas, labels, values) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const pad = 30;
    const maxV = Math.max(1, ...values);
    const innerW = W - pad * 2;
    const innerH = H - pad * 2;

    // baseline
    ctx.globalAlpha = 0.3;
    ctx.fillRect(pad, H - pad, innerW, 2);
    ctx.globalAlpha = 1;

    const n = values.length || 1;
    const gap = Math.max(10, Math.floor(innerW / (n * 8)));
    const barW = Math.floor((innerW - gap * (n - 1)) / n);

    ctx.font = "18px system-ui, -apple-system, Segoe UI, Roboto";
    for (let i = 0; i < n; i++) {
      const v = values[i] || 0;
      const h = Math.round((v / maxV) * (innerH - 20));
      const x = pad + i * (barW + gap);
      const y = pad + (innerH - h);

      ctx.fillRect(x, y, barW, h);
      ctx.globalAlpha = 0.9;
      ctx.fillText(labels[i] || "", x, H - 6);
      ctx.globalAlpha = 1;
    }
  }

  function weekXp(entries) {
    const m = {};
    for (const e of entries) {
      const w = Number(e.week || 1);
      m[w] = (m[w] || 0) + (Number(e.xp || 0));
    }
    return m;
  }

  function topExercises(entries, week) {
    const m = {};
    for (const e of entries) {
      if (Number(e.week) !== Number(week)) continue;
      const name = String(e.exercise || "—");
      m[name] = (m[name] || 0) + (Number(e.xp || 0));
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }

  function typeDist(entries, week) {
    const m = {};
    for (const e of entries) {
      if (Number(e.week) !== Number(week)) continue;
      const t = String(e.type || "Other");
      m[t] = (m[t] || 0) + (Number(e.xp || 0));
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }

  function render(state) {
    const sec = $("analytics");
    if (!sec) return;

    const entries = state.entries || [];
    const curWeek = state.currentWeek || 1;

    const wmap = weekXp(entries);
    const weeks = [];
    for (let w = Math.max(1, curWeek - 7); w <= curWeek; w++) weeks.push(w);
    const vals = weeks.map(w => wmap[w] || 0);
    const labels = weeks.map(w => `W${w}`);

    const top10 = topExercises(entries, curWeek);
    const dist = typeDist(entries, curWeek);

    sec.innerHTML = `
      <h2>📊 Analytics</h2>
      <p class="hint">Echte Canvas-Graphen: Wochen-XP + Top Übungen + Typ-Verteilung.</p>

      <div class="card">
        <h3>Wochen-XP (letzte 8 Wochen)</h3>
        <canvas id="anChart" width="900" height="260" style="width:100%;height:auto;border-radius:12px;"></canvas>
        <p class="hint">Aktuell: W${curWeek} = <b>${wmap[curWeek] || 0} XP</b></p>
      </div>

      <div class="grid2">
        <div class="card">
          <h3>Top 10 Übungen (W${curWeek})</h3>
          <ul id="anTop" class="list"></ul>
        </div>
        <div class="card">
          <h3>XP nach Typ (W${curWeek})</h3>
          <ul id="anTypes" class="list"></ul>
        </div>
      </div>
    `;

    drawBars(document.getElementById("anChart"), labels, vals);

    const ulTop = $("anTop");
    if (ulTop) {
      ulTop.innerHTML = top10.length ? "" : "<li>—</li>";
      top10.forEach(([name, xp], i) => {
        const li = document.createElement("li");
        li.textContent = `${i + 1}. ${name} — ${Math.round(xp)} XP`;
        ulTop.appendChild(li);
      });
    }

    const ulTypes = $("anTypes");
    if (ulTypes) {
      ulTypes.innerHTML = dist.length ? "" : "<li>—</li>";
      dist.forEach(([t, xp]) => {
        const li = document.createElement("li");
        li.textContent = `${t}: ${Math.round(xp)} XP`;
        ulTypes.appendChild(li);
      });
    }
  }

  window.IronQuestAnalytics = { render };
})();
