/* IRON QUEST – app.js (classic, iOS-safe)
   ✅ Tabs funktionieren
   ✅ Rendert alle Screens
   ✅ Log: echte Einträge + empfohlene Sets/Reps + tatsächliche Sets/Reps
   ✅ Health: Puls + Blutdruck (falls health.js das anbietet)
   ✅ Service Worker Update Button
*/
(function () {
  const { $, isoDate } = window.IQ;

  function setStatus(text){
    const el = document.getElementById("appStatus");
    if (el) el.textContent = text;
  }

  function setupTabs(){
    const buttons = Array.from(document.querySelectorAll("nav button[data-tab]"));
    const tabs = Array.from(document.querySelectorAll("main .tab"));

    function activate(id){
      buttons.forEach(b => b.classList.toggle("active", b.getAttribute("data-tab") === id));
      tabs.forEach(t => t.classList.toggle("active", t.id === id));
    }

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-tab]");
      if (!btn) return;
      activate(btn.getAttribute("data-tab"));
    });

    activate("dashboard");
  }

  function mutationMultMap(week){
    // mutations.js liefert evtl. window.IronQuestMutations.getForWeek(week)
    // fallback neutral:
    const m = { Mehrgelenkig:1, Unilateral:1, Core:1, Conditioning:1, Komplexe:1, NEAT:1, Rest:1 };
    if (window.IronQuestMutations?.multByTypeForWeek) {
      return window.IronQuestMutations.multByTypeForWeek(week);
    }
    return m;
  }

  function skillMultMap(){
    // skilltree.js kann z.B. window.IronQuestSkilltree.multByType() anbieten – fallback 1
    if (window.IronQuestSkilltree?.multByType) return window.IronQuestSkilltree.multByType();
    return { Mehrgelenkig:1, Unilateral:1, Core:1, Conditioning:1, Komplexe:1, NEAT:1, Rest:1 };
  }

  function computeTotals(entries){
    const today = isoDate(new Date());
    let total = 0, todayXP = 0;
    for (const e of entries){
      total += e.xp || 0;
      if (e.date === today) todayXP += e.xp || 0;
    }
    return { total, todayXP };
  }

  function renderDashboard(state){
    const host = document.getElementById("dashboard");
    if (!host) return;

    const totals = computeTotals(state.entries);
    const lvl = window.IronQuestProgression.levelFromTotalXp(totals.total);
    const title = window.IronQuestProgression.titleForLevel(lvl.lvl);

    const thr = window.IronQuestProgression.thresholds();
    const dayStars =
      totals.todayXP >= thr.three ? "⭐⭐⭐" :
      totals.todayXP >= thr.two ? "⭐⭐" :
      totals.todayXP >= thr.one ? "⭐" : "—";

    const streak = window.IronQuestStreak?.compute ? window.IronQuestStreak.compute(state.entries) : { current:0, best:0 };

    host.innerHTML = `
      <div class="card">
        <h2>Player</h2>
        <div class="row2">
          <div class="pill"><b>Level:</b> ${lvl.lvl} (${title})</div>
          <div class="pill"><b>Total XP:</b> ${totals.total}</div>
        </div>
        <div class="row2">
          <div class="pill"><b>Heute:</b> ${totals.todayXP} XP</div>
          <div class="pill"><b>Stars:</b> ${dayStars}</div>
        </div>
        <div class="row2">
          <div class="pill"><b>Streak:</b> ${streak.current} 🔥</div>
          <div class="pill"><b>Best:</b> ${streak.best}</div>
        </div>
      </div>

      <div class="card">
        <h2>Update</h2>
        <button id="btnUpdate" type="button">Update</button>
        <p class="hint">Wenn du am Home-Screen bist: Tippe „Update“, dann App neu öffnen.</p>
      </div>
    `;

    host.querySelector("#btnUpdate")?.addEventListener("click", async () => {
      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg?.waiting) reg.waiting.postMessage({ type:"SKIP_WAITING" });
          await reg?.update();
        }
        alert("Update angestoßen ✅ Bitte App einmal komplett schließen & neu öffnen.");
      } catch {
        alert("Update nicht möglich.");
      }
    });
  }

  function renderLog(state){
    const host = document.getElementById("log");
    if (!host) return;

    const exList = window.IronQuestExercises.list();

    host.innerHTML = `
      <div class="card">
        <h2>Neuer Eintrag</h2>

        <label>Datum
          <input id="logDate" type="date" value="${isoDate(new Date())}">
        </label>

        <label>Übung
          <select id="logExercise"></select>
        </label>

        <div class="row2">
          <label>Sätze
            <input id="logSets" type="number" min="0" step="1" inputmode="numeric" placeholder="z.B. 4">
          </label>
          <label>Reps
            <input id="logReps" type="number" min="0" step="1" inputmode="numeric" placeholder="z.B. 10">
          </label>
        </div>

        <label id="rowMinutes" class="hide">Walking Minuten
          <input id="logMinutes" type="number" min="1" step="1" inputmode="numeric" value="60">
        </label>

        <div class="pill" id="logHint">—</div>
        <button id="logSave" type="button">Speichern</button>
      </div>

      <div class="card">
        <h2>Einträge</h2>
        <ul id="logList"></ul>
        <button id="logClear" class="danger" type="button">Alle Einträge löschen</button>
      </div>
    `;

    const sel = host.querySelector("#logExercise");
    exList.forEach(ex => {
      const opt = document.createElement("option");
      opt.value = ex.name;
      opt.textContent = `${ex.name}`;
      sel.appendChild(opt);
    });

    const updateHint = () => {
      const dateISO = host.querySelector("#logDate").value || isoDate(new Date());
      const week = window.IronQuestXP.weekFor(dateISO);
      const exName = host.querySelector("#logExercise").value;
      const type = window.IronQuestExercises.typeFor(exName);
      const desc = window.IronQuestExercises.descFor(exName);
      const rec = window.IronQuestExercises.recommended(type, week);

      const isWalk = type === "NEAT";
      host.querySelector("#rowMinutes").classList.toggle("hide", !isWalk);

      // default sets/reps when empty
      const setsEl = host.querySelector("#logSets");
      const repsEl = host.querySelector("#logReps");

      if (!isWalk && rec.setsDefault && !setsEl.value) setsEl.value = String(rec.setsDefault);
      if (!isWalk && rec.repsDefault && !repsEl.value) repsEl.value = String(rec.repsDefault);

      const ctx = {
        mutationMultByType: mutationMultMap(week),
        skillMultByType: skillMultMap()
      };

      const minutes = Number(host.querySelector("#logMinutes").value || 0);
      const out = window.IronQuestXP.calcXP(
        { exercise: exName, week, minutes },
        ctx
      );

      host.querySelector("#logHint").innerHTML =
        `<b>${type}</b> • ${desc}<br>` +
        `Empf: ${rec.setsText} / ${rec.repsText} • XP: <b>${out.xp}</b>`;
    };

    host.querySelector("#logDate").addEventListener("change", updateHint);
    host.querySelector("#logExercise").addEventListener("change", updateHint);
    host.querySelector("#logMinutes").addEventListener("input", updateHint);

    updateHint();

    const renderList = () => {
      const ul = host.querySelector("#logList");
      ul.innerHTML = "";
      const entries = state.entries.slice().sort((a,b)=> (a.date<b.date?1:-1) || ((b.id||0)-(a.id||0)));

      if (!entries.length){
        ul.innerHTML = `<li class="hint">Noch keine Einträge.</li>`;
        return;
      }

      entries.forEach(e => {
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="entryRow">
            <div style="min-width:0;">
              <div class="entryTitle"><b>${e.date}</b> • ${e.exercise}</div>
              <div class="hint">${e.type} • ${e.detail || ""}</div>
            </div>
            <div class="row" style="margin:0; align-items:flex-start;">
              <span class="badge">${e.xp} XP</span>
              <button class="danger" data-del="${e.id}" type="button">Del</button>
            </div>
          </div>
        `;
        ul.appendChild(li);
      });

      ul.querySelectorAll("button[data-del]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = Number(btn.getAttribute("data-del"));
          if (!confirm("Eintrag löschen?")) return;
          await window.IronQuestDB.delete(id);
          document.dispatchEvent(new CustomEvent("iq:refresh"));
        });
      });
    };

    renderList();

    host.querySelector("#logSave").addEventListener("click", async () => {
      const dateISO = host.querySelector("#logDate").value || isoDate(new Date());
      const week = window.IronQuestXP.weekFor(dateISO);

      const exName = host.querySelector("#logExercise").value;
      const type = window.IronQuestExercises.typeFor(exName);
      const rec = window.IronQuestExercises.recommended(type, week);

      const sets = Number(host.querySelector("#logSets").value || 0);
      const reps = Number(host.querySelector("#logReps").value || 0);
      const minutes = Number(host.querySelector("#logMinutes").value || 0);

      const ctx = {
        mutationMultByType: mutationMultMap(week),
        skillMultByType: skillMultMap()
      };

      const out = window.IronQuestXP.calcXP({ exercise: exName, week, minutes }, ctx);

      let detail =
        `Empf: ${rec.setsText}/${rec.repsText} • ` +
        (type === "NEAT" ? `Min: ${minutes}` : `Ist: ${sets}x${reps}`);

      // PR Hook (optional)
      let prNote = "";
      if (window.IronQuestPR?.checkAndStore) {
        const pr = window.IronQuestPR.checkAndStore({ date:dateISO, exercise:exName, sets, reps, minutes, xp:out.xp });
        if (pr?.isPR) prNote = ` • NEW PR ✅ (${pr.metric})`;
      }

      await window.IronQuestDB.add({
        date: dateISO,
        week,
        exercise: exName,
        type,
        detail: detail + prNote,
        xp: out.xp
      });

      alert(`Gespeichert: +${out.xp} XP ✅`);
      document.dispatchEvent(new CustomEvent("iq:refresh"));
    });

    host.querySelector("#logClear").addEventListener("click", async () => {
      if (!confirm("Wirklich ALLE Einträge löschen?")) return;
      await window.IronQuestDB.clear();
      document.dispatchEvent(new CustomEvent("iq:refresh"));
    });
  }

  async function buildState(){
    const entries = await window.IronQuestDB.getAll();
    const today = isoDate(new Date());
    const curWeek = window.IronQuestXP.weekFor(today);

    const attr = window.IronQuestAttributes.sum(entries);
    return { entries, today, curWeek, attr };
  }

  async function renderAll(){
    const state = await buildState();

    // Header quick info
    const totals = computeTotals(state.entries);
    const lvl = window.IronQuestProgression.levelFromTotalXp(totals.total);
    const title = window.IronQuestProgression.titleForLevel(lvl.lvl);
    const pi = document.getElementById("playerInfo");
    if (pi) pi.innerHTML = `<span class="hint">Lv ${lvl.lvl} (${title}) • ${totals.total} XP • W${state.curWeek}</span>`;

    renderDashboard(state);
    renderLog(state);

    // Other screens (wenn vorhanden)
    window.IronQuestSkilltree?.render?.(state);
    window.IronQuestAnalytics?.render?.(state);
    window.IronQuestHealth?.render?.(state);      // Puls + Blutdruck sind in health.js
    window.IronQuestBoss?.render?.(state);
    window.IronQuestChallenges?.render?.(state);
    window.IronQuestBackup?.render?.(state);

    setStatus("OK");
  }

  function setupServiceWorker(){
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // iOS: wenn neuer SW übernimmt
      setStatus("Updated ✅ (bitte App neu öffnen)");
    });
  }

  async function init(){
    setupTabs();
    setupServiceWorker();

    // Global refresh event
    document.addEventListener("iq:refresh", async () => {
      try { await renderAll(); } catch (e) { setStatus("ERROR"); }
    });

    try {
      await renderAll();
    } catch (e) {
      console.error(e);
      setStatus("ERROR");
      alert("Anzeige Fehler in JS.");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
