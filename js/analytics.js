(() => {
  "use strict";

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

    ctx.globalAlpha = 0.35;
    ctx.fillRect(pad, H-pad, innerW, 2);
    ctx.globalAlpha = 1;

    for (let i=0;i<n;i++){
      const v = values[i];
      const h = Math.round((v/maxV) * (innerH-20));
      const x = pad + i*(bw+gap);
      const y = pad + (innerH - h);
      ctx.fillRect(x, y, bw, h);
      ctx.globalAlpha = 0.85;
      ctx.font = "16px system-ui";
      ctx.fillText(labels[i], x, H-8);
      ctx.globalAlpha = 1;
    }
  }

  function weekXpMap(entries){
    const m = {};
    for (const e of entries){
      const w = Number(e.week||0);
      if (!w) continue;
      m[w] = (m[w]||0) + (e.xp||0);
    }
    return m;
  }

  async function renderDashboard(el){
    const start = window.IronQuestProgression.getStartDate();
    el.innerHTML = `
      <div class="card">
        <h2>Dashboard</h2>
        <p class="hint">Dein System ist stabil. Jetzt bauen wir Feature-Power oben drauf.</p>
      </div>

      <div class="card">
        <h2>Challenge Start</h2>
        <p class="hint">Startdatum bestimmt Woche 1 (auch rückwirkend). Änderung wirkt sofort auf Weekly/Boss/Challenge.</p>
        <label>Startdatum</label>
        <input id="startDateInput" type="date" value="${start}">
        <div class="btnRow">
          <button class="primary" id="startSave">Speichern</button>
          <button class="danger" id="startReset">Heute als Start</button>
        </div>
      </div>

      <div id="attrMount"></div>
    `;

    // Attribute RPG Panel
    if (window.IronQuestAttributes?.renderAttributes){
      window.IronQuestAttributes.renderAttributes(el.querySelector("#attrMount"));
    }

    el.querySelector("#startSave").onclick = () => {
      const v = el.querySelector("#startDateInput").value;
      if (!v) return;
      localStorage.setItem("ironquest_startdate_v5", v);
      alert("Startdatum gespeichert ✅");
    };
    el.querySelector("#startReset").onclick = () => {
      const today = window.Utils.isoDate(new Date());
      localStorage.setItem("ironquest_startdate_v5", today);
      el.querySelector("#startDateInput").value = today;
      alert("Startdatum auf heute gesetzt ✅");
    };
  }

  async function renderLog(el){
    const exercises = window.IronQuestExercises.EXERCISES;
    const entries = await window.IronDB.getAllEntries();
    entries.sort((a,b)=> (a.date < b.date ? 1 : -1));

    const today = window.Utils.isoDate(new Date());

    el.innerHTML = `
      <div class="card">
        <h2>Log</h2>
        <p class="hint">Übung auswählen, empfohlene Sets/Reps sehen, tatsächliche Werte eingeben, XP live berechnen und speichern.</p>

        <div class="card">
          <h2>Neuer Eintrag</h2>
          <label>Datum</label>
          <input id="lDate" type="date" value="${today}">

          <label>Übung</label>
          <select id="lExercise"></select>

          <div class="row2">
            <div class="pill" id="lRec"><b>Empfohlen:</b> —</div>
            <div class="pill" id="lType"><b>Typ:</b> —</div>
          </div>

          <div class="row2">
            <div>
              <label>Sets (geleistet)</label>
              <input id="lSets" type="number" step="1" placeholder="z. B. 4">
            </div>
            <div>
              <label>Reps pro Set (geleistet)</label>
              <input id="lReps" type="number" step="1" placeholder="z. B. 6">
            </div>
          </div>

          <div class="row2">
            <div class="pill" id="lVol"><b>Volumen:</b> —</div>
            <div class="pill" id="lXp"><b>XP:</b> —</div>
          </div>

          <button class="primary" id="lSave">Speichern</button>
        </div>

        <div class="card">
          <div class="row2">
            <button class="danger" id="logClear">Alle löschen</button>
            <div class="pill"><b>Anzahl:</b> ${entries.length}</div>
          </div>
          <ul class="list" id="logList"></ul>
        </div>
      </div>
    `;

    const sel = el.querySelector("#lExercise");
    exercises
      .filter(x=>x.type !== "Joggen") // Joggen läuft über Jogging Tab
      .forEach(ex=>{
        const opt = document.createElement("option");
        opt.value = ex.name;
        opt.textContent = ex.name;
        sel.appendChild(opt);
      });

    const recEl = el.querySelector("#lRec");
    const typeEl = el.querySelector("#lType");
    const volEl = el.querySelector("#lVol");
    const xpEl  = el.querySelector("#lXp");

    function getSelected(){
      const name = sel.value;
      return exercises.find(x=>x.name === name);
    }

    function recalc(){
      const ex = getSelected();
      const sets = Number(el.querySelector("#lSets").value || 0);
      const reps = Number(el.querySelector("#lReps").value || 0);

      recEl.innerHTML = `<b>Empfohlen:</b> ${ex.recSets}×${ex.recReps}`;
      typeEl.innerHTML = `<b>Typ:</b> ${ex.type}`;

      const vol = Math.max(0, sets*reps);
      volEl.innerHTML = `<b>Volumen:</b> ${vol}`;

      const xp = window.IronQuestXP.calcExerciseXP({
        type: ex.type,
        recSets: ex.recSets,
        recReps: ex.recReps,
        sets,
        reps,
        entries
      });

      xpEl.innerHTML = `<b>XP:</b> ${xp || "—"}`;
      return { ex, sets, reps, xp };
    }

    sel.addEventListener("change", recalc);
    el.querySelector("#lSets").addEventListener("input", recalc);
    el.querySelector("#lReps").addEventListener("input", recalc);
    recalc();

    el.querySelector("#lSave").addEventListener("click", async ()=>{
      const { ex, sets, reps, xp } = recalc();
      if (!sets || !reps) return;

      const date = el.querySelector("#lDate").value || today;
      const week = window.IronQuestProgression.getWeekNumberFor(date);

      const entry = {
        date,
        week,
        type: ex.type,
        exercise: ex.name,
        detail: `Rec ${ex.recSets}×${ex.recReps} • Did ${sets}×${reps}`,
        xp
      };

      await window.IronDB.addEntry(entry);

      // RPG Stats mitleveln
      if (window.IronQuestAttributes?.addXPForEntry){
        window.IronQuestAttributes.addXPForEntry(entry);
      }

      await renderLog(el);
    });

    // log list
    const ul = el.querySelector("#logList");
    if (!entries.length) ul.innerHTML = `<li>—</li>`;
    else {
      ul.innerHTML = "";
      entries.slice(0, 250).forEach(e=>{
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="itemTop">
            <div>
              <b>${e.date}</b> • W${e.week||"?"} • ${e.exercise || e.type || "Entry"}
              <div class="hint">${e.detail || ""}</div>
            </div>
            <span class="badge">${Math.round(e.xp||0)} XP</span>
          </div>
        `;
        ul.appendChild(li);
      });
    }

    el.querySelector("#logClear").addEventListener("click", async ()=>{
      await window.IronDB.clearAllEntries();
      alert("Log gelöscht ✅");
      await renderLog(el);
    });
  }

  async function renderAnalytics(el){
    const entries = await window.IronDB.getAllEntries();
    const today = window.Utils.isoDate(new Date());
    const curWeek = window.IronQuestProgression.getWeekNumberFor(today);
    const map = weekXpMap(entries);

    const weeks = [];
    for (let w = Math.max(1, curWeek-7); w <= curWeek; w++) weeks.push(w);
    const vals = weeks.map(w=>map[w]||0);
    const labels = weeks.map(w=>`W${w}`);

    el.innerHTML = `
      <div class="card">
        <h2>Analytics</h2>
        <p class="hint">Wochen-XP (letzte 8 Wochen)</p>
        <canvas id="anChart" width="900" height="260"></canvas>
      </div>
    `;

    drawBars(el.querySelector("#anChart"), labels, vals);
  }

  window.IronQuestAnalytics = { renderDashboard, renderLog, renderAnalytics };
})();
