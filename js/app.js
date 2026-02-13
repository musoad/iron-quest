// js/app.js ✅ FULL WORKING ORCHESTRATOR (NO MODULES)

(function () {
  const $ = (id) => document.getElementById(id);

  function setActiveTab(tabId) {
    document.querySelectorAll("nav button").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
    document.querySelectorAll("main section.tab").forEach(s => s.classList.toggle("active", s.id === tabId));
  }

  function levelFromTotalXP(total) {
    let lvl = 1;
    let xp = Math.max(0, Math.round(total || 0));
    const needFor = (l) => Math.round(350 + 120 * l + 32 * Math.pow(l, 1.75));
    while (xp >= needFor(lvl) && lvl < 999) {
      xp -= needFor(lvl);
      lvl++;
    }
    return { lvl };
  }

  async function getEntries() {
    const all = await window.IronQuestDB.getAllEntries();
    // sort newest first
    return all.sort((a, b) => (a.date < b.date ? 1 : -1) || ((b.id || 0) - (a.id || 0)));
  }

  async function addEntry(entry) {
    await window.IronQuestDB.addEntry(entry);
  }

  async function deleteEntry(id) {
    await window.IronQuestDB.deleteEntry(id);
  }

  function renderDashboard(container, entries, week) {
    const today = window.IronQuestProgression.isoDate(new Date());
    const todayXP = entries.filter(e => e.date === today).reduce((s, e) => s + Number(e.xp || 0), 0);
    const weekXP = entries.filter(e => Number(e.week) === Number(week)).reduce((s, e) => s + Number(e.xp || 0), 0);
    const totalXP = entries.reduce((s, e) => s + Number(e.xp || 0), 0);

    const streak = window.IronQuestProgression.computeStreak(entries);
    const mut = window.IronQuestProgression.mutationForWeek(week);
    const reward = window.IronQuestProgression.rewardActive(week) ? "✅ +5% aktiv" : "—";

    const lv = levelFromTotalXP(totalXP);

    container.innerHTML = `
      <div class="card">
        <h2>⚔ Dashboard</h2>
        <div class="row2">
          <div class="pill"><b>Startdatum:</b> <span id="startShow">${window.IronQuestProgression.getStartDate()}</span></div>
          <div class="pill"><b>Woche:</b> W${week}</div>
        </div>

        <div class="row2">
          <label>Startdatum ändern
            <input id="startInput" type="date" value="${window.IronQuestProgression.getStartDate()}">
          </label>
          <button id="startSave" type="button" class="secondary">Speichern</button>
        </div>

        <div class="divider"></div>

        <div class="row2">
          <div class="pill"><b>Heute XP:</b> ${todayXP}</div>
          <div class="pill"><b>Woche XP:</b> ${weekXP}</div>
        </div>

        <div class="row2">
          <div class="pill"><b>Gesamt XP:</b> ${totalXP}</div>
          <div class="pill"><b>Level:</b> ${lv.lvl}</div>
        </div>

        <div class="row2">
          <div class="pill"><b>Streak:</b> ${streak} Tage</div>
          <div class="pill"><b>Reward:</b> ${reward}</div>
        </div>

        <div class="pill"><b>Mutation W${week}:</b> ${mut.name}</div>

        <div class="divider"></div>

        <h3>Letzte Einträge</h3>
        <ul class="list" id="recent"></ul>
      </div>
    `;

    // start save
    container.querySelector("#startSave").addEventListener("click", async () => {
      const v = container.querySelector("#startInput").value;
      if (!v) return alert("Bitte Datum wählen.");
      window.IronQuestProgression.setStartDate(v);
      alert("Startdatum gespeichert ✅");
      await renderAll();
    });

    const recent = container.querySelector("#recent");
    const last = entries.slice(0, 8);
    recent.innerHTML = last.length ? "" : "<li>—</li>";
    last.forEach(e => {
      const li = document.createElement("li");
      li.innerHTML = `<div class="entryRow"><div style="min-width:0;">
        <b>${e.date}</b> • ${e.exercise}<div class="hint">${e.type} • ${e.xp} XP</div>
      </div></div>`;
      recent.appendChild(li);
    });
  }

  function renderLog(container, entries, week) {
    const exList = window.IronQuestExercises.list;

    const today = window.IronQuestProgression.isoDate(new Date());
    const options = exList.map(e => `<option value="${e.name}">${e.name}</option>`).join("");

    container.innerHTML = `
      <div class="card">
        <h2>📝 Log</h2>

        <div class="row2">
          <label>Datum
            <input id="lDate" type="date" value="${today}">
          </label>
          <div class="pill"><b>Woche:</b> <span id="lWeek">W${week}</span></div>
        </div>

        <label>Übung
          <select id="lEx">${options}</select>
        </label>
        <div class="hint" id="lDesc">—</div>

        <div class="row2">
          <label>Tatsächliche Sets
            <input id="lSets" inputmode="numeric" value="4">
          </label>
          <label>Tatsächliche Reps
            <input id="lReps" inputmode="numeric" value="10">
          </label>
        </div>

        <div class="row2">
          <label>Minuten (nur NEAT)
            <input id="lMin" inputmode="numeric" value="60">
          </label>
          <div class="pill"><b>XP:</b> <span id="lXP">0</span></div>
        </div>

        <label>Notizen
          <input id="lNote" placeholder="optional">
        </label>

        <button id="lSave" type="button">Speichern</button>

        <div class="divider"></div>

        <h3>Alle Einträge</h3>
        <ul class="list" id="lList"></ul>
      </div>
    `;

    const elDate = container.querySelector("#lDate");
    const elWeek = container.querySelector("#lWeek");
    const elEx = container.querySelector("#lEx");
    const elDesc = container.querySelector("#lDesc");
    const elSets = container.querySelector("#lSets");
    const elReps = container.querySelector("#lReps");
    const elMin = container.querySelector("#lMin");
    const elXP = container.querySelector("#lXP");

    function updateUI() {
      const dateISO = elDate.value || today;
      const w = window.IronQuestProgression.currentWeek(dateISO);
      elWeek.textContent = "W" + w;

      const ex = window.IronQuestExercises.getByName(elEx.value);
      if (!ex) return;

      elDesc.textContent = `${ex.type} • ${ex.desc} • Empf: ${ex.rec.sets}×${ex.rec.reps}`;

      // adaptive recommendation (soft)
      const adj = window.IronQuestProgression.adaptiveAdjust(entries, w);
      const recSets = Math.max(1, (Number(ex.rec.sets || 0) + adj.setDelta));
      const recReps = Math.max(1, (Number(ex.rec.reps || 0) + adj.repDelta));

      // set defaults if empty
      if (!elSets.value) elSets.value = String(recSets);
      if (!elReps.value) elReps.value = String(recReps);

      // multipliers
      const streak = window.IronQuestProgression.computeStreak(entries);
      const streakMult = window.IronQuestProgression.streakMultiplier(streak);
      const mutationMult = window.IronQuestProgression.mutationMultiplier(ex.type, w);
      const rewardMult = window.IronQuestProgression.rewardActive(w) ? 1.05 : 1.0;
      const skillMult = 1.0; // Skilltree-Multiplikator kann später hier rein

      const sets = Number(elSets.value || 0);
      const reps = Number(elReps.value || 0);
      const minutes = Number(elMin.value || 0);

      const calc = window.IronQuestXP.computeXP({
        exercise: ex.name,
        type: ex.type,
        sets, reps, minutes,
        streakMult, skillMult, mutationMult, rewardMult
      });

      elXP.textContent = String(calc.xp);

      // NEAT/Rest UI
      elMin.closest("label").style.display = (ex.type === "NEAT") ? "block" : "none";
      elSets.closest("label").style.display = (ex.type === "Rest" || ex.type === "NEAT") ? "none" : "block";
      elReps.closest("label").style.display = (ex.type === "Rest" || ex.type === "NEAT") ? "none" : "block";
    }

    elDate.addEventListener("change", updateUI);
    elEx.addEventListener("change", () => {
      const ex = window.IronQuestExercises.getByName(elEx.value);
      if (ex) {
        elSets.value = String(ex.rec.sets || "");
        elReps.value = String(ex.rec.reps || "");
      }
      updateUI();
    });
    [elSets, elReps, elMin].forEach(x => x.addEventListener("input", updateUI));

    updateUI();

    container.querySelector("#lSave").addEventListener("click", async () => {
      const dateISO = elDate.value || today;
      const w = window.IronQuestProgression.currentWeek(dateISO);
      const ex = window.IronQuestExercises.getByName(elEx.value);
      if (!ex) return alert("Übung fehlt.");

      const sets = Number(elSets.value || 0);
      const reps = Number(elReps.value || 0);
      const minutes = Number(elMin.value || 0);

      // multipliers
      const streak = window.IronQuestProgression.computeStreak(entries);
      const streakMult = window.IronQuestProgression.streakMultiplier(streak);
      const mutationMult = window.IronQuestProgression.mutationMultiplier(ex.type, w);
      const rewardMult = window.IronQuestProgression.rewardActive(w) ? 1.05 : 1.0;
      const skillMult = 1.0;

      const calc = window.IronQuestXP.computeXP({
        exercise: ex.name,
        type: ex.type,
        sets, reps, minutes,
        streakMult, skillMult, mutationMult, rewardMult
      });

      const pr = window.IronQuestXP.checkAndSetPR({ exercise: ex.name, sets, reps });

      await addEntry({
        date: dateISO,
        week: w,
        exercise: ex.name,
        type: ex.type,
        sets,
        reps,
        minutes,
        notes: container.querySelector("#lNote").value || "",
        xp: calc.xp
      });

      if (pr.isPR) alert(`NEW PR! 🔥 Volume ${pr.now} (vorher ${pr.best})`);
      else alert("Gespeichert ✅");

      await renderAll();
    });

    // List entries
    const ul = container.querySelector("#lList");
    ul.innerHTML = entries.length ? "" : "<li>—</li>";
    entries.forEach(e => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="entryRow">
          <div style="min-width:0;">
            <b>${e.date}</b> (W${e.week}) • ${e.exercise}
            <div class="hint">${e.type} • ${e.xp} XP • Sets ${e.sets || 0} • Reps ${e.reps || 0}</div>
          </div>
          <button class="danger" data-del="${e.id}" type="button" style="width:auto;">Delete</button>
        </div>
      `;
      ul.appendChild(li);
    });

    ul.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.getAttribute("data-del"));
        const ok = confirm("Eintrag löschen?");
        if (!ok) return;
        await deleteEntry(id);
        await renderAll();
      });
    });
  }

  async function getAllData() {
    const entries = await window.IronQuestDB.getAllEntries();
    const health = (function () { try { return JSON.parse(localStorage.getItem("ironquest_health_v1") || "{}"); } catch { return {}; } })();
    const misc = {
      startDate: window.IronQuestProgression.getStartDate()
    };
    return { entries, health, misc };
  }

  async function importAllData(data) {
    if (!data || !Array.isArray(data.entries)) throw new Error("Ungültige Backup-Struktur");
    await window.IronQuestDB.clearAllEntries();
    for (const e of data.entries) {
      const copy = { ...e };
      delete copy.id; // id autoIncrement
      await window.IronQuestDB.addEntry(copy);
    }
    if (data.health) localStorage.setItem("ironquest_health_v1", JSON.stringify(data.health));
    if (data.misc?.startDate) window.IronQuestProgression.setStartDate(data.misc.startDate);
  }

  async function renderAll() {
    const entries = await getEntries();
    const today = window.IronQuestProgression.isoDate(new Date());
    const week = window.IronQuestProgression.currentWeek(today);

    // reward update based on entries
    window.IronQuestProgression.updateRewardFromEntries(entries, week);

    // Player info
    const totalXP = entries.reduce((s, e) => s + Number(e.xp || 0), 0);
    const lv = levelFromTotalXP(totalXP);
    const streak = window.IronQuestProgression.computeStreak(entries);

    $("playerInfo").innerHTML = `<div class="pill"><b>Level:</b> ${lv.lvl}</div>
      <div class="pill"><b>Streak:</b> ${streak}</div>
      <div class="pill"><b>Total XP:</b> ${totalXP}</div>`;

    // Render each tab content
    renderDashboard($("dashboard"), entries, week);
    renderLog($("log"), entries, week);
    window.IronQuestAnalytics.render($("analytics"), entries, week);
    window.IronQuestHealth.render($("health"));
    window.IronQuestBoss.render($("boss"), entries, week, addEntry);
    window.IronQuestChallenges.render($("challenge"));
    await window.IronQuestBackup.render($("backup"), getAllData, importAllData);
  }

  function wireTabs() {
    document.querySelectorAll("nav button").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.tab;
        setActiveTab(id);
      });
    });
    setActiveTab("dashboard");
  }

  async function init() {
    try {
      wireTabs();
      await window.IronQuestDB.init();

      // SW update button
      const upBtn = $("updateBtn");
      if (upBtn && "serviceWorker" in navigator) {
        navigator.serviceWorker.register("sw.js");
        upBtn.addEventListener("click", async () => {
          try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) await reg.update();
            alert("Update geprüft ✅ (ggf. App schließen/neu öffnen)");
          } catch {
            alert("Update fehlgeschlagen.");
          }
        });
      }

      await renderAll();
    } catch (e) {
      console.error(e);
      alert("Anzeige Fehler in JS.");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
