/* =========================
   IRON QUEST – app.js (FULL, iOS-safe)
   - Tabs + Render aller Panels
   - Kein dashboard.js nötig
========================= */
(function () {
  const TABS = ["dashboard","log","skills","analytics","health","boss","challenge","backup"];

  function setActiveTab(tabId) {
    TABS.forEach(id => {
      const sec = document.getElementById(id);
      if (sec) sec.classList.toggle("active", id === tabId);
    });

    document.querySelectorAll("nav button[data-tab]").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-tab") === tabId);
    });

    // optional hash
    try { location.hash = tabId; } catch {}
  }

  async function renderDashboard() {
    const el = document.getElementById("dashboard");
    if (!el) return;

    const db = window.IronQuestDB;
    const xp = window.IronQuestXP;
    const prog = window.IronQuestProgression;

    const entries = db ? await db.getAllEntries() : [];
    const totalXP = entries.reduce((s,e)=>s+(Number(e.xp)||0),0);

    const levelInfo = prog?.levelFromXP ? prog.levelFromXP(totalXP) : { level: 1, title: "Anfänger" };
    const streak = IQ.computeStreak(entries);

    el.innerHTML = `
      <h2>Dashboard</h2>

      <div class="card">
        <div><b>Total XP:</b> ${totalXP}</div>
        <div><b>Level:</b> ${levelInfo.level ?? 1} ${levelInfo.title ? "• "+levelInfo.title : ""}</div>
        <div><b>Streak:</b> ${streak.streak} Tage • <b>Best:</b> ${streak.best}</div>
      </div>

      <div class="card">
        <h3>Quick Actions</h3>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button id="goLog">Neuer Eintrag</button>
          <button id="goHealth" class="secondary">Health eintragen</button>
          <button id="goBoss" class="secondary">Boss ansehen</button>
        </div>
      </div>

      <div class="hint">Wenn hier Werte fehlen: prüfen ob DB/XP/Progression geladen sind.</div>
    `;

    el.querySelector("#goLog").onclick = () => { setActiveTab("log"); IQ.emit("iq:tabChanged","log"); };
    el.querySelector("#goHealth").onclick = () => { setActiveTab("health"); IQ.emit("iq:tabChanged","health"); };
    el.querySelector("#goBoss").onclick = () => { setActiveTab("boss"); IQ.emit("iq:tabChanged","boss"); };
  }

  async function renderLog() {
    const el = document.getElementById("log");
    if (!el) return;

    const db = window.IronQuestDB;
    const ex = window.IronQuestExercises;
    const xp = window.IronQuestXP;

    if (!db || !ex || !xp) {
      el.innerHTML = `<h2>Log</h2><p class="hint">Fehlende Module: DB/Exercises/XP.</p>`;
      return;
    }

    el.innerHTML = `
      <h2>Log</h2>

      <div class="card">
        <label>Datum
          <input id="logDate" type="date" value="${IQ.nowISO()}">
        </label>

        <div id="exercisePicker"></div>

        <div class="grid2" style="margin-top:10px;">
          <label>Sets
            <input id="logSets" type="number" min="0" step="1" inputmode="numeric" value="3">
          </label>
          <label>Reps
            <input id="logReps" type="number" min="0" step="1" inputmode="numeric" value="10">
          </label>
        </div>

        <label style="margin-top:10px;">Notiz (optional)
          <input id="logNote" type="text" placeholder="z.B. RPE 8, gute Form…">
        </label>

        <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
          <button id="saveEntry">Speichern</button>
          <button id="refreshList" class="secondary">Refresh</button>
        </div>

        <div class="hint" id="xpPreview" style="margin-top:10px;">XP: —</div>
      </div>

      <div class="card">
        <h3>Letzte Einträge</h3>
        <div id="entryList" class="hint">Lade…</div>
      </div>
    `;

    // Exercise picker from module
    const pickerHost = el.querySelector("#exercisePicker");
    ex.renderExercisePicker(pickerHost);

    const dateEl = el.querySelector("#logDate");
    const setsEl = el.querySelector("#logSets");
    const repsEl = el.querySelector("#logReps");
    const noteEl = el.querySelector("#logNote");
    const previewEl = el.querySelector("#xpPreview");

    function calcPreview() {
      const selected = ex.getSelectedExercise();
      if (!selected) { previewEl.textContent = "XP: —"; return; }
      const sets = Number(setsEl.value || 0);
      const reps = Number(repsEl.value || 0);
      const val = xp.calculateXP(selected, { sets, reps });
      previewEl.textContent = `XP: ${val} • ${selected.name} (${selected.type})`;
    }

    setsEl.oninput = calcPreview;
    repsEl.oninput = calcPreview;
    IQ.on("iq:exerciseChanged", calcPreview);
    calcPreview();

    async function renderList() {
      const listHost = el.querySelector("#entryList");
      const entries = await db.getAllEntries();
      const sorted = entries.slice().sort((a,b) => (b.id||0)-(a.id||0));
      const last = sorted.slice(0, 20);

      if (!last.length) {
        listHost.innerHTML = `<div class="hint">Noch keine Einträge.</div>`;
        return;
      }

      listHost.innerHTML = last.map(e => `
        <div class="card" style="margin:10px 0;">
          <div><b>${e.date}</b> • ${e.exercise}</div>
          <div class="hint">${e.type} • ${e.details || ""}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <span><b>${e.xp}</b> XP</span>
            <button data-del="${e.id}" class="danger" style="width:auto;">Delete</button>
          </div>
        </div>
      `).join("");

      listHost.querySelectorAll("button[data-del]").forEach(btn => {
        btn.onclick = async () => {
          const id = Number(btn.getAttribute("data-del"));
          if (!confirm("Eintrag löschen?")) return;
          await db.deleteEntry(id);
          IQ.toast("Gelöscht ✅");
          IQ.emit("iq:dataChanged");
        };
      });
    }

    el.querySelector("#refreshList").onclick = renderList;

    el.querySelector("#saveEntry").onclick = async () => {
      const selected = ex.getSelectedExercise();
      if (!selected) return alert("Bitte Übung wählen.");

      const date = dateEl.value || IQ.nowISO();
      const sets = Number(setsEl.value || 0);
      const reps = Number(repsEl.value || 0);
      const note = (noteEl.value || "").trim();

      const xpVal = xp.calculateXP(selected, { sets, reps });

      const week = window.IronQuestProgression?.getWeekForDate
        ? window.IronQuestProgression.getWeekForDate(date)
        : 1;

      await db.addEntry({
        date,
        week,
        exercise: selected.name,
        type: selected.type,
        xp: xpVal,
        details: `Sets:${sets} Reps:${reps}${note ? " • " + note : ""}`
      });

      IQ.toast(`Gespeichert +${xpVal} XP ✅`);
      noteEl.value = "";
      IQ.emit("iq:dataChanged");
    };

    await renderList();
  }

  async function renderSkills() {
    const el = document.getElementById("skills");
    if (!el) return;
    const mod = window.IronQuestSkilltree;
    if (!mod?.renderSkilltreePanel) {
      el.innerHTML = `<h2>Skilltree</h2><p class="hint">Skilltree Modul fehlt.</p>`;
      return;
    }
    await mod.renderSkilltreePanel(el);
  }

  async function renderAnalytics() {
    const el = document.getElementById("analytics");
    if (!el) return;
    const mod = window.IronQuestAnalytics;
    if (!mod?.renderAnalyticsPanel) {
      el.innerHTML = `<h2>Analytics</h2><p class="hint">Analytics Modul fehlt.</p>`;
      return;
    }
    await mod.renderAnalyticsPanel(el);
  }

  async function renderHealth() {
    const el = document.getElementById("health");
    if (!el) return;
    const mod = window.IronQuestHealth;
    if (!mod?.renderHealthPanel) {
      el.innerHTML = `<h2>Health</h2><p class="hint">Health Modul fehlt.</p>`;
      return;
    }
    await mod.renderHealthPanel(el);
  }

  async function renderBoss() {
    const el = document.getElementById("boss");
    if (!el) return;
    const mod = window.IronQuestBoss;
    if (!mod?.renderBossPanel) {
      el.innerHTML = `<h2>Boss</h2><p class="hint">Boss Modul fehlt.</p>`;
      return;
    }
    await mod.renderBossPanel(el);
  }

  async function renderChallenge() {
    const el = document.getElementById("challenge");
    if (!el) return;
    const mod = window.IronQuestChallenges;
    if (!mod?.renderChallengePanel) {
      el.innerHTML = `<h2>Challenge</h2><p class="hint">Challenge Modul fehlt.</p>`;
      return;
    }
    await mod.renderChallengePanel(el);
  }

  async function renderBackup() {
    const el = document.getElementById("backup");
    if (!el) return;
    const mod = window.IronQuestBackup;
    if (!mod?.renderBackupPanel) {
      el.innerHTML = `<h2>Backup</h2><p class="hint">Backup Modul fehlt.</p>`;
      return;
    }
    mod.renderBackupPanel(el);
  }

  async function renderPlayerInfo() {
    const box = document.getElementById("playerInfo");
    if (!box) return;

    const db = window.IronQuestDB;
    const prog = window.IronQuestProgression;

    const entries = db ? await db.getAllEntries() : [];
    const totalXP = entries.reduce((s,e)=>s+(Number(e.xp)||0),0);
    const lv = prog?.levelFromXP ? prog.levelFromXP(totalXP) : { level: 1, title: "Anfänger" };
    const st = IQ.computeStreak(entries);

    box.innerHTML = `
      <div class="hint">
        <b>Level:</b> ${lv.level ?? 1} ${lv.title ? "• "+lv.title : ""} |
        <b>XP:</b> ${totalXP} |
        <b>Streak:</b> ${st.streak} (Best ${st.best})
      </div>
    `;
  }

  async function renderAll(activeTab) {
    await renderPlayerInfo();

    // Render only active tab quickly + keep others ready if needed
    // (iOS performance friendly)
    const t = activeTab || "dashboard";
    if (t === "dashboard") await renderDashboard();
    if (t === "log") await renderLog();
    if (t === "skills") await renderSkills();
    if (t === "analytics") await renderAnalytics();
    if (t === "health") await renderHealth();
    if (t === "boss") await renderBoss();
    if (t === "challenge") await renderChallenge();
    if (t === "backup") await renderBackup();
  }

  function setupTabs() {
    document.querySelectorAll("nav button[data-tab]").forEach(btn => {
      btn.onclick = async () => {
        const tab = btn.getAttribute("data-tab");
        setActiveTab(tab);
        await renderAll(tab);
      };
    });

    const initial = (location.hash || "#dashboard").replace("#", "");
    setActiveTab(TABS.includes(initial) ? initial : "dashboard");
  }

  function setupSW() {
    // optional update button: if du eins hast, sonst ignorieren
    const updateBtn = document.getElementById("updateBtn");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(console.warn);

      navigator.serviceWorker.addEventListener("message", (e) => {
        if (e.data?.type === "SW_UPDATED") {
          IQ.toast("Update verfügbar ✅ – neu laden");
        }
      });

      if (updateBtn) {
        updateBtn.onclick = async () => {
          const regs = await navigator.serviceWorker.getRegistrations();
          regs.forEach(r => r.update());
          IQ.toast("Update check…");
        };
      }
    }
  }

  async function init() {
    try {
      setupTabs();
      setupSW();

      // Daten-Event: re-render active tab
      IQ.on("iq:dataChanged", async () => {
        const active = document.querySelector("section.tab.active")?.id || "dashboard";
        await renderAll(active);
        // optional: re-render dashboard/playerInfo too
        await renderPlayerInfo();
      });

      // initial render
      const active = document.querySelector("section.tab.active")?.id || "dashboard";
      await renderAll(active);
    } catch (e) {
      console.error(e);
      alert("Anzeige Fehler in JS. (Details in Konsole)");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
