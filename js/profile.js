(() => {
  "use strict";

  const KEY = "iq_profile_v1";

  function safeParse(s, fb){ try{ return JSON.parse(s); }catch{ return fb; } }
  function isoToday(){
    const d=new Date();
    const pad=n=>String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function loadProfile(){
    const raw = localStorage.getItem(KEY);
    const st = raw ? safeParse(raw, {}) : {};
    if (!st.name) st.name = "Hunter";
    if (!st.challengeStart) st.challengeStart = isoToday();
    return st;
  }

  function saveProfile(st){
    localStorage.setItem(KEY, JSON.stringify(st));
  }

  async function computeTotals(){
    const entries = (await window.IronDB.getAllEntries?.()) || [];
    const totalXp = entries.reduce((s,e)=>s + Number(e.xp||0), 0);

    const lvlObj = window.IronQuestProgression?.levelFromTotalXp
      ? window.IronQuestProgression.levelFromTotalXp(totalXp)
      : { lvl: Math.floor(totalXp/1000)+1 };

    const lvl = lvlObj?.lvl || 1;
    const title = lvlObj?.title || "Anfänger";

    const rank = window.IronQuestHunterRank?.compute
      ? window.IronQuestHunterRank.compute(lvl, totalXp)
      : "E";

    return { totalXp, lvl, title, rank };
  }

  function cardHtml({name, rank, lvl, title, totalXp}) {
    const gender = window.IronQuestProfile?.getGender?.() || "male";
    const classState = window.IronQuestClasses?.getState?.() || { selected: "unassigned" };
    const classId = classState.selected || "unassigned";
    const cls = (window.IronQuestClasses?.CLASSES || []).find(c => c.id === classId) || { name: "Unassigned", aura: "#6b7280" };
    const avatar = `assets/avatars/${classId}_${gender}.png`;

    const attrs = window.IronQuestAttributes?.ATTRS || [];
    const statLabels = { strength: "STR", endurance: "END", intelligence: "INT", dexterity: "DEX", charisma: "CHA" };
    const statsHtml = attrs.map(a => {
      const v = window.IronQuestAttributes?.get?.(a.key) || 0;
      return `<div class="stat-pill"><div class="k">${statLabels[a.key] || a.key}</div><div class="v">${v}</div></div>`;
    }).join("");

    const genderBtn = (g, label) => {
      const active = (gender === g) ? "active" : "";
      return `<button class="seg ${active}" data-gender="${g}" type="button">${label}</button>`;
    };

    return `
      <div class="card hunter-card">
        <div class="hc-top">
          <div class="hc-avatar">
            <img src="${avatar}" alt="${cls.name} ${gender}" loading="eager" decoding="async"
                 onerror="this.onerror=null;this.src='assets/avatars/unassigned_${gender}.png';" />
            <div class="hc-aura" style="--aura:${cls.aura}"></div>
          </div>

          <div class="hc-meta">
            <div class="hc-name">${escapeHtml(name || "Hunter")}</div>
            <div class="hc-sub">
              <span class="badge" style="border-color:${cls.aura};color:${cls.aura}">${cls.name}</span>
              <span class="dot">•</span>
              <span class="muted">${title || "Hunter"}</span>
            </div>

            <div class="hc-kpis">
              <div class="kpi"><div class="k">Rank</div><div class="v">${rank}</div></div>
              <div class="kpi"><div class="k">Level</div><div class="v">${lvl}</div></div>
              <div class="kpi"><div class="k">XP</div><div class="v">${formatNum(totalXp)}</div></div>
            </div>

            <div class="segmented" aria-label="Gender">
              ${genderBtn("male","Male")}
              ${genderBtn("female","Female")}
            </div>
          </div>
        </div>

        <div class="hc-stats">
          ${statsHtml}
        </div>

        <div class="hint" style="margin-top:10px">
          Tip: Pick your class in <b>Skills</b>. Your portrait updates automatically.
        </div>
      </div>
    `;
  }

  function wireHunterCard(root){
    const seg = root.querySelector(".hunter-card .segmented");
    if(!seg) return;
    seg.querySelectorAll("button[data-gender]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const g = btn.dataset.gender;
        window.IronQuestProfile?.setGender?.(g);
        // rerender home
        render(root).catch(()=>{});
      });
    });
  }
}

  async function render(el){
    const profile = loadProfile();
    const totals = await computeTotals();

    el.innerHTML = `
      ${cardHtml({ name: profile.name, ...totals })}
      <div class="card">
        <h2>Profile</h2>

        <label class="label">Charaktername</label>
        <input id="iq_name" class="input" type="text" value="${escapeHtml(profile.name)}" maxlength="24" />

        <div style="height:12px"></div>

        <label class="label">Challenge Startdatum (auch rückwirkend)</label>
        <input id="iq_start" class="input" type="date" value="${escapeHtml(profile.challengeStart)}" />

        <div style="height:12px"></div>

        <button id="iq_save" class="btn">Speichern</button>
        <p class="hint" style="margin-top:10px">Tipp: Wenn Safari „hängt“, nutze Backup → Cache/SW Reset.</p>
      </div>
    `;

    const btn = el.querySelector("#iq_save");
    btn.onclick = async () => {
      const name = (el.querySelector("#iq_name")?.value || "Hunter").trim() || "Hunter";
      const start = (el.querySelector("#iq_start")?.value || isoToday()).trim() || isoToday();
      const next = { name, challengeStart: start };
      saveProfile(next);
      // refresh card
      const totals2 = await computeTotals();
      el.innerHTML = `
        ${cardHtml({ name: next.name, ...totals2 })}
        <div class="card"><h2>Gespeichert ✅</h2><p class="hint">Name und Startdatum wurden aktualisiert.</p></div>
      `;
    };
    // bind hunter card controls
    try{ wireHunterCard(el); }catch(e){}

  }

  window.IronQuestHome = { render };
})();
