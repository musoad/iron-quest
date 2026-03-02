(() => {
  "use strict";

  const KEY = "ironquest_equipment_v6";

  const SLOTS = [
    { key:"title", label:"Title", kind:"title", cosmetic:true },
    { key:"badge", label:"Badge", kind:"badge", cosmetic:true },
    { key:"aura",  label:"Aura",  kind:"aura",  cosmetic:true },
    { key:"relic", label:"Relic", kind:"relic", cosmetic:false },
  ];

  // Default relic bonus:
  // - global: +2% XP
  // - plus tiny type flair if relic has tags
  function relicBonus(item){
    if (!item) return { global:1, byType:{} };
    const byType = {};
    if (item.tags?.includes("multi")) byType.Mehrgelenkig = 1.03;
    if (item.tags?.includes("core"))  byType.Core = 1.03;
    if (item.tags?.includes("uni"))   byType.Unilateral = 1.03;
    if (item.tags?.includes("end"))   byType.Conditioning = 1.03, byType.NEAT=1.03, byType.Joggen=1.03;
    if (item.tags?.includes("skill")) byType.Komplexe = 1.03;
    return { global: 1.02, byType };
  }

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || { slots:{ title:null, badge:null, aura:null, relic:null } }; }
    catch { return { slots:{ title:null, badge:null, aura:null, relic:null } }; }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function getSlots(){
    return load().slots;
  }

  function equip(slotKey, item){
    const st = load();
    if (!st.slots) st.slots = { title:null, badge:null, aura:null, relic:null };
    st.slots[slotKey] = item ? { id:item.id, name:item.name, kind:item.kind, tags:item.tags||[] } : null;
    save(st);
  }

  function unequip(slotKey){ equip(slotKey, null); }

  function multipliersFor(type){
    const slots = getSlots();
    let global = 1;
    const byType = {};
    if (slots.relic){
      const b = relicBonus(slots.relic);
      global *= b.global;
      for (const [k,v] of Object.entries(b.byType||{})){
        byType[k] = (byType[k] || 1) * Number(v||1);
      }
    }
    const typeMul = (byType[type] || 1);
    return { global, type: typeMul };
  }

  function renderEquipmentPanel(el){
    const loot = window.IronQuestLoot?.getState?.();
    const inv = loot?.inv || [];
    const slots = getSlots();

    function invForKind(kind){
      return inv.filter(i => i.kind === kind);
    }

    el.innerHTML = `
      <div class="card">
        <h2>Equipment</h2>
        <p class="hint">Equip items to style your Hunter — Relics grant XP bonuses.</p>

        <div class="row2">
          ${SLOTS.map(s=>{
            const cur = slots[s.key];
            return `
              <div class="skillbox">
                <h3>${s.label}</h3>
                <div class="pill"><b>Equipped:</b> ${cur ? cur.name : "—"}</div>
                <label>Select</label>
                <select data-slot="${s.key}" class="equipSel">
                  <option value="">—</option>
                  ${invForKind(s.kind).map(it=>`<option value="${it.id}" ${cur?.id===it.id?"selected":""}>${it.name}</option>`).join("")}
                </select>
                <div class="btnRow">
                  <button class="danger" data-uneq="${s.key}">Unequip</button>
                </div>
                ${s.key==="relic" ? `<div class="hint">Relic: +2% global XP (plus small type flair if tagged).</div>` : `<div class="hint">Cosmetic slot.</div>`}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    el.querySelectorAll(".equipSel").forEach(sel=>{
      sel.addEventListener("change", ()=>{
        const slot = sel.getAttribute("data-slot");
        const id = sel.value;
        const loot = window.IronQuestLoot.getState();
        const item = loot.inv.find(x=>x.id===id);
        if (!id){ equip(slot, null); window.Toast?.toast("Equipment", "Slot cleared"); return; }
        if (!item) return;
        equip(slot, item);
        window.Toast?.toast("Equipped", item.name);
      });
    });

    el.querySelectorAll("[data-uneq]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const slot = btn.getAttribute("data-uneq");
        unequip(slot);
        window.Toast?.toast("Unequipped", slot);
        renderEquipmentPanel(el);
      });
    });
  }

  window.IronQuestEquipment = { SLOTS, getSlots, equip, unequip, multipliersFor, renderEquipmentPanel };
})();
