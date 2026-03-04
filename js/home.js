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

  function cardHtml({name, rank, lvl, title, totalXp}){
    return `
      <div class="card">
        <h2>Hunter Card</h2>
        <div class="row" style="gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">
          <div>
            <div class="hint">Name</div>
            <div style="font-size:20px;font-weight:800">${escapeHtml(name)}</div>
            <div class="hint" style="margin-top:6px">Rank</div>
            <div style="font-size:18px;font-weight:800">${escapeHtml(rank)}</div>
          </div>
          <div style="text-align:right">
            <div class="hint">Level</div>
            <div style="font-size:22px;font-weight:900">${lvl}</div>
            <div class="hint" style="margin-top:6px">${escapeHtml(title)}</div>
            <div class="hint" style="margin-top:10px">Total XP: <b>${Math.round(totalXp)}</b></div>
          </div>
        </div>
      </div>
    `;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
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
  }

  window.IronQuestHome = { render };
})();
