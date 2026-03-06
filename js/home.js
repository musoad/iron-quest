(() => {
  "use strict";

  const CLASSES = [
    { key: "none", label: "Unassigned" },
    { key: "berserker", label: "Berserker" },
    { key: "assassin", label: "Assassin" },
    { key: "guardian", label: "Guardian" },
    { key: "ranger", label: "Ranger" },
    { key: "monarch", label: "Monarch" }
  ];
  const GENDERS = [
    { key: "male", label: "Male" },
    { key: "female", label: "Female" }
  ];

  function safe(v, fb){ return String(v ?? "").trim() || fb; }
  function esc(s){ return String(s||"").replace(/[&<>\"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m])); }
  function avatarPath(cls, gender) {
    const c = String(cls || "none").toLowerCase();
    const safeClass = (c === "unassigned") ? "unassigned" : (c === "none" ? "unassigned" : c);
    const g = String(gender || "male").toLowerCase() === "female" ? "female" : "male";
    return `assets/avatars/${safeClass}_${g}.png`;
  }
  function getProfile() {
    const name = safe(window.IronQuestProfile?.getName?.(), "Hunter");
    const rawClass = window.IronQuestClasses?.get?.() || window.IronQuestProfile?.getClass?.() || "none";
    const cls = String(rawClass || "none").toLowerCase();
    const startDate = window.IronQuestProgression?.getStartDate?.() || window.IronQuestProfile?.getStartDate?.() || window.Utils?.isoDate?.(new Date()) || "";
    const gender = window.IronQuestProfile?.getGender?.() || "male";
    return { name, cls, startDate, gender };
  }

  async function getTodaySummary(){
    const today = window.Utils?.isoDate?.(new Date()) || String(new Date()).slice(0,10);
    try{
      const entries = await window.IronDB.getAllEntries();
      const todays = entries.filter(e => String(e.date||"").slice(0,10) === today);
      const xp = todays.reduce((s,e)=>s + Number(e.xp||0), 0);
      const last = entries.slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")))[0];
      return {
        today,
        count: todays.length,
        xp,
        lastName: (last && (last.exercise || last.type)) || "—",
        lastDate: (last && String(last.date||"").slice(0,10)) || "—",
        recent: getRecentExercises(entries, 8),
        names: todays.map(e => String((e.exercise||e.name||e.type||"")).trim()).filter(Boolean)
      };
    }catch{
      return { today, count:0, xp:0, lastName:"—", lastDate:"—", recent:[], names:[] };
    }
  }

  function getRecentExercises(entries, max){
    const seen = new Set();
    const out = [];
    const sorted = (entries||[]).slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
    for(const e of sorted){
      const n = String(e.exercise || e.type || "").trim();
      if(!n || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
      if(out.length >= (max||6)) break;
    }
    return out;
  }

  function getStats() {
    const hs = window.IronQuestHunterStats?.getSnapshot?.();
    if(hs && hs.stats){
      return hs.order.map(k=>({ k, label: hs.labels[k], v: hs.stats[k].level }));
    }
    return [
      { k: "STR", label: "Strength", v: 1 },
      { k: "END", label: "Endurance", v: 1 },
      { k: "AGI", label: "Agility", v: 1 },
      { k: "INT", label: "Intellect", v: 1 },
      { k: "PER", label: "Perception", v: 1 },
      { k: "LCK", label: "Luck", v: 1 },
    ];
  }

  function classAura(clsKey) {
    switch ((clsKey || "none").toLowerCase()) {
      case "berserker": return "rgba(255,90,30,.40)";
      case "assassin": return "rgba(165,90,255,.40)";
      case "guardian": return "rgba(90,150,255,.40)";
      case "ranger": return "rgba(90,255,150,.35)";
      case "monarch": return "rgba(80,220,255,.35)";
      default: return "rgba(140,160,170,.30)";
    }
  }

  async function render(root) {
    if(!root) root = document.getElementById("home");
    if(!root) return;

    const p = getProfile();
    const snap = await window.IronQuestState.getSnapshot();
    const stats = getStats();
    const today = await getTodaySummary();
    const clsPreview = snap.classState || window.IronQuestClasses.preview(snap.progression.level);
    const activeClass = clsPreview.active || window.IronQuestClasses.meta("none");
    const locked = !clsPreview.unlocked;
    const clsSafe = locked ? "none" : (p.cls || "none");
    const clsLabel = (CLASSES.find(c => c.key === clsSafe)?.label) || activeClass.name || "Unassigned";

    let todayPlan = [];
    try{
      const stP = window.IronQuestPlans?.getState?.();
      const pPlan = stP && stP.plans ? (stP.plans.find(x=>x.id===stP.activeId) || stP.plans[0]) : null;
      const dayKey = window.IronQuestPlans?.dayKeyForDate?.(new Date()) || "mon";
      const assigned = (pPlan && pPlan.week && Array.isArray(pPlan.week[dayKey])) ? pPlan.week[dayKey] : [];
      const doneSet = new Set((today.names||[]).map(x=>String(x).toLowerCase()));
      todayPlan = assigned.map(name=>{
        const it = (pPlan?.items||[]).find(x=>x.name===name);
        return { name, sets: it?.sets || "", reps: it?.reps || "", done: doneSet.has(String(name).toLowerCase()) };
      }).filter(x=>x.name);
    }catch(_){ }

    const gateReady = snap.week.daysLogged >= 2;
    const bossReady = snap.week.daysLogged >= 3;
    const eqBon = window.IronQuestEquipment?.bonuses?.() || { globalXp:1, gateDmg:1, runXp:1 };

    root.innerHTML = `
      <div class="hq-wrap">
        <div class="hq-card slCard" style="--aura:${classAura(clsSafe)}">
          <div class="slScan"></div>
          <div class="hq-top">
            <div class="hq-avatar">
              <img id="hqAvatarImg" alt="Avatar" src="${avatarPath(clsSafe, p.gender)}" />
              <div class="hq-aura"></div>
            </div>
            <div class="hq-identity">
              <div class="slEyebrow">Hunter Status</div>
              <div class="hq-name" id="hqName">${esc(p.name)}</div>
              <div class="hq-sub">
                <span class="pill">${esc(clsLabel)}</span>
                <span class="pill">Rank ${esc(String(snap.rank))}</span>
                <span class="pill">Lvl ${esc(String(snap.progression.level))}</span>
              </div>
              <div class="hq-xp">
                <div class="hq-xp-row">
                  <span class="muted">XP</span>
                  <span class="muted">${snap.progression.xp} / ${snap.progression.nextNeed}</span>
                </div>
                <div class="hq-xpbar"><div class="hq-xpfill" style="width:${Math.round((snap.progression.xp/Math.max(1,snap.progression.nextNeed))*100)}%"></div></div>
              </div>
            </div>
          </div>

          <div class="hq-actions">
            <button class="hq-act primary" id="hqGoLog">➕ Log</button>
            <button class="hq-act" id="hqGoRun">🏃 Run</button>
            <button class="hq-act" id="hqGoHistory">🗓️ History</button>
            <button class="hq-act" id="hqGoPlans">🧾 Plans</button>
          </div>

          <div class="hq-mini">
            <div class="hq-miniCard"><div class="hq-miniT">Today</div><div class="hq-miniV">${today.count} logs • +${today.xp} XP</div><div class="hq-miniS">Streak: <b>${snap.streak}</b> days</div></div>
            <div class="hq-miniCard"><div class="hq-miniT">Week Progress</div><div class="hq-miniV">${snap.week.daysLogged}/${snap.week.workoutGoal} sessions</div><div class="miniBar"><div class="miniFill" style="width:${Math.round(snap.week.workoutPct*100)}%"></div></div></div>
            <div class="hq-miniCard"><div class="hq-miniT">XP Goal</div><div class="hq-miniV">${Math.round(snap.totals.weekXp)} / ${snap.week.xpGoal}</div><div class="miniBar"><div class="miniFill" style="width:${Math.round(snap.week.xpPct*100)}%"></div></div></div>
            <div class="hq-miniCard"><div class="hq-miniT">Next Unlock</div><div class="hq-miniV">${locked ? `Class at Lv ${clsPreview.unlockLevel}` : `Boss & loot`}</div><div class="hq-miniS">${locked ? `${clsPreview.unlockLevel - snap.progression.level} levels left` : `Keep training`}</div></div>
          </div>

          <div class="hq-grid">
            <div class="hq-section">
              <div class="hq-section-title">Class System</div>
              <div class="classCard ${locked?'locked':''}">
                <div class="classTop"><b>${esc(activeClass.name || 'Unassigned')}</b><span class="pill small">${locked?'Locked':'Active'}</span></div>
                <div class="muted">${esc(activeClass.desc || '')}</div>
                <div class="hq-chips classPerks">${(activeClass.perks||[]).map(x=>`<span class="hq-chip static">${esc(x)}</span>`).join("") || `<span class="hq-chip static">No perk yet</span>`}</div>
              </div>
            </div>
            <div class="hq-section">
              <div class="hq-section-title">Gate / Boss Link</div>
              <div class="systemBox compact">
                <div class="sysTitle">[ PROGRESSION ]</div>
                <div class="sysBody">Gate: ${gateReady ? 'Ready' : 'Need 2 training days'}\nBoss: ${bossReady ? 'Ready' : 'Need 3 training days'}\nEquipment Gate Bonus: x${Number(eqBon.gateDmg||1).toFixed(2)}</div>
              </div>
              <div class="hq-actions split">
                <button class="hq-act" id="hqGoGates">🌀 Gates</button>
                <button class="hq-act" id="hqGoBoss">👑 Boss</button>
                <button class="hq-act" id="hqGoEquipment">🧰 Equipment</button>
              </div>
            </div>
          </div>

          ${todayPlan.length ? `
            <div class="hq-plan">
              <div class="hq-planT">Today Plan</div>
              <div class="hq-planSub muted">${todayPlan.filter(x=>x.done).length} / ${todayPlan.length} done</div>
              <div class="hq-planList">
                ${todayPlan.map(it=>`<div class="hq-planRow ${it.done?"done":""}" data-plan="${esc(it.name)}" data-sets="${esc(it.sets)}" data-reps="${esc(it.reps)}"><div class="hq-planName">${esc(it.name)} ${(it.sets||it.reps)?`<span class="pill small">${esc(it.sets)}x${esc(it.reps)}</span>`:""}</div><div class="hq-planBtns">${it.done?`<span class="pill small">done</span>`:`<button class="btn small" data-plog>Log</button>`}</div></div>`).join("")}
              </div>
            </div>` : ``}

          ${today.recent.length ? `
            <div class="hq-recent">
              <div class="hq-recentT">Quick Log (1 tap)</div>
              <div class="hq-chips">${today.recent.map(n=>`<button class="hq-chip" data-qlog="${esc(n)}">${esc(n)}</button>`).join("")}</div>
              <div class="hint">Tap an exercise to jump into Log with it preselected.</div>
            </div>` : ``}

          <div class="hq-grid">
            <div class="hq-section">
              <div class="hq-section-title">Profile</div>
              <label class="hq-field"><span>Name</span><input id="hqNameInput" type="text" maxlength="24" value="${esc(p.name)}"></label>
              <div class="hq-row">
                <label class="hq-field"><span>Gender</span><select id="hqGender">${GENDERS.map(g => `<option value="${g.key}" ${g.key===p.gender?"selected":""}>${g.label}</option>`).join("")}</select></label>
                <label class="hq-field"><span>Class</span><select id="hqClass" ${locked?"disabled":""}>${locked?`<option value="none" selected>Unassigned</option>`:CLASSES.map(c=>`<option value="${c.key}" ${c.key===clsSafe?"selected":""}>${c.label}</option>`).join("")}</select></label>
              </div>
              <label class="hq-field"><span>Start date</span><input id="hqStart" type="date" value="${esc(p.startDate)}"></label>
              <div class="hint">${locked ? `Class locked until Level ${clsPreview.unlockLevel}.` : `Your class perks are active.`}</div>
            </div>
            <div class="hq-section">
              <div class="hq-section-title">Stats</div>
              <div class="hq-stats">${stats.map(s => `<div class="hq-stat"><div class="hq-stat-k">${s.k}</div><div class="hq-stat-v">${s.v}</div><div class="hq-stat-l">${esc(s.label)}</div></div>`).join("")}</div>
              <div class="hint">Stats steigen logisch durch Training. Mehrgelenkig→STR, Unilateral→AGI, Core/Conditioning→END, Komplexe→INT, Konsistenz→LCK.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const go = (tab)=>window.IronQuestNav?.go?.(tab);
    const setIntentLog = (exerciseName, sets, reps)=>{
      window.IronQuestIntent = window.IronQuestIntent || {};
      window.IronQuestIntent.log = {
        date: window.Utils?.isoDate?.(new Date()) || "",
        exercise: exerciseName || "",
        sets: sets || "",
        reps: reps || ""
      };
    };

    root.querySelector("#hqGoLog")?.addEventListener("click", ()=>{ setIntentLog(""); go("log"); });
    root.querySelector("#hqGoRun")?.addEventListener("click", ()=>go("run"));
    root.querySelector("#hqGoHistory")?.addEventListener("click", ()=>go("history"));
    root.querySelector("#hqGoPlans")?.addEventListener("click", ()=>go("plans"));
    root.querySelector("#hqGoGates")?.addEventListener("click", ()=>go("gates"));
    root.querySelector("#hqGoBoss")?.addEventListener("click", ()=>go("boss"));
    root.querySelector("#hqGoEquipment")?.addEventListener("click", ()=>go("equipment"));

    root.querySelectorAll("[data-qlog]").forEach(btn=>btn.addEventListener("click", ()=>{ setIntentLog(btn.getAttribute("data-qlog")||""); go("log"); }));
    root.querySelectorAll("[data-plog]").forEach(btn=>btn.addEventListener("click", ()=>{
      const row = btn.closest("[data-plan]");
      setIntentLog(row?.getAttribute("data-plan")||"", row?.getAttribute("data-sets")||"", row?.getAttribute("data-reps")||"");
      go("log");
    }));

    const nameInput = root.querySelector("#hqNameInput");
    const genderSel = root.querySelector("#hqGender");
    const classSel = root.querySelector("#hqClass");
    const startInput = root.querySelector("#hqStart");
    const avatarImg = root.querySelector("#hqAvatarImg");
    const nameLabel = root.querySelector("#hqName");

    const applyAvatar = () => {
      const cls = classSel?.value || "none";
      const gender = genderSel?.value || "male";
      if (avatarImg) avatarImg.src = avatarPath(cls, gender);
      const card = root.querySelector('.hq-card');
      if (card) card.style.setProperty('--aura', classAura(cls));
    };

    nameInput?.addEventListener("input", () => {
      const v = safe(nameInput.value.trim(), "Hunter");
      window.IronQuestProfile?.setName?.(v);
      if (nameLabel) nameLabel.textContent = v;
    });
    genderSel?.addEventListener("change", () => {
      window.IronQuestProfile?.setGender?.(genderSel.value);
      applyAvatar();
    });
    classSel?.addEventListener("change", () => {
      window.IronQuestClasses?.set?.(classSel.value);
      window.IronQuestProfile?.setClass?.(classSel.value);
      applyAvatar();
      render(root);
    });
    startInput?.addEventListener("change", () => {
      window.IronQuestProgression?.setStartDate?.(startInput.value);
      window.IronQuestProfile?.setStartDate?.(startInput.value);
    });

    if(locked && window.IronQuestClasses?.get && window.IronQuestClasses?.set){
      if(window.IronQuestClasses.get() !== "none") window.IronQuestClasses.set("none");
    }
  }

  window.IronQuestHome = { render };
})();
