(() => {
  "use strict";

  async function render(container){
    const entries=await window.IronDB.getAllEntries();
    const totalXp=entries.reduce((s,e)=>s+Number(e.xp||0),0);
    const L=window.IronQuestProgression.levelFromTotalXp(totalXp);

    const start=window.IronQuestProgression.getStartDate();
    const clsId=window.IronQuestClasses.get();
    const clsMeta=window.IronQuestClasses.meta(clsId);

    const st=window.IronQuestSkilltreeV2.load();
    const types=window.IronQuestExercises.TYPES;

    container.innerHTML=`
      <div class="card">
        <h2>Skills & Setup</h2>
        <p class="hint">Hybrid: Premium ruhig, aber Anime-Momente bei Level/Rank/Finisher.</p>
      </div>

      <div class="card soft">
        <h2>Challenge Start</h2>
        <label>Startdatum (Woche 1)</label>
        <input id="startDate" type="date" value="${start}">
        <div class="btnRow">
          <button class="primary" id="saveStart">Speichern</button>
          <button class="secondary" id="todayStart">Heute</button>
        </div>
      </div>

      <div class="card soft">
        <h2>Klasse (ab Level 10)</h2>
        <div class="pill"><b>Aktuell:</b> ${clsMeta.name}</div>
        <div class="hint">${clsMeta.desc}</div>
        <label>Wähle Klasse</label>
        <select id="clsSel" ${L.lvl<10?"disabled":""}>
          ${window.IronQuestClasses.CLASSES.map(c=>`<option value="${c.id}" ${c.id===clsId?"selected":""}>${c.name}</option>`).join("")}
        </select>
        <div class="hint">${L.lvl<10?"Locked bis Level 10.":"Änderung wirkt sofort auf XP-Multiplikatoren."}</div>
      </div>


      <div class="card soft">
        <h2>Periodization</h2>
        <p class="hint">Wähle deinen Trainings-Fokus. Wir passen XP-Bias leicht an, ohne die Balance zu zerstören.</p>
        <label>Phase</label>
        <select id="periSel">
          ${window.IronQuestPeriodization.MODES.map(m=>`<option value="${m.key}" ${m.key===window.IronQuestPeriodization.getMode().key?"selected":""}>${m.name}</option>`).join("")}
        </select>
        <div class="hint" id="periDesc"></div>
      </div>

      <div class="card">
        <h2>Passive Skilltree</h2>
        <p class="hint">+2% XP pro Punkt (max 25%).</p>
        <div class="row2" id="passiveGrid"></div>
      </div>

      <div class="card">
        <h2>Active Skills</h2>
        <p class="hint">Aktive Skills haben 24h Cooldown.</p>
        <ul class="list" id="activeList"></ul>
      </div>

      <div class="card">
        <h2>Set Collection</h2>
        <p class="hint">Sammle Set-Teile, aktiviere 2/4 und 4/4 Boni durch Ausrüsten./</p>
        <div id="setCollectionMount"></div>
      </div>
    `;

    // start date
    container.querySelector("#saveStart").onclick=()=>{
      const v=container.querySelector("#startDate").value;
      if(!v) return;
      window.IronQuestProgression.setStartDate(v);
      (window.Toast && window.Toast.toast)("Startdatum gespeichert", v);
    };
    container.querySelector("#todayStart").onclick=()=>{
      const t=window.Utils.isoDate(new Date());
      container.querySelector("#startDate").value=t;
      window.IronQuestProgression.setStartDate(t);
      (window.Toast && window.Toast.toast)("Startdatum gesetzt", t);
    };

    // class
    container.querySelector("#clsSel").onchange=(e)=>{
      window.IronQuestClasses.set(e.target.value);
      (window.Toast && window.Toast.toast)("Klasse gewählt", window.IronQuestClasses.meta(e.target.value).name);
    };

    // Periodization wiring
    const periSel = container.querySelector("#periSel");
    const periDesc = container.querySelector("#periDesc");
    const updPeri = ()=>{
      const m = window.IronQuestPeriodization.getMode();
      periDesc.textContent = m.desc + (m.changedAt ? ` (since ${m.changedAt})` : "");
    };
    if(periSel){
      periSel.onchange=()=>{
        window.IronQuestPeriodization.setMode(periSel.value);
        (window.Toast && window.Toast.toast)("Phase updated", window.IronQuestPeriodization.getMode().name);
        updPeri();
      };
      updPeri();
    }


    // passive grid
    const grid=container.querySelector("#passiveGrid");
    grid.innerHTML="";
    types.forEach(t=>{
      const pts = Number((st.passive && st.passive[t]) || 0);
      const mult=window.IronQuestSkilltreeV2.passiveMultiplier(t);
      const card=document.createElement("div");
      card.className="card soft";
      card.style.margin="0";
      card.style.padding="12px";
      card.innerHTML=`
        <div class="itemTop">
          <div><b>${t}</b><div class="hint">XP×${mult.toFixed(2)}</div></div>
          <span class="badge">${pts}</span>
        </div>
        <div class="btnRow">
          <button class="secondary" data-add="${t}">+1</button>
          <button class="danger" data-sub="${t}">-1</button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{
      const t=b.getAttribute("data-add");
      const s=window.IronQuestSkilltreeV2.load();
      s.passive[t]=Math.min(window.IronQuestSkilltreeV2.MAX_PASSIVE, Number(s.passive[t]||0)+1);
      window.IronQuestSkilltreeV2.save(s);
      (window.Toast && window.Toast.toast)("Skill Point", `${t} +1`);
      render(container);
    });
    grid.querySelectorAll("[data-sub]").forEach(b=>b.onclick=()=>{
      const t=b.getAttribute("data-sub");
      const s=window.IronQuestSkilltreeV2.load();
      s.passive[t]=Math.max(0, Number(s.passive[t]||0)-1);
      window.IronQuestSkilltreeV2.save(s);
      render(container);
    });

    // active skills
    const ul=container.querySelector("#activeList");
    ul.innerHTML="";
    window.IronQuestSkilltreeV2.ACTIVE.forEach(a=>{
      const can=window.IronQuestSkilltreeV2.canUseActive(a.id);
      const li=document.createElement("li");
      li.innerHTML=`
        <div class="itemTop">
          <div>
            <b>${a.name}</b>
            <div class="hint">${a.desc}</div>
          </div>
          <button class="secondary" data-use="${a.id}" ${can?"":"disabled"}>Use</button>
        </div>
      `;
      ul.appendChild(li);
    });
    ul.querySelectorAll("[data-use]").forEach(btn=>{
      btn.onclick=()=>{
        const id=btn.getAttribute("data-use");
        const res=window.IronQuestSkilltreeV2.useActive(id);
        if(!res.ok){
          (window.Toast && window.Toast.toast)("Skill", "Cooldown aktiv.");
          return;
        }
        window.__IQ_ACTIVE_BUFFS = { ...res.skill.effect };
        window.IronQuestUIFX.showSystem(`Active Skill used:\n\n${res.skill.name}\n${res.skill.desc}`);
        render(container);
      };
    });

    // set collection
    try{
      if(window.IronQuestCollections && typeof window.IronQuestCollections.render === 'function'){
        window.IronQuestCollections.render(container.querySelector('#setCollectionMount'));
      }
    }catch(e){}

  }

  window.IronQuestSkillsScreen={ render };
})();
