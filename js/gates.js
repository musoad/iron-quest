(() => {
  "use strict";
  const KEY="ironquest_gates_v8";
  const GATE_TYPES=[
    { id:"standard", name:"Standard Gate", desc:"Alle XP zählt normal." },
    { id:"strength", name:"Strength Gate", desc:"Mehrgelenkig/Unilateral zählt stärker." },
    { id:"core", name:"Core Gate", desc:"Core XP zählt stärker." },
    { id:"endurance", name:"Endurance Gate", desc:"Conditioning/NEAT zählt stärker." },
    { id:"highrisk", name:"High Risk Gate", desc:"-15% XP, aber +Loot Chance." },
    { id:"timelimited", name:"Time Limited Gate", desc:"Ziel: 3 Trainingstage bis Freitag." },
  ];

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{ clearedWeeks:{} }; }catch{ return { clearedWeeks:{} }; } }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function gateOfWeek(week){
    const idx = (week-1) % GATE_TYPES.length;
    return GATE_TYPES[idx];
  }

  function baseHPForRank(rank){
    const map={ E:4000, D:6500, C:9000, B:12000, A:16000, S:22000 };
    return map[rank] || 4000;
  }

  function computeDamage(entries, week, rank){
    const gate = gateOfWeek(week);
    let dmg=0;
    for(const e of entries){
      if(Number(e.week||0)!==week) continue;
      const xp=Number(e.xp||0);
      if(!xp) continue;

      let mult=1;
      if(gate.id==="strength" && (e.type==="Mehrgelenkig" || e.type==="Unilateral")) mult=1.25;
      if(gate.id==="core" && e.type==="Core") mult=1.6;
      if(gate.id==="endurance" && (e.type==="Conditioning" || e.type==="NEAT")) mult=1.5;
      if(gate.id==="highrisk") mult=1.15; // damage stays, XP reduced elsewhere (not implemented)
      dmg += xp*mult;
    }

    // equipment + active buffs affect gate damage
    const eq=window.IronQuestEquipment.bonuses();
    const active=(window.__IQ_ACTIVE_BUFFS && window.__IQ_ACTIVE_BUFFS.gateDmg) || 1;
    dmg *= (eq.gateDmg||1) * active;

    // rank scales damage slightly
    const rankMult = { E:1.0, D:1.03, C:1.06, B:1.09, A:1.12, S:1.15 }[rank] || 1.0;
    dmg *= rankMult;

    return Math.round(dmg);
  }

  async function render(container){
    const entries=await window.IronDB.getAllEntries();
    const today=window.Utils.isoDate(new Date());
    const week=window.IronQuestProgression.getWeekNumberFor(today);

    const totalXp = entries.reduce((s,e)=>s+Number(e.xp||0),0);
    const L = window.IronQuestProgression.levelFromTotalXp(totalXp);
    const rankKey = window.IronQuestHunterRank.compute(L.lvl, totalXp);
    const rankMeta = window.IronQuestHunterRank.getMeta(rankKey);

    const gate = gateOfWeek(week);
    const hp = baseHPForRank(rankKey);
    const dmg = computeDamage(entries, week, rankKey);
    const remaining = Math.max(0, hp-dmg);
    const pct = Math.max(0, Math.min(100, (dmg/hp)*100));

    const st=load();
    const cleared=!!st.clearedWeeks[String(week)];

    container.innerHTML = `
      <div class="card">
        <h2>Gates</h2>
        <p class="hint">Wöchentliches Gate. Damage kommt aus deiner Wochen-Performance. Hybrid-UI: ruhig, aber „SYSTEM“-Momente bei Clear.</p>
      </div>

      <div class="card soft">
        <div class="itemTop">
          <div>
            <b>Aktuelles Gate (W${week})</b>
            <div class="hint">${gate.name} • ${gate.desc}</div>
            <div class="hint">Hunter Rank: <span class="badge ${rankMeta.color}">${rankKey}</span> ${rankMeta.name}</div>
          </div>
          <span class="badge ${cleared?"ok":"gold"}">${cleared?"CLEARED":"ACTIVE"}</span>
        </div>

        <div style="margin-top:12px;">
          <div class="hint">Gate HP</div>
          <div class="bar" style="margin-top:8px;">
            <div class="barFill" style="width:${pct}%;"></div>
          </div>
          <div class="row2" style="margin-top:10px;">
            <div class="pill"><b>Damage:</b> ${window.Utils.fmt(dmg)}</div>
            <div class="pill"><b>Remaining:</b> ${window.Utils.fmt(remaining)}</div>
          </div>
        </div>

        <div class="btnRow">
          <button class="primary" id="btnEnter" ${cleared?"disabled":""}>Enter Gate</button>
          <button class="secondary" id="btnOpenChest">Open Chest</button>
        </div>

        <div class="hint">Clear: Damage ≥ HP. Reward: 1 Chest + Gate Clear Counter.</div>
      </div>

      <div class="card">
        <h2>Inventory & Equipment</h2>
        <div id="invMount"></div>
      </div>
    `;

    // Inventory UI
    renderInventory(container.querySelector("#invMount"));

    container.querySelector("#btnOpenChest").onclick=()=>{
      const res=window.IronQuestLoot.roll();
      if(!res.ok) return (window.Toast && window.Toast.toast)("Chest", "Keine Chests verfügbar.");
      (window.Toast && window.Toast.toast)("Chest", res.msg);
      renderInventory(container.querySelector("#invMount"));
    };

    container.querySelector("#btnEnter").onclick=async()=>{
      if(cleared) return;
      if(dmg < hp){
        window.IronQuestUIFX.showSystem(`Gate not cleared.\n\nDamage: ${dmg} / ${hp}\nTrain more this week.`);
        return;
      }

      // Clear reward
      st.clearedWeeks[String(week)] = { date: today, rank: rankKey, gate: gate.id };
      save(st);

      window.IronQuestLoot.addChests(1);
      window.IronQuestHunterRank.recordGateClear();

      await window.IronDB.addSystem({ date: today, msg:`Gate cleared (W${week}) — Rank ${rankKey}. Reward: +1 Chest.` });

      window.IronQuestUIFX.showSystem(`Gate cleared.\n\n[ REWARD ]\n+1 Chest\nHunter Rank progress increased.`);
      (window.Toast && window.Toast.toast)("Gate cleared", "+1 Chest");

      await render(container);
    };
  }

  function renderInventory(mount){
    const loot=window.IronQuestLoot.load();
    const eq=window.IronQuestEquipment.load();
    const names=window.IronQuestEquipment.equippedNames();

    const inv=loot.inv||[];
    const byKind={ title:[], badge:[], aura:[], relic:[] };
    inv.forEach(i=>{ if(byKind[i.kind]) byKind[i.kind].push(i); });

    mount.innerHTML = `
      <div class="card soft" style="margin:0;">
        <div class="row2">
          <div class="pill"><b>Chests:</b> ${loot.chests||0}</div>
          <div class="pill"><b>Equipped Relic:</b> ${names.relic}</div>
        </div>

        <div class="descBox" style="border-color: rgba(255,212,106,.25);">
          <div class="descTitle">Equipment</div>
          <div class="descText">
Title: ${names.title}\n
Badge: ${names.badge}\n
Aura: ${names.aura}\n
Relic: ${names.relic}
          </div>
        </div>

        <div class="row2">
          ${["title","badge","aura","relic"].map(slot=>{
            const list=byKind[slot];
            return `
              <div class="card soft" style="margin:0; padding:12px;">
                <div class="itemTop">
                  <div><b>${slot.toUpperCase()}</b><div class="hint">Wähle aus Inventory</div></div>
                  <span class="badge">${eq[slot]?"ON":"—"}</span>
                </div>
                <select data-eq="${slot}">
                  <option value="">—</option>
                  ${list.map(it=>`<option value="${it.id}" ${eq[slot]===it.id?"selected":""}>${it.name}</option>`).join("")}
                </select>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    mount.querySelectorAll("[data-eq]").forEach(sel=>{
      sel.onchange=()=>{
        const slot=sel.getAttribute("data-eq");
        const id=sel.value||null;
        window.IronQuestEquipment.equip(slot, id);
        (window.Toast && window.Toast.toast)("Equipment updated", `${slot.toUpperCase()} equipped.`);
        renderInventory(mount);
      };
    });
  }

  window.IronQuestGates={ render, gateOfWeek, GATE_TYPES };
})();
