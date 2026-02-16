(() => {
  "use strict";

  function pace(minutes, km) {
    const m = Math.max(0, Number(minutes || 0));
    const d = Math.max(0, Number(km || 0));
    if (d <= 0) return null;
    const p = m / d;
    const mm = Math.floor(p);
    const ss = Math.round((p - mm) * 60);
    return `${mm}:${String(ss).padStart(2, "0")} min/km`;
  }

  async function addRun({ date, km, minutes, xp }) {
    await window.DB.add("runs", { date, km, minutes, xp });
  }

  async function getRuns() {
    const rows = await window.DB.getAll("runs");
    rows.sort((a,b) => (a.date < b.date ? 1 : -1));
    return rows;
  }

  function drawTrend(canvas, runs) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    if (!runs.length) return;

    const vals = runs.slice(0, 10).reverse().map(r => Number(r.km || 0));
    const maxV = Math.max(1, ...vals);
    const pad = 24;
    const innerW = W - pad*2;
    const innerH = H - pad*2;
    const stepX = innerW / Math.max(1, vals.length - 1);

    ctx.globalAlpha = 0.35;
    ctx.fillRect(pad, H-pad, innerW, 2);
    ctx.globalAlpha = 1;

    ctx.beginPath();
    vals.forEach((v,i) => {
      const x = pad + i*stepX;
      const y = pad + (innerH - (v/maxV)*(innerH-10));
      if (i === 0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }

  async function renderRunning(el) {
    const today = window.Utils.isoDate(new Date());
    const runs = await getRuns();

    el.innerHTML = `
      <div class="card">
        <h2>Joggen</h2>
        <p class="hint">Distanz + Zeit → Pace + XP. Läufe bleiben lokal (IndexedDB).</p>

        <div class="card">
          <h2>Neuer Lauf</h2>
          <label>Datum</label>
          <input id="rDate" type="date" value="${today}">

          <div class="row2">
            <div>
              <label>Distanz (km)</label>
              <input id="rKm" type="number" step="0.01" placeholder="z. B. 5">
            </div>
            <div>
              <label>Zeit (min)</label>
              <input id="rMin" type="number" step="1" placeholder="z. B. 30">
            </div>
          </div>

          <div class="row2">
            <div class="pill" id="rPace"><b>Pace:</b> —</div>
            <div class="pill" id="rXp"><b>XP:</b> —</div>
          </div>

          <button class="primary" id="rSave">Speichern</button>
        </div>

        <div class="card">
          <h2>Trend (km – letzte 10)</h2>
          <canvas id="rChart" width="900" height="240"></canvas>
        </div>

        <div class="card">
          <h2>Letzte Läufe</h2>
          <ul class="list" id="rList"></ul>
        </div>
      </div>
    `;

    const kmEl = el.querySelector("#rKm");
    const minEl = el.querySelector("#rMin");
    const paceEl = el.querySelector("#rPace");
    const xpEl = el.querySelector("#rXp");
    const saveBtn = el.querySelector("#rSave");

    function recalc() {
      const km = Number(kmEl.value || 0);
      const minutes = Number(minEl.value || 0);
      const p = pace(minutes, km);
      const baseXp = window.IronQuestXP.jogXP(km, minutes);
      paceEl.innerHTML = `<b>Pace:</b> ${p || "—"}`;
      xpEl.innerHTML = `<b>XP:</b> ${baseXp || "—"}`;
      return { km, minutes, xp: baseXp };
    }

    kmEl.addEventListener("input", recalc);
    minEl.addEventListener("input", recalc);

    saveBtn.addEventListener("click", async () => {
      const { km, minutes, xp } = recalc();
      if (km <= 0 || minutes <= 0) return;

      const date = el.querySelector("#rDate").value || today;

      await addRun({ date, km, minutes, xp });

      // optional: auch als XP Entry ins Log
      const week = window.IronQuestProgression.getWeekNumber();
      await window.IronDB.addEntry({
        date,
        week,
        type: "Jogging",
        exercise: "Jogging",
        detail: `${km} km • ${minutes} min • ${pace(minutes, km)}`,
        xp
      });

      await renderRunning(el);
    });

    // chart + list
    drawTrend(el.querySelector("#rChart"), runs);

    const ul = el.querySelector("#rList");
    if (!runs.length) ul.innerHTML = `<li>—</li>`;
    else {
      ul.innerHTML = "";
      runs.slice(0, 20).forEach(r => {
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="itemTop">
            <div><b>${r.date}</b> • ${r.km} km • ${r.minutes} min • ${pace(r.minutes, r.km) || "—"}</div>
            <span class="badge">${Math.round(r.xp || 0)} XP</span>
          </div>
        `;
        ul.appendChild(li);
      });
    }
  }

  window.IronQuestRunning = { renderRunning };
})();
