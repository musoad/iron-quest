(() => {
  "use strict";
  const KEY="ironquest_equipment_v8";
  const SLOTS=["title","badge","aura","relic"];

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{ title:null, badge:null, aura:null, relic:null }; }catch{ return { title:null, badge:null, aura:null, relic:null }; } }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function equip(slot, itemId){
    if(!SLOTS.includes(slot)) return;
    const st=load();
    st[slot]=itemId || null;
    save(st);
  }

  function bonuses(){
    const eq=load();
    const loot=window.IronQuestLoot.load();
    const byId=new Map((loot.inv||[]).map(i=>[i.id,i]));
    const bonus={ globalXp:1, gateDmg:1 };
    const relic = eq.relic ? byId.get(eq.relic) : null;
    if(relic?.bonus?.globalXp) bonus.globalXp *= relic.bonus.globalXp;
    if(relic?.bonus?.gateDmg) bonus.gateDmg *= relic.bonus.gateDmg;
    return bonus;
  }

  function equippedNames(){
    const eq=load();
    const loot=window.IronQuestLoot.load();
    const byId=new Map((loot.inv||[]).map(i=>[i.id,i]));
    const name=(id)=> id? (byId.get(id)?.name || "—") : "—";
    return { title:name(eq.title), badge:name(eq.badge), aura:name(eq.aura), relic:name(eq.relic) };
  }

  window.IronQuestEquipment={ load, save, equip, bonuses, equippedNames, SLOTS };
})();
