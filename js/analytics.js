// js/analytics.js ✅ (Canvas Charts)

(function () {
  function weekXpMap(entries) {
    const m = {};
    for (const e of entries) {
      const w = Number(e.week || 1);
      m[w] = (m[w] || 0) + Number(e.xp || 0);
    }
    return m;
  }

  function topExercises(entries, week, n = 10) {
    const m = {};
    for (const e of entries) {
      if (Number(e.week) !== Number(week)) continue;
      const name = String(e.exercise || "");
      if (!name) continue;
      m[name] = (m[name] || 0) + Number(e.xp || 0);
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
  }

  function drawBars(canvas, labels, values) {
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

    ctx.globalAlpha = 0.25;
    ctx.fillRect(pad, H - pad, innerW, 2);
    ctx.globalAlpha = 1;

    ctx.font = "18px system-ui, -apple-system, Segoe UI, Roboto";
    for (let i = 0; i < n; i++) {
      const v = values[i];
      const h = Math.round((v / maxV) * (innerH - 30));
      const x = pad + i * (barW + gap);
      const y = pad + (innerH - h);

      ctx.fillRect(x, y, barW, h);
      ctx.globalAlpha = 0.8;
      ctx.fillText(labels[i], x, H - 6);
      ctx.globalAlpha = 1;
    }
  }

  function render(container, entries, week) {
    container.innerHTML = `
      <div class="card">
        <h2>📊 Analytics</h2>
        <div class="row2">
          <div class="pill"><b>Woche:</b> W${week}</div>
          <div class="pill"><b>Einträge:</b> ${entries.length}</div>
        </div>

        <div class="divider"></div>

        <h3>Wochen-XP (letzte 8 Wochen)</h3>
        <canvas id="anChart" width="900" height="260" style="width:100%;height:auto;border-radius:12px;"></canvas>
        <p class="hint" id="anHint">—</p>

        <div class="divider"></div>

        <h3>Top 10 Übungen (Woche)</h3>
        <ul class="list" id="anTop"></ul>
      </div>
    `;

    const map = weekXpMap(entries);
    const weeks = [];
    for (let w = Math.max(1, week - 7); w <= week; w++) weeks.push(w);
    const labels = weeks.map(w => `W${w}`);
    const values = weeks.map(w => map[w] || 0);

    drawBars(container.querySelector("#anChart"), labels, values);
    const max = Math.max(...values), min = Math.min(...values);
    container.querySelector("#anHint").textContent = `Max: ${max} XP • Min: ${min} XP`;

    const top = topExercises(entries, week, 10);
    const ul = container.querySelector("#anTop");
    ul.innerHTML = top.length ? "" : `<li>—</li>`;
    top.forEach(([name, xp], i) => {
      const li = document.createElement("li");
      li.innerHTML = `<div class="entryRow"><div style="min-width:0;"><b>${i + 1}.</b> ${name}</div><span class="badge">${Math.round(xp)} XP</span></div>`;
      ul.appendChild(li);
    });
  }

  window.IronQuestAnalytics = { render };
})();
