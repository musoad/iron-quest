(() => {
  "use strict";

  // Hunter Card (mobile-first)

  // Keep Home as the single place for identity & class.
  const CLASSES = [
    { key: "none", label: "Unassigned" },
    { key: "berserker", label: "Berserker" },
    { key: "assassin", label: "Assassin" },
    { key: "guardian", label: "Guardian" },
    { key: "ranger", label: "Ranger" },
    { key: "monarch", label: "Monarch" },
  ];

  const GENDERS = [
    { key: "male", label: "Male" },
    { key: "female", label: "Female" },
  ];

  function safe(v, fallback) {
    return (v === undefined || v === null || v === "") ? fallback : v;
  }

  function avatarPath(clsKey, genderKey) {
    // files live at assets/avatars/<class>_<gender>.png
    // Support both "none" and "unassigned" keys → map to the shipped unassigned_* avatars.
    const c0 = (clsKey || "none").toLowerCase();
    const c = (c0 === "none" || c0 === "unassigned") ? "unassigned" : c0;
    const g = (genderKey || "male").toLowerCase();
    return `assets/avatars/${c}_${g}.png`;
  }

  function getProfile() {
    const name = window.IronQuestProfile?.getName?.() || "Hunter";
    const gender = window.IronQuestProfile?.getGender?.() || "male";
    const startDate = (window.IronQuestProgression?.getStartDate?.() || window.IronQuestProfile?.getStartDate?.() || window.Utils?.isoDate?.(new Date()) || "");
    const cls = window.IronQuestClasses?.get?.() || window.IronQuestProfile?.getClass?.() || "none";
    return { name, cls, startDate, gender };
  }

  async function getTotals() {
    try {
      const entries = await window.IronDB.getAllEntries();
      const totalXp = entries.reduce((s, e) => s + Number(e.xp || 0), 0);
      const lvlObj = window.IronQuestProgression?.levelFromTotalXp?.(totalXp) || { lvl: 1, remainder: totalXp, nextNeed: 100 };
      const lvl = Number(lvlObj.lvl || 1);
      const rank = window.IronQuestHunterRank?.compute?.(lvl, totalXp) || "E";
      const next = Number(lvlObj.nextNeed || 100);
      const into = Number(lvlObj.remainder || 0);
      const pct = Math.max(0, Math.min(100, Math.round((into / Math.max(1, next)) * 100)));
      return { totalXp, lvl, rank, next, into, pct };
    } catch {
      return { totalXp: 0, lvl: 1, rank: "E", next: 100, into: 0, pct: 0 };
    }
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

  async function computeStreak(){
    // streak = consecutive days with >= 1 entry up to today
    const today = window.Utils?.isoDate?.(new Date()) || String(new Date()).slice(0,10);
    try{
      const entries = await window.IronDB.getAllEntries();
      const days = new Set(entries.map(e=>String(e.date||"").slice(0,10)).filter(Boolean));
      let streak = 0;
      let cur = new Date(today + "T00:00:00");
      for(;;){
        const key = window.Utils?.isoDate?.(cur) || cur.toISOString().slice(0,10);
        if(!days.has(key)) break;
        streak++;
        cur.setDate(cur.getDate()-1);
      }
      return streak;
    }catch{ return 0; }
  }

  function getStats() {
    // Prefer the Hunter stats system (derived from your logs) if available.
    const hs = window.IronQuestHunterStats?.getSnapshot?.();
    if(hs && hs.stats){
      return hs.order.map(k=>({ k, label: hs.labels[k], v: hs.stats[k].level }));
    }
    // Fallback
    const base = { STR: 1, END: 1, AGI: 1, INT: 1, PER: 1, LCK: 1 };
    return [
      { k: "STR", label: "Strength" },
      { k: "END", label: "Endurance" },
      { k: "AGI", label: "Agility" },
      { k: "INT", label: "Intellect" },
      { k: "PER", label: "Perception" },
      { k: "LCK", label: "Luck" },
    ].map(x => ({ ...x, v: base[x.k] }));
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

  function htmlEscape(str) {
    return String(str).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  }

  async function render(root) {
    const p = getProfile();
    const snap = window.IronQuestState?.getSnapshot?.();
    const totals = (snap && snap.level) ? (function(){
      const totalXp = Number(snap.totalXp||0);
      const lvl = Number(snap.level.lvl||1);
      const rank = String(snap.rank||"E");
      const next = Number(snap.level.nextNeed||100);
      const into = Number(snap.level.remainder||0);
      const pct = Math.max(0, Math.min(100, Math.round((into / Math.max(1, next)) * 100)));
      return { totalXp, lvl, rank, next, into, pct };
    })() : await getTotals();
    const stats = getStats();
    const today = await getTodaySummary();

    // Today Plan (weekly schedule from Plans) — shown on Home for 1-tap flow
    let todayPlan = [];
    try{
      const stP = window.IronQuestPlans?.getState?.();
      const pPlan = stP && stP.plans ? (stP.plans.find(x=>x.id===stP.activeId) || stP.plans[0]) : null;
      const dayKey = window.IronQuestPlans?.dayKeyForDate?.(new Date()) || "mon";
      const assigned = (pPlan && pPlan.week && Array.isArray(pPlan.week[dayKey])) ? pPlan.week[dayKey] : [];
      const doneSet = new Set((today.names||[]).map(x=>String(x).toLowerCase()));
      todayPlan = assigned.map(name=>{
        const it = (pPlan.items||[]).find(x=>x.name===name);
        return {
          name,
          sets: it?.sets || "",
          reps: it?.reps || "",
          done: doneSet.has(String(name).toLowerCase())
        };
      }).filter(x=>x.name);
    }catch(_){ todayPlan = []; }
    const streak = (snap && typeof snap.streak === "number") ? snap.streak : await computeStreak();

    const locked = totals.lvl < 10;
    const clsSafe = locked ? "none" : (p.cls || "none");
    const clsLabel = (CLASSES.find(c => c.key === clsSafe)?.label) || "Unassigned";

    root.innerHTML = `
      <div class="hq-wrap">
        <div class="hq-card" style="--aura:${classAura(clsSafe)}">
          <div class="hq-top">
            <div class="hq-avatar">
              <img id="hqAvatarImg" alt="Avatar" src="${avatarPath(clsSafe, p.gender)}" />
              <div class="hq-aura"></div>
            </div>
            <div class="hq-identity">
              <div class="hq-name" id="hqName">${htmlEscape(p.name)}</div>
              <div class="hq-sub">
                <span class="pill">${htmlEscape(clsLabel)}</span>
                <span class="pill">Rank ${htmlEscape(String(totals.rank))}</span>
                <span class="pill">Lvl ${htmlEscape(String(totals.lvl))}</span>
              </div>
              <div class="hq-xp">
                <div class="hq-xp-row">
                  <span class="muted">XP</span>
                  <span class="muted">${totals.into} / ${totals.next} (${totals.pct}%)</span>
                </div>
                <div class="hq-xpbar"><div class="hq-xpfill" style="width:${totals.pct}%"></div></div>
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
            <div class="hq-miniCard">
              <div class="hq-miniT">Today</div>
              <div class="hq-miniV">${today.count} logs • +${today.xp} XP</div>
              <div class="hq-miniS">Streak: <b>${streak}</b> day${streak===1?"":"s"}</div>
            </div>
            <div class="hq-miniCard">
              <div class="hq-miniT">Last</div>
              <div class="hq-miniV"><b>${htmlEscape(today.lastName)}</b></div>
              <div class="hq-miniS">${htmlEscape(today.lastDate)}</div>
            </div>
            <div class="hq-miniCard">
              <div class="hq-miniT">Next unlock</div>
              <div class="hq-miniV"><b>${locked ? "Classes" : "—"}</b></div>
              <div class="hq-miniS">${locked ? "Unlocked at Level 10" : "Keep grinding"}</div>
            </div>
          </div>

          ${todayPlan && todayPlan.length ? `
            <div class="hq-plan">
              <div class="hq-planT">Today Plan</div>
              <div class="hq-planSub muted">${todayPlan.filter(x=>x.done).length} / ${todayPlan.length} done</div>
              <div class="hq-planList">
                ${todayPlan.map(it=>{
                  const sub = (it.sets||it.reps) ? `${htmlEscape(it.sets)}x${htmlEscape(it.reps)}` : "";
                  return `
                    <div class="hq-planRow ${it.done?"done":""}" data-plan="${htmlEscape(it.name)}" data-sets="${htmlEscape(it.sets)}" data-reps="${htmlEscape(it.reps)}">
                      <div class="hq-planName">${htmlEscape(it.name)} ${sub?`<span class="pill small">${sub}</span>`:""}</div>
                      <div class="hq-planBtns">
                        ${it.done?`<span class="pill small">done</span>`:`<button class="btn small" data-plog>Log</button>`}
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          ` : ``}


          ${today.recent && today.recent.length ? `
            <div class="hq-recent">
              <div class="hq-recentT">Quick Log (1 tap)</div>
              <div class="hq-chips">
                ${today.recent.map(n=>`<button class="hq-chip" data-qlog="${htmlEscape(n)}">${htmlEscape(n)}</button>`).join("")}
              </div>
              <div class="hint">Tip: tap an exercise to jump into Log with it preselected.</div>
            </div>
          ` : ``}

          <div class="hq-grid">
            <div class="hq-section">
              <div class="hq-section-title">Profile</div>
              <label class="hq-field">
                <span>Name</span>
                <input id="hqNameInput" type="text" maxlength="24" value="${htmlEscape(p.name)}" placeholder="Your name" />
              </label>
              <div class="hq-row">
                <label class="hq-field">
                  <span>Gender</span>
                  <select id="hqGender">
                    ${GENDERS.map(g => `<option value="${g.key}" ${g.key === p.gender ? "selected" : ""}>${g.label}</option>`).join("")}
                  </select>
                </label>
                <label class="hq-field">
                  <span>Class</span>
                  <select id="hqClass" ${locked ? "disabled" : ""}>
                    ${locked
                      ? `<option value="none" selected>Unassigned</option>`
                      : CLASSES.map(c => `<option value="${c.key}" ${(c.key === clsSafe) ? "selected" : ""}>${c.label}</option>`).join("")
                    }
                  </select>
                </label>
              </div>
              <label class="hq-field">
                <span>Start date</span>
                <input id="hqStart" type="date" value="${htmlEscape(p.startDate)}" />
              </label>
              <div class="hint">${locked ? "Class locked until Level 10." : ""} Tip: You can set start date retroactively.</div>
            </div>

            <div class="hq-section">
              <div class="hq-section-title">Stats</div>
              <div class="hq-stats">
                ${stats.map(s => `
                  <div class="hq-stat">
                    <div class="hq-stat-k">${s.k}</div>
                    <div class="hq-stat-v">${s.v}</div>
                    <div class="hq-stat-l">${htmlEscape(s.label)}</div>
                  </div>
                `).join("")}
              </div>
              <div class="hint">Stats steigen durch Training: Mehrgelenkig→STR, Unilateral→AGI, Core/Conditioning→END, Komplexe→INT, Konsistenz→LCK.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const nameInput = root.querySelector("#hqNameInput");
    const genderSel = root.querySelector("#hqGender");
    const classSel = root.querySelector("#hqClass");
    const startInput = root.querySelector("#hqStart");
    const avatarImg = root.querySelector("#hqAvatarImg");
    const nameLabel = root.querySelector("#hqName");

    // Quick actions
    const go = (tab)=>{ try{ window.IronQuestNav?.go?.(tab); }catch(_){} };
    const setIntentLog = (exerciseName)=>{
      try{
        window.IronQuestIntent = window.IronQuestIntent || {};
        window.IronQuestIntent.log = {
          date: window.Utils?.isoDate?.(new Date()) || "",
          exercise: exerciseName || ""
        };
      }catch(_){ }
    };
    root.querySelector("#hqGoLog")?.addEventListener("click", ()=>{ setIntentLog(""); go("log"); });
    root.querySelector("#hqGoRun")?.addEventListener("click", ()=>go("run"));
    root.querySelector("#hqGoHistory")?.addEventListener("click", ()=>go("history"));
    root.querySelector("#hqGoPlans")?.addEventListener("click", ()=>go("plans"));

    root.querySelectorAll("[data-qlog]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        setIntentLog(btn.getAttribute("data-qlog")||"");
        go("log");
      });
    });

    const applyAvatar = () => {
      const cls = classSel?.value || "none";
      const gender = genderSel?.value || "male";
      if (avatarImg) avatarImg.src = avatarPath(cls, gender);
      const card = root.querySelector('.hq-card');
      if (card) card.style.setProperty('--aura', classAura(cls));
    };

    if (nameInput) {
      nameInput.addEventListener("input", () => {
        const v = safe(nameInput.value.trim(), "Hunter");
        window.IronQuestProfile?.setName?.(v);
        if (nameLabel) nameLabel.textContent = v;
      });
    }
    if (genderSel) {
      genderSel.addEventListener("change", () => {
        window.IronQuestProfile?.setGender?.(genderSel.value);
        applyAvatar();
      });
    }
    if (classSel) {
      classSel.addEventListener("change", () => {
        // Persist to the real class system (used for multipliers)
        if(window.IronQuestClasses?.set) window.IronQuestClasses.set(classSel.value);
        // Backward compat
        window.IronQuestProfile?.setClass?.(classSel.value);
        applyAvatar();
      });
    }
    if (startInput) {
      startInput.addEventListener("change", () => {
        // Start date drives progression/week numbers
        if (window.IronQuestProgression?.setStartDate) window.IronQuestProgression.setStartDate(startInput.value);
        // Backward compat (old key)
        if (window.IronQuestProfile?.setStartDate) window.IronQuestProfile.setStartDate(startInput.value);
      });
    }

    // Enforce class lock (if user downgraded/cleared data)
    try{
      if(locked && window.IronQuestClasses?.get && window.IronQuestClasses?.set){
        if(window.IronQuestClasses.get() !== "none") window.IronQuestClasses.set("none");
      }
    }catch(_){ }
  }

  window.IronQuestHome = { render };
})();
