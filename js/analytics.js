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
      .filter(x=>x.type !== "Jogge
