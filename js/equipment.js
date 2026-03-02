(() => {
  "use strict";
  const KEY="ironquest_equipment_v6";

  const SLOTS = [
    { id:"title", name:"Title" },
    { id:"badge", name:"Badge" },
    { id:"relic", name:"Relic" },
    { id:"aura",  name:"Aura" },
  ];

  // Simple bonus model: items can provide multiplier per type or global.
  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || { equipped:{ title:null, badge:null, relic:null, aura:null }, bonuses:{} }; }
    catch{ return { equipped:{ title:null, badge:null, relic:null, aura:null }, bonuses:{} }; }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function getEquipped(){ return load().equipped; }

  function equip(slotId, item){
    const st = load();
    st.equipped[slotId] = item ? { id:item.id, name:item.name, kind:item.kind } : null;
    // auto-bonus presets
    st.bonuses = st.bonuses || {};
    if (slotId==="relic" && item){
      // relic gives global +2% xp
      st.bonuses.global = 1.02;
    }
    if (!item && slotId==="relic"){
      st.bonuses.global = 1;
    }
    save(st);
  }

  function multiplierForType(type){
    const st = load();
    const g = Number(st.bonuses?.global || 1);
    // title/badge could give flavor, keep at 1 for now
    return g;
  }

  function renderEquipment(el, inv){
    const st = load();
    const equipped = st.equipped || {};
    el.innerHTML = `
      <div class="card">
        <h2>Equipment</h2>
        <p class="hint">Rüste Loot aus. (v6: Relic gibt aktuell +2% global XP.)</p>
        <div class="row2" id="slotGrid"></div>
      </div>
    `;
    const grid = el.querySelector("#slotGrid");
    SLOTS.forEach(s=>{
      const cur = equipped[s.id];
      const box = document.createElement("div");
      box.className="skillbox";
      box.innerHTML = `
        <h3>${s.name}</h3>
        <div class="hint">Ausgerüstet: <b>${cur?cur.name:"—"}</b></div>
        <label>Wähle aus Inventory</label>
        <select data-slot="${s.id}">
          <option value="">—</option>
        </select>
        <div class="btnRow">
          <button class="secondary" data-unequip="${s.id}" ${cur?"" :"disabled"}>Unequip</button>
        </div>
      `;
      grid.appendChild(box);

      const sel = box.querySelector("select");
      const options = (inv||[]).filter(x=>{
        // map kinds to slots
        if (s.id==="title") return x.kind==="title";
        if (s.id==="badge") return x.kind==="badge";
        if (s.id==="relic") return x.kind==="relic";
        if (s.id==="aura")  return x.kind==="aura" || x.kind==="theme";
        return false;
      });

      options.forEach(it=>{
        const o = document.createElement("option");
        o.value = it.id;
        o.textContent = it.name;
        sel.appendChild(o);
      });

      sel.onchange = ()=>{
        const id = sel.value;
        const item = options.find(x=>x.id===id);
        if (!item) return;
        equip(s.id, item);
        window.UIEffects?.systemMessage([`Equipped ${s.name}:`, item.name]);
        window.Toast?.toast("Equipped", item.name);
        renderEquipment(el, inv);
      };

      box.querySelector(`[data-unequip="${s.id}"]`).onclick = ()=>{
        equip(s.id, null);
        window.Toast?.toast("Unequipped", s.name);
        renderEquipment(el, inv);
      };
    });
  }

  window.IronQuestEquipment = { SLOTS, getEquipped, equip, multiplierForType, renderEquipment };
})();
