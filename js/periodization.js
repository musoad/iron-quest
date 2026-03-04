(() => {
  "use strict";

  // Periodization modes bias XP gain by exercise type.
  // Hybrid C: quiet UI, but meaningful progression.
  const KEY = "ironquest_periodization_v9";

  const MODES = [
    { key:"mixed", name:"Mixed (Balanced)", desc:"Default. No strong bias." },
    { key:"hypertrophy", name:"Hypertrophy", desc:"More volume focus: Unilateral + Multi slightly boosted." },
    { key:"strength", name:"Strength", desc:"Strength focus: Multi boosted, Conditioning slightly reduced." },
    { key:"endurance", name:"Endurance", desc:"Conditioning + NEAT boosted." },
  ];

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || { mode:"mixed", changedAt:"" }; }
    catch { return { mode:"mixed", changedAt:"" }; }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function getMode(){
    const st = load();
    const found = MODES.find(m=>m.key===st.mode) || MODES[0];
    return { ...found, changedAt: st.changedAt || "" };
  }

  function setMode(modeKey){
    const found = MODES.find(m=>m.key===modeKey) || MODES[0];
    const st = load();
    st.mode = found.key;
    st.changedAt = (window.Utils && window.Utils.isoDate)(new Date()) || "";
    save(st);
    return getMode();
  }

  function multiplierForType(type){
    const m = getMode().key;
    // Keep multipliers modest to avoid breaking XP economy.
    if(m==="hypertrophy"){
      if(type==="Mehrgelenkig") return 1.06;
      if(type==="Unilateral") return 1.08;
      if(type==="Core") return 1.02;
      if(type==="Conditioning") return 0.98;
      return 1.0;
    }
    if(m==="strength"){
      if(type==="Mehrgelenkig") return 1.10;
      if(type==="Unilateral") return 1.03;
      if(type==="Core") return 1.01;
      if(type==="Conditioning") return 0.95;
      if(type==="Komplexe") return 0.97;
      return 1.0;
    }
    if(m==="endurance"){
      if(type==="Conditioning") return 1.12;
      if(type==="NEAT") return 1.10;
      if(type==="Core") return 1.03;
      if(type==="Mehrgelenkig") return 0.97;
      return 1.0;
    }
    return 1.0; // mixed
  }

  window.IronQuestPeriodization = { MODES, getMode, setMode, multiplierForType };
})();
