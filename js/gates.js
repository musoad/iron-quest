(() => {
  "use strict";
  const KEY="ironquest_gates_v6";

  const RANKS = ["E","D","C","B","A","S"];
  const RANK_COLOR = { E:"lock", D:"gold", C:"gold", B:"purple", A:"purple", S:"ok" };

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{ cleared:{} }; }catch{ return { cleared:{} }; } }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function gateForWeek(week){
    // ramp rank every ~8 weeks
    const idx = Math.min(RANKS.length-1, Math.floor((Math.max(1,week)-1)/8));
    const rank = RANKS[idx];
    const minLevel = 1 + idx*10;
    const baseXp = 900 + idx*350;
    const chest = (idx>=2) ? 1 : 0;
    const req = {
      weekDays: 3 + idx,            // E:3, D:4, C:5, etc
      multi: 2 + idx,               // number of multi/komplex entries
      core:  1 + Math.floor(idx/2),
      end:   1 + Math.floor(idx/2),
      attr:  4 + idx*2              // minimum attribute levels
    };
    return { week, rank, name:`${rank}-Rank Gate`, minLevel, baseXp, chest, req };
  }

  function summarizeForWeek(entries, week){
    const days = new Set();
    let multi=0, core=0, end=0, any=0;
    let weekXp = 0;
    for (const e of entries){
      if (Number(e.week||0)!==Number(week)) continue;
      const xp = Number(e.xp||0);
      weekXp += xp;
      if (xp>0 && e.date) days.add(e.date);
      any++;
      if (e.type==="Mehrgelenkig" || e.type==="Komplexe") multi++;
      if (e.type==="Core") core++;
      if (e.type==="Conditioning" || e.type==="NEAT" || e.type==="Joggen") end++;
    }
    return { weekXp, weekDays: days.size, multi, core, end, any };
  }

  function meetsRequirements(gate, level, attrState, weekSum){
    const req = gate.req;
    const attrs = Object.values(attrState||{}).map(x=>Number(x.level||1));
    const minAttr = attrs.length ? Math.min(...attrs) : 1;

    const ok =
      Number(level||1) >= gate.minLevel &&
      weekSum.weekDays >= req.weekDays &&
      weekSum.multi >= req.multi &&
      weekSum.core >= req.core &&
      weekSum.end >= req.end &&
      minAttr >= req.attr;
    return { ok, minAttr };
  }

  async function clearGate(gate){
    const date = window.Utils.isoDate(new Date());
    const week = gate.week;
    await window.IronDB.addEntry({
      date, week,
      type:"Gate",
      exercise:`Gate Clear: ${gate.rank}-Rank`,
      detail:`Cleared ${gate.name} • Reward XP +${gate.baseXp}${gate.chest?` • Chest +${gate.chest}`:""}`,
      xp: gate.baseXp
    });
    if (gate.chest) window.IronQuestLoot?.addChest?.(gate.chest);
    const st = load();
    st.cleared[String(week)] = { date, rank: gate.rank };
    save(st);
  }

  async function renderGates(el){
    const entries = await window.IronDB.getAllEntries();
    const week = window.IronQuestProgression.getWeekNumber();
    const totalXp = entries.reduce((s,e)=>s+Number(e.xp||0),0);
    const L = window.IronQuestProgression.levelFromTotalXp(totalXp);
    const attrs = window.IronQuestAttributes.getState();

    const gate = gateForWeek(week);
    const st = load();
    const cleared = !!st.cleared?.[String(week)];
    const weekSum = summarizeForWeek(entries, week);
    const check = meetsRequirements(gate, L.lvl, attrs, weekSum);

    el.innerHTML = `
      <div class="card">
        <h2>Gates</h2>
        <p class="hint">Jede Woche öffnet sich ein Gate. Erfülle Bedingungen, dann „Enter Gate“.</p>
        <div class="statRow">
          <div class="pill"><b>Aktuelles Gate:</b> ${gate.name}</div>
          <div class="pill"><b>Min Lv:</b> ${gate.minLevel}</div>
          <div class="pill"><b>Reward:</b> ${gate.baseXp} XP${gate.chest?` + ${gate.chest} Chest`:""}</div>
        </div>
      </div>

      <div class="card">
        <h2>${gate.name}</h2>
        <div class="row2">
          <div class="skillbox">
            <h3>Requirements</h3>
            <div class="hint">Woche Trainingstage: ${weekSum.weekDays}/${gate.req.weekDays}</div>
            <div class="hint">Multi/Komplex: ${weekSum.multi}/${gate.req.multi}</div>
            <div class="hint">Core: ${weekSum.core}/${gate.req.core}</div>
            <div class="hint">Endurance: ${weekSum.end}/${gate.req.end}</div>
            <div class="hint">Min Attribute Level: ${check.minAttr}/${gate.req.attr}</div>
            <div class="hint">Level: ${L.lvl}/${gate.minLevel}</div>
          </div>

          <div class="skillbox">
            <h3>Status</h3>
            <div class="pill"><b>Week XP:</b> ${Math.round(weekSum.weekXp)}</div>
            <div class="pill"><b>Rank:</b> <span class="badge ${RANK_COLOR[gate.rank]||"gold"}">${gate.rank}</span></div>
            <div class="btnRow" style="margin-top:12px;">
              <button class="primary" id="enterGate" ${(!check.ok || cleared)?"disabled":""}>Enter Gate</button>
              <button class="secondary" id="openChest">Open Chest</button>
            </div>
            <div class="hint" style="margin-top:10px;">${cleared ? `✅ Cleared: ${st.cleared[String(week)].date}` : (check.ok ? "✅ Ready" : "🔒 Not ready")}</div>
            <div class="hint">Chests: <b>${window.IronQuestLoot.getState().chests}</b> • Last: ${window.IronQuestLoot.getState().lastDrop||"—"}</div>
          </div>
        </div>
      </div>
    `;

    el.querySelector("#enterGate").onclick = async ()=>{
      if (cleared) return;
      await clearGate(gate);
      window.UIEffects?.systemMessage([`Gate cleared: ${gate.rank}-Rank`, `Reward: +${gate.baseXp} XP`]);
      window.Toast?.toast("Gate cleared", `+${gate.baseXp} XP`);
      await window.IronQuestLevelUp.checkLevelUp();
      await renderGates(el);
    };

    el.querySelector("#openChest").onclick = ()=>{
      const r = window.IronQuestLoot.rollDrop();
      if (!r.ok) return window.Toast?.toast("Chest", "Keine Chests verfügbar.");
      window.UIEffects?.systemMessage([`Chest opened`, `${r.drop||"XP shard"}`]);
      window.Toast?.toast("Chest opened", r.drop||"XP shard");
      renderGates(el);
    };
  }

  window.IronQuestGates = { renderGates };
})();
