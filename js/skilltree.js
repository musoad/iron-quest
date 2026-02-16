// js/skilltree.js
window.Skilltree = (function(){
  const { loadJSON, saveJSON } = window.Utils;
  const KEY = "ironquest_skilltree_v4";

  const TREES = [
    { key:"Mehrgelenkig", label:"STR – Mehrgelenkig" },
    { key:"Unilateral",   label:"STA – Unilateral" },
    { key:"Core",         label:"MOB – Core" },
    { key:"Conditioning", label:"END – Conditioning" },
    { key:"Komplexe",     label:"ELITE – Komplexe" },
    { key:"Jogging",      label:"RUN – Jogging" },
  ];

  function load(){
    const fallback = { points:0, unlocked:{} };
    const s = loadJSON(KEY, fallback);
    s.points = Number(s.points||0);
    s.unlocked = s.unlocked || {};
    return s;
  }
  function save(s){ saveJSON(KEY, s); }

  // +2% pro Unlock, cap +15% pro Tree
  function multiplierFor(type){
    const s = load();
    const n = Number(s.unlocked[type]||0);
    const mult = 1 + Math.min(0.15, n*0.02);
    return mult;
  }

  function render(elId){
    const el = document.getElementById(elId);
    if (!el) return;

    const s = load();

    el.innerHTML = `
      <div class="card">
        <h2>Skilltree</h2>
        <p class="hint">Skillpunkte: Du kannst sie manuell vergeben (Motivation). Jeder Unlock gibt +2% XP für den Typ (max +15%).</p>
        <div class="row2">
          <div class="pill"><b>Verfügbare Skillpunkte:</b> <span id="stPoints">${s.points}</span></div>
          <div class="pill"><b>Hinweis:</b> Skilltree beeinflusst XP direkt.</div>
        </div>
        <hr>
        <div id="stList"></div>
        <div class="btnRow">
          <button class="secondary" id="stAddPoint">+1 Skillpunkt</button>
          <button class="danger" id="stReset">Reset Skilltree</button>
        </div>
      </div>
    `;

    const list = document.getElementById("stList");
    TREES.forEach(t=>{
      const unlocked = Number(s.unlocked[t.key]||0);
      const mult = (1 + Math.min(0.15, unlocked*0.02)).toFixed(2);
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <div class="itemTop">
          <div>
            <div><b>${t.label}</b></div>
            <div class="small">Unlocks: ${unlocked} • Mult: x${mult}</div>
          </div>
          <button class="primary" data-unlock="${t.key}">Unlock (-1 SP)</button>
        </div>
      `;
      list.appendChild(div);
    });

    document.getElementById("stAddPoint").onclick = ()=>{
      const s2 = load();
      s2.points += 1;
      save(s2);
      render(elId);
    };

    document.getElementById("stReset").onclick = ()=>{
      if (!confirm("Skilltree wirklich zurücksetzen?")) return;
      save({ points:0, unlocked:{} });
      render(elId);
    };

    list.querySelectorAll("[data-unlock]").forEach(btn=>{
      btn.onclick = ()=>{
        const k = btn.getAttribute("data-unlock");
        const s2 = load();
        if (s2.points <= 0) return alert("Keine Skillpunkte verfügbar.");
        s2.points -= 1;
        s2.unlocked[k] = Number(s2.unlocked[k]||0) + 1;
        save(s2);
        render(elId);
      };
    });
  }

  return { multiplierFor, render };
})();
