/* =========================
   IRON QUEST v4 PRO – boss.js
   - Boss pro Woche + Checkliste
   - Clear nur wenn Woche aktiv & alle Checks done
   - Speichert State in localStorage
   - Schreibt XP als Entries in DB
   ========================= */

(function () {
  const KEY_BOSS_STATE = "iq_boss_state_v4";
  const KEY_BOSS_CHECKS = "iq_boss_checks_v4";

  const BOSSES = [
    { week: 2, name: "The Foundation Beast", xp: 650, reward: "Titel: Foundation Slayer",
      workout: ["Goblet Squat – 5×10 (3s runter)", "Floor Press – 5×8", "1-Arm Row – 5×10 (Pause oben)", "Pausen strikt 90s"] },
    { week: 4, name: "The Asymmetry Lord", xp: 800, reward: "+1 STA (symbolisch)",
      workout: ["Bulgarian Split Squat – 4×8 je Seite", "1-Arm Row – 4×10 je Seite", "Side Plank – 3×45s je Seite", "Schwache Seite beginnt"] },
    { week: 6, name: "The Core Guardian", xp: 900, reward: "Core Week Bonus (symbolisch)",
      workout: ["Hollow Hold – 4×40s", "Plank Shoulder Taps – 4×30", "Goblet Hold – 3×45s", "Pausen max. 60s"] },
    { week: 8, name: "The Conditioning Reaper", xp: 1100, reward: "+1 END (symbolisch)",
      workout: ["5 Runden: 30s Burpees", "30s Mountain Climbers", "30s High Knees", "Pause 60s – jede Runde gleich stark"] },
    { week: 10, name: "The Iron Champion", xp: 1400, reward: "Titel: Iron Challenger",
      workout: ["Komplex 6 Runden (je 6 Wdh)", "Deadlift → Clean → Front Squat → Push Press", "Hanteln nicht absetzen", "Technik vor Tempo"] },
    { week: 12, name: "FINAL: Iron Overlord", xp: 2400, reward: "Titel: IRON OVERLORD SLAYER",
      workout: ["Goblet Squat – 4×12", "Floor Press – 4×10", "1-Arm Row – 4×10", "Bulgarian Split Squat – 3×8", "Plank – 3×60s"] },
  ];

  function isoDate(d) {
    return new Date(d).toISOString().slice(0, 10);
  }

  function getDB() {
    // Erwartet: window.IronQuestDB mit addMany(), addEntry() etc.
    return window.IronQuestDB || window.DB || null;
  }

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function defaultBossState() {
    const s = {};
    BOSSES.forEach(b => s[b.week] = { cleared: false, clearedAt: null });
    return s;
  }

  function loadBossState() {
    const st = loadJSON(KEY_BOSS_STATE, defaultBossState());
    BOSSES.forEach(b => { st[b.week] ??= { cleared: false, clearedAt: null }; });
    return st;
  }
  function saveBossState(st) { saveJSON(KEY_BOSS_STATE, st); }

  function loadBossChecks() { return loadJSON(KEY_BOSS_CHECKS, {}); }
  function saveBossChecks(st) { saveJSON(KEY_BOSS_CHECKS, st); }

  function bossKey(week, dayISO) { return `${week}|${dayISO}`; }

  function getChecks(week, dayISO) {
    const all = loadBossChecks();
    return all[bossKey(week, dayISO)] || {};
  }
  function setCheck(week, dayISO, idx, value) {
    const all = loadBossChecks();
    const k = bossKey(week, dayISO);
    all[k] ??= {};
    all[k][idx] = !!value;
    saveBossChecks(all);
  }

  function allDone(week, dayISO, len) {
    const c = getChecks(week, dayISO);
    for (let i = 0; i < len; i++) if (!c[i]) return false;
    return true;
  }

  function splitXP(total, n) {
    const base = Math.floor(total / n);
    const rem = total - base * n;
    const arr = Array(n).fill(base);
    arr[n - 1] += rem;
    return arr;
  }

  function render(containerEl, ctx) {
    // ctx erwartet: { currentWeek, todayISO }
    if (!containerEl) return;

    const db = getDB();
    if (!db) {
      containerEl.innerHTML = `<div class="card"><h2>Boss</h2><p class="hint">DB fehlt (IronQuestDB). Bitte db.js prüfen.</p></div>`;
      return;
    }

    const curWeek = Number(ctx?.currentWeek || 1);
    const todayISO = ctx?.todayISO || isoDate(new Date());
    const state = loadBossState();

    const html = BOSSES.map(b => {
      const st = state[b.week] || { cleared: false, clearedAt: null };
      const locked = curWeek !== b.week;
      const checks = getChecks(b.week, todayISO);
      const xpParts = splitXP(b.xp, b.workout.length);
      const canClear = (!locked) && allDone(b.week, todayISO, b.workout.length) && !st.cleared;

      const rows = b.workout.map((line, idx) => {
        const checked = !!checks[idx];
        return `
          <li class="checkRow">
            <label class="checkLine">
              <input type="checkbox" data-boss-week="${b.week}" data-boss-idx="${idx}" ${checked ? "checked" : ""} ${locked ? "disabled" : ""}>
              <span>${line}</span>
            </label>
            <span class="badge">+${xpParts[idx]} XP</span>
          </li>
        `;
      }).join("");

      return `
        <div class="card">
          <h2>W${b.week}: ${b.name}</h2>
          <p class="hint">Reward: ${b.reward} • +${b.xp} XP</p>
          ${st.clearedAt ? `<p class="hint">✅ Cleared am: ${st.clearedAt}</p>` : ""}
          ${locked ? `<p class="hint">🔒 Locked – aktuell W${curWeek}</p>` : `<p class="hint">✅ Woche aktiv</p>`}

          <ul class="checklist">${rows}</ul>

          <button class="btn ${canClear ? "" : "secondary"}" data-boss-clear="${b.week}" ${canClear ? "" : "disabled"}>
            ${st.cleared ? "CLEARED" : "Clear Boss"}
          </button>
        </div>
      `;
    }).join("");

    containerEl.innerHTML = html;

    // Checkbox handler
    containerEl.querySelectorAll('input[data-boss-week]').forEach(cb => {
      cb.addEventListener("change", () => {
        const w = Number(cb.getAttribute("data-boss-week"));
        const idx = Number(cb.getAttribute("data-boss-idx"));
        setCheck(w, todayISO, idx, cb.checked);
        // optional: app rendern
        if (window.IronQuestApp?.renderAll) window.IronQuestApp.renderAll();
      });
    });

    // Clear handler
    containerEl.querySelectorAll('button[data-boss-clear]').forEach(btn => {
      btn.addEventListener("click", async () => {
        const w = Number(btn.getAttribute("data-boss-clear"));
        const boss = BOSSES.find(x => x.week === w);
        if (!boss) return;

        if (curWeek !== w) return alert(`LOCKED. Aktuell W${curWeek}.`);
        if (!allDone(w, todayISO, boss.workout.length)) return alert("Erst alle Checkboxen abhaken!");

        const xpParts = splitXP(boss.xp, boss.workout.length);
        const entries = boss.workout.map((line, idx) => ({
          date: todayISO,
          week: w,
          exercise: `Boss W${w}: ${line}`,
          type: "Boss-Workout",
          detail: `${boss.name} • Reward: ${boss.reward}`,
          xp: xpParts[idx]
        }));

        entries.push({
          date: todayISO,
          week: w,
          exercise: `Bossfight CLEARED: ${boss.name}`,
          type: "Boss",
          detail: `W${w} Clear`,
          xp: 0
        });

        if (typeof db.addMany === "function") await db.addMany(entries);
        else {
          // fallback: einzeln
          for (const e of entries) await db.addEntry(e);
        }

        const st = loadBossState();
        st[w] = { cleared: true, clearedAt: todayISO };
        saveBossState(st);

        alert(`Bossfight cleared! +${boss.xp} XP ✅`);
        if (window.IronQuestApp?.renderAll) window.IronQuestApp.renderAll();
      });
    });
  }

  window.IronQuestBoss = {
    render,
    BOSSES
  };
})();
