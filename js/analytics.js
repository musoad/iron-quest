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
        <p class="hint">Dein System ist stabil. Jetzt ist es ein echtes RPG.</p>
      </div>

      <div class="card">
        <h2>Challenge Start</h2>
        <p class="hint">Startdatum bestimmt Woche 1 (auch rückwirkend). Änderung wirkt sofort.</p>
        <label>Startdatum</label>
        <input id="startDateInput" type="date" value="${start}">
        <div class="btnRow">
          <button class="primary" id="startSave">Speichern</button>
          <button class="danger" id="startReset">Heute als Start</button>
        </div>
      </div>

      <div id="attrMount"></div>
    `;

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
  const plan = window.IronQuestExercises?.TRAINING_PLAN;
  const allExercises = window.IronQuestExercises?.EXERCISES || [];
  const entries = await window.IronDB.getAllEntries();
  entries.sort((a,b)=> (a.date < b.date ? 1 : -1));

  const today = window.Utils.isoDate(new Date());
  const dayDefault = 1;

  el.innerHTML = `
    <div class="card">
      <h2>Log</h2>
      <p class="hint">Trainingstag per Dropdown wählen (1–5). Tag-Preview zeigt alle Übungen. Danach Übung wählen & speichern.</p>

      <div class="card">
        <h2>Neuer Eintrag</h2>

        <div class="row2">
          <div>
            <label>Datum</label>
            <input id="lDate" type="date" value="${today}">
          </div>
          <div>
            <label>Trainingstag</label>
            <select id="lDay"></select>
          </div>
        </div>

        <div class="card" id="dayPreviewCard">
          <h2 id="dayTitle">Tag-Preview</h2>
          <div class="hint" id="dayHint">—</div>
          <ul class="list" id="dayPreviewList"></ul>
        </div>

        <label>Übung</label>
        <select id="lExercise"></select>

        <div class="pill" id="lDesc"><b>Ausführung:</b> —</div>

        <div class="row2">
          <div class="pill" id="lRec"><b>Empfohlen:</b> —</div>
          <div class="pill" id="lType"><b>Typ:</b> —</div>
        </div>

        <div class="row2">
          <div>
            <label>Sätze (geleistet)</label>
            <input id="lSets" type="number" step="1" placeholder="z. B. 4">
          </div>
          <div>
            <label>Wdh pro Satz (geleistet)</label>
            <input id="lReps" type="number" step="1" placeholder="z. B. 8">
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

  // Day dropdown
  const daySel = el.querySelector("#lDay");
  for (let d=1; d<=5; d++){
    const name = plan?.days?.[d]?.name ? `Tag ${d}: ${plan.days[d].name}` : `Tag ${d}`;
    const opt = document.createElement("option");
    opt.value = String(d);
    opt.textContent = name;
    if (d === dayDefault) opt.selected = true;
    daySel.appendChild(opt);
  }

  const exSel = el.querySelector("#lExercise");
  const recEl = el.querySelector("#lRec");
  const typeEl = el.querySelector("#lType");
  const volEl = el.querySelector("#lVol");
  const xpEl  = el.querySelector("#lXp");
  const descEl= el.querySelector("#lDesc");

  const previewTitle = el.querySelector("#dayTitle");
  const previewHint  = el.querySelector("#dayHint");
  const previewList  = el.querySelector("#dayPreviewList");

  function exercisesForDay(day){
    return allExercises.filter(x => Number(x.day||0) === Number(day) && x.type !== "Joggen");
  }

  function rebuildPreview(){
    const day = Number(daySel.value || 1);
    const list = exercisesForDay(day);

    previewTitle.textContent = plan?.days?.[day]?.name ? `Tag ${day}: ${plan.days[day].name}` : `Tag ${day}`;
    previewHint.textContent = `Übungs-Pool: ${list.length} Übungen. (Du musst nicht alle machen – wähle effizient.)`;

    previewList.innerHTML = "";
    if (!list.length){
      previewList.innerHTML = `<li>—</li>`;
      return;
    }

    list.forEach(ex=>{
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="itemTop">
          <div style="min-width:0;">
            <b>${ex.name}</b>
            <div class="hint">${ex.description || "—"}</div>
            <div class="hint">Empfohlen: ${ex.recSets}×${ex.recReps} • Typ: ${ex.type}</div>
          </div>
          <button class="secondary" data-pick="${ex.name}">Wählen</button>
        </div>
      `;
      previewList.appendChild(li);
    });

    // pick buttons
    previewList.querySelectorAll("[data-pick]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const name = btn.getAttribute("data-pick");
        exSel.value = name;
        recalc();
        // optional: scroll to inputs
        el.querySelector("#lSets").focus();
      });
    });
  }

  function rebuildExerciseOptions(){
    const day = Number(daySel.value || 1);
    const list = exercisesForDay(day);

    exSel.innerHTML = "";
    list.forEach(ex=>{
      const opt = document.createElement("option");
      opt.value = ex.name;
      opt.textContent = ex.name;
      exSel.appendChild(opt);
    });

    if (!list.length){
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Keine Übungen für diesen Tag";
      exSel.appendChild(opt);
    }
  }

  function getSelected(){
    const name = exSel.value;
    return allExercises.find(x=>x.name === name);
  }

  function recalc(){
    const ex = getSelected();
    const sets = Number(el.querySelector("#lSets").value || 0);
    const reps = Number(el.querySelector("#lReps").value || 0);

    if (!ex){
      recEl.innerHTML = `<b>Empfohlen:</b> —`;
      typeEl.innerHTML = `<b>Typ:</b> —`;
      descEl.innerHTML = `<b>Ausführung:</b> —`;
      volEl.innerHTML = `<b>Volumen:</b> —`;
      xpEl.innerHTML = `<b>XP:</b> —`;
      return { ex:null, sets, reps, xp:0 };
    }

    recEl.innerHTML = `<b>Empfohlen:</b> ${ex.recSets}×${ex.recReps}`;
    typeEl.innerHTML = `<b>Typ:</b> ${ex.type}`;
    descEl.innerHTML = `<b>Ausführung:</b> ${ex.description || "—"}`;

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

  // Events
  daySel.addEventListener("change", ()=>{
    rebuildExerciseOptions();
    rebuildPreview();
    recalc();
  });
  exSel.addEventListener("change", recalc);
  el.querySelector("#lSets").addEventListener("input", recalc);
  el.querySelector("#lReps").addEventListener("input", recalc);

  // initial build
  rebuildExerciseOptions();
  rebuildPreview();
  recalc();

  el.querySelector("#lSave").addEventListener("click", async ()=>{
    const { ex, sets, reps, xp } = recalc();
    if (!ex) return;
    if (!sets || !reps) return;

    const date = el.querySelector("#lDate").value || today;
    const week = window.IronQuestProgression.getWeekNumberFor(date);

    const entry = {
      date,
      week,
      type: ex.type,
      exercise: ex.name,
      detail: `Rec ${ex.recSets}×${ex.recReps} • Did ${sets}×${reps} • Day ${daySel.value}`,
      xp
    };

    await window.IronDB.addEntry(entry);

    // RPG Stats mitleveln
    if (window.IronQuestAttributes?.addXPForEntry){
      window.IronQuestAttributes.addXPForEntry(entry);
    }

    await renderLog(el);
  });

  // list render
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

    // events
    daySel.addEventListener("change", rebuildExerciseOptions);
    exSel.addEventListener("change", recalc);
    el.querySelector("#lSets").addEventListener("input", recalc);
    el.querySelector("#lReps").addEventListener("input", recalc);

    rebuildExerciseOptions();

    el.querySelector("#lSave").addEventListener("click", async ()=>{
      const { ex, sets, reps, xp } = recalc();
      if (!ex) return;
      if (!sets || !reps) return;

      const date = el.querySelector("#lDate").value || today;
      const week = window.IronQuestProgression.getWeekNumberFor(date);

      const entry = {
        date,
        week,
        type: ex.type,
        exercise: ex.name,
        detail: `Rec ${ex.recSets}×${ex.recReps} • Did ${sets}×${reps} • Day ${daySel.value}`,
        xp
      };

      await window.IronDB.addEntry(entry);

      // RPG Stats mitleveln
      if (window.IronQuestAttributes?.addXPForEntry){
        window.IronQuestAttributes.addXPForEntry(entry);
      }

      await renderLog(el);
    });

    // list render
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
