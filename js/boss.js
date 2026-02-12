/* IRON QUEST – boss.js (classic)
   ✅ Boss Liste
   ✅ Clear nur in Woche
   ✅ Bei Clear → DB Einträge addMany
*/
(function () {
  const BOSSES = [
    { week: 2, name: "The Foundation Beast", xp: 650, reward: "Titel: Foundation Slayer",
      workout: ["Goblet Squat – 5×10 (3s runter)","DB Floor Press – 5×8","DB Row – 5×10 (Pause oben)","Pause strikt 90s"] },
    { week: 4, name: "The Asymmetry Lord", xp: 800, reward: "+1 STA (Flavor)",
      workout: ["Bulgarian Split Squat – 4×8/Seite","1-Arm Row – 4×10/Seite","Side Plank – 3×45s/Seite","Schwache Seite startet"] },
    { week: 8, name: "The Conditioning Reaper", xp: 1100, reward: "END Boost (Flavor)",
      workout: ["5 Runden: 30s Burpees","30s Mountain Climbers","30s High Knees","Pause 60s"] },
    { week: 12, name: "FINAL: Iron Overlord", xp: 2400, reward: "Titel: IRON OVERLORD SLAYER",
      workout: ["Goblet Squat – 4×12","DB Floor Press – 4×10","1-Arm Row – 4×10","Bulgarian Split Squat – 3×8","Plank – 3×60s"] },
  ];

  const KEY_BOSS = "ironquest_boss_v4";
  const KEY_BOSSCHK = "ironquest_boss_checks_v4";

  function loadJSON(key, fallback){ return window.IQ.loadJSON(key, fallback); }
  function saveJSON(key, v){ return window.IQ.saveJSON(key, v); }

  function defaultBossState(){
    const s = {};
    BOSSES.forEach(b => s[b.week] = { cleared:false, clearedAt:null });
    return s;
  }

  function loadBoss(){ return loadJSON(KEY_BOSS, defaultBossState()); }
  function saveBoss(s){ saveJSON(KEY_BOSS, s); }

  function loadChecks(){ return loadJSON(KEY_BOSSCHK, {}); }
  function saveChecks(s){ saveJSON(KEY_BOSSCHK, s); }

  function checkKey(week, dateISO){ return `${week}|${dateISO}`; }

  function splitXP(total, n){
    const base = Math.floor(total / n);
    const rem = total - base*n;
    const a = Array(n).fill(base);
    a[n-1] += rem;
    return a;
  }

  async function render(state){
    const host = document.getElementById("boss");
    if (!host) return;

    const today = window.IQ.isoDate(new Date());
    const curWeek = state.curWeek;

    const bossState = loadBoss();
    const checks = loadChecks();

    host.innerHTML = `
      <div class="card">
        <h2>Bossfights</h2>
        <p class="hint">Clear nur in der Boss-Woche. Erst Checkliste abhaken.</p>
        <div class="pill"><b>Aktuelle Woche:</b> W${curWeek}</div>
      </div>
      <div id="bossList"></div>
      <div class="card">
        <button id="resetBoss" class="danger" type="button">Boss-Status zurücksetzen</button>
      </div>
    `;

    const list = host.querySelector("#bossList");
    list.innerHTML = "";

    BOSSES.forEach((b) => {
      const st = bossState[b.week] || { cleared:false, clearedAt:null };
      const locked = curWeek !== b.week;
      const k = checkKey(b.week, today);
      const chk = checks[k] || {};
      const xpParts = splitXP(b.xp, b.workout.length);

      const doneAll = b.workout.every((_, idx) => chk[idx] === true);
      const canClear = (!locked && doneAll && !st.cleared);

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>Week ${b.week}: ${b.name}</h3>
        <div class="hint">Reward: ${b.reward} • +${b.xp} XP</div>
        <div class="hint">${locked ? "🔒 Locked" : "✅ Aktiv"} ${st.clearedAt ? `• Cleared: ${st.clearedAt}` : ""}</div>

        <ul class="checklist" style="margin-top:10px;">
          ${b.workout.map((line, idx) => `
            <li class="checkItem">
              <input type="checkbox" data-w="${b.week}" data-i="${idx}" ${chk[idx] ? "checked":""} ${locked ? "disabled":""}/>
              <div class="checkMain">
                <div class="checkTitle">${line}</div>
                <div class="checkSub">${b.name}</div>
              </div>
              <div class="xpBadge">+${xpParts[idx]} XP</div>
            </li>
          `).join("")}
        </ul>

        <button type="button" class="secondary" data-clear="${b.week}" ${canClear ? "" : "disabled"}>
          ${st.cleared ? "CLEARED" : "Clear Boss"}
        </button>
      `;
      list.appendChild(card);
    });

    // checkbox change
    host.querySelectorAll('input[type="checkbox"][data-w]').forEach(cb => {
      cb.addEventListener("change", () => {
        const w = Number(cb.getAttribute("data-w"));
        const i = Number(cb.getAttribute("data-i"));
        const k = checkKey(w, today);
        const all = loadChecks();
        all[k] = all[k] || {};
        all[k][i] = cb.checked;
        saveChecks(all);
        // cheap rerender via custom event
        document.dispatchEvent(new CustomEvent("iq:refresh"));
      });
    });

    // clear boss
    host.querySelectorAll("button[data-clear]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const week = Number(btn.getAttribute("data-clear"));
        if (week !== state.curWeek) return alert("Locked: falsche Woche.");

        const boss = BOSSES.find(x => x.week === week);
        if (!boss) return;

        const k = checkKey(week, today);
        const chk = loadChecks()[k] || {};
        const doneAll = boss.workout.every((_, idx) => chk[idx] === true);
        if (!doneAll) return alert("Erst alle Checkboxen abhaken.");

        const xpParts = splitXP(boss.xp, boss.workout.length);
        const entriesToAdd = boss.workout.map((line, idx) => ({
          date: today,
          week: week,
          exercise: `Boss W${week}: ${line}`,
          type: "Boss-Workout",
          detail: boss.name,
          xp: xpParts[idx],
        }));

        entriesToAdd.push({
          date: today,
          week: week,
          exercise: `Bossfight CLEARED: ${boss.name}`,
          type: "Boss",
          detail: boss.reward,
          xp: 0,
        });

        await window.IronQuestDB.addMany(entriesToAdd);

        const bs = loadBoss();
        bs[week] = { cleared:true, clearedAt: today };
        saveBoss(bs);

        alert(`Boss cleared! +${boss.xp} XP ✅`);
        document.dispatchEvent(new CustomEvent("iq:refresh"));
      });
    });

    host.querySelector("#resetBoss")?.addEventListener("click", () => {
      if (!confirm("Boss-Status & Checks zurücksetzen?")) return;
      localStorage.removeItem(KEY_BOSS);
      localStorage.removeItem(KEY_BOSSCHK);
      document.dispatchEvent(new CustomEvent("iq:refresh"));
    });
  }

  window.IronQuestBoss = { render };
})();
