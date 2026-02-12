/* analytics.js – CLASSIC SCRIPT
   Exposes: window.IronQuestAnalytics
*/

(function () {
  function sumByWeek(entries) {
    const m = {};
    for (const e of entries) {
      const w = e.week || 1;
      m[w] = (m[w] || 0) + (e.xp || 0);
    }
    return m;
  }

  function drawBarChart(canvas, labels, values) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const pad = 24;
    const innerW = W - pad * 2;
    const innerH = H - pad * 2;

    const maxV = Math.max(1, ...values);
    const n = values.length;
    const gap = Math.max(8, Math.floor(innerW / (n * 10)));
    const barW = Math.floor((innerW - gap * (n - 1)) / n);

    ctx.globalAlpha = 0.35;
    ctx.fillRect(pad, H - pad, innerW, 2);
    ctx.globalAlpha = 1;

    for (let i = 0; i < n; i++) {
      const v = values[i];
      const h = Math.round((v / maxV) * (innerH - 20));
      const x = pad + i * (barW + gap);
      const y = pad + (innerH - h);

      ctx.fillRect(x, y, barW, h);

      ctx.globalAlpha = 0.85;
      ctx.font = "22px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText(labels[i], x, H - 6);
      ctx.globalAlpha = 1;
    }
  }

  function renderAnalyticsPanel(targetSelector, entries, player) {
    const root = document.querySelector(targetSelector);
    if (!root) return;

    const weekMap = sumByWeek(entries);
    const curWeek = player?.week || 1;

    const weeks = [];
    for (let w = Math.max(1, curWeek - 7); w <= curWeek; w++) weeks.push(w);

    const labels = weeks.map((w) => `W${w}`);
    const vals = weeks.map((w) => weekMap[w] || 0);

    const top = {};
    for (const e of entries) {
      if ((e.week || 0) !== curWeek) continue;
      const k = e.exercise || "—";
      top[k] = (top[k] || 0) + (e.xp || 0);
    }
    const top10 = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 10);

    root.innerHTML = `
      <div class="card">
        <h2>Analytics</h2>
        <div class="row2">
          <div class="pill"><b>Aktuelle Woche:</b> W${curWeek}</div>
          <div class="pill"><b>Einträge:</b> ${entries.length}</div>
        </div>

        <div class="divider"></div>

        <h3>Wochen-XP (letzte 8 Wochen)</h3>
        <canvas id="iqWeekChart" width="900" height="240" style="width:100%; height:auto; border-radius:12px;"></canvas>

        <div class="divider"></div>

        <h3>Top 10 Übungen (Woche)</h3>
        <ul class="skilllist" id="iqTop10"></ul>
      </div>
    `;

    drawBarChart(root.querySelector("#iqWeekChart"), labels, vals);

    const ul = root.querySelector("#iqTop10");
    ul.innerHTML = top10.length ? "" : "<li>—</li>";
    top10.forEach(([name, xp], i) => {
      const li = document.createElement("li");
      li.innerHTML = `<div class="entryRow"><div><b>${i + 1}.</b> ${name}</div><span class="badge">${Math.round(xp)} XP</span></div>`;
      ul.appendChild(li);
    });
  }

  window.IronQuestAnalytics = { renderAnalyticsPanel };
})();
