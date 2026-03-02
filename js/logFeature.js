(() => {
  "use strict";

  function escapeHTML(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }
  function formatDesc(text){
    const t=String(text||"").trim();
    if(!t) return "—";
    return t; // already contains \n\n in exercises
  }

  function groupList(exs){
    const map={};
    for(const e of exs){
      const k=e.type;
      map[k]=map[k]||[];
      map[k].push(e);
    }
    return map;
  }

  async function render(container){
    const exs = window.IronQuestExercises.EXERCISES;
    const types = window.IronQuestExercises.TYPES;
    const entries = await window.IronDB.getAllEntries();
    entries.sort((a,b)=> (a.date<b.date?1:-1));

    const today = window.Utils.isoDate(new Date());
    const eqBonus = window.IronQuestEquipment.bonuses();

    container.innerHTML = `
      <div class="card">
        <h2>Training Log</h2>
        <p class="hint">Übungen nach <b>Übungsart</b> wählen. Tag ist frei (Meta). Ausführung wird nur unten angezeigt.</p>
      </div>

      <div class="card">
        <h2>Neuer Eintrag</h2>
        <div class="row2">
          <div>
            <label>Datum</label>
            <input id="lDate" type="date" value="${today}">
          </div>
          <div>
            <label>Day Tag</label>
            <select id="lDay">
              <option value="1">Day 1</option><option value="2">Day 2</option><option value="3">Day 3</option>
              <option value="4">Day 4</option><option value="5">Day 5</option><option value="rest">Rest</option>
            </select>
          </div>
        </div>

        <div class="row2">
          <div>
            <label>Übungsart</label>
            <select id="lType"></select>
          </div>
          <div>
            <label>Suche</label>
            <input id="lSearch" type="text" placeholder="z.B. Squat, Row, Plank">
          </div>
        </div>

        <div class="card soft">
          <h2 id="previewTitle">Preview</h2>
          <p class="hint" id="previewHint">Wähle eine Übung aus der Liste.</p>
          <ul class="list" id="previewList"></ul>
        </div>

        <label>Übung</label>
        <select id="lExercise"></select>

        <div class="row2">
          <div class="pill" id="lRec"><b>Empfohlen:</b> —</div>
          <div class="pill" id="lMeta"><b>Bonus:</b> XP×${eqBonus.globalXp.toFixed(2)} • Gate×${eqBonus.gateDmg.toFixed(2)}</div>
        </div>

        <div class="row2">
          <div>
            <label>Sätze (geleistet)</label>
            <input id="lSets" type="number" step="1" placeholder="z.B. 4">
          </div>
          <div>
            <label>Wdh pro Satz (geleistet)</label>
            <input id="lReps" type="number" step="1" placeholder="z.B. 8">
          </div>
        </div>

        <div class="row2">
          <div class="pill" id="lVol"><b>Volumen:</b> —</div>
          <div class="pill" id="lXp"><b>XP:</b> —</div>
        </div>

        <div class="descBox">
          <div class="descTitle">Ausführung</div>
          <div class="descText" id="lDesc">—</div>
        </div>

        <div class="btnRow">
          <button class="primary" id="lSave">Speichern</button>
          <button class="secondary" id="lUseSkill">Use Active Skill</button>
        </div>
        <p class="hint">Tipp: Active Skill wirkt für die nächste Session (Cooldown 24h).</p>
      </div>

      <div class="card">
        <div class="row2">
          <button class="danger" id="logClear">Alle Einträge löschen</button>
          <div class="pill"><b>Anzahl:</b> ${entries.length}</div>
        </div>
        <ul class="list" id="logList"></ul>
      </div>
    `;

    const typeSel=container.querySelector("#lType");
    types.forEach(t=>{
      const o=document.createElement("option");
      o.value=t; o.textContent=t;
      typeSel.appendChild(o);
    });

    const exSel=container.querySelector("#lExercise");
    const searchEl=container.querySelector("#lSearch");
    const previewList=container.querySelector("#previewList");
    const previewTitle=container.querySelector("#previewTitle");
    const previewHint=container.querySelector("#previewHint");

    const recEl=container.querySelector("#lRec");
    const volEl=container.querySelector("#lVol");
    const xpEl=container.querySelector("#lXp");
    const descEl=container.querySelector("#lDesc");

    // Session scoped buffs (stored in memory)
    let buffs = { globalXp: window.__IQ_ACTIVE_BUFFS?.globalXp || 1, gateDmg: window.__IQ_ACTIVE_BUFFS?.gateDmg || 1, coreXp: window.__IQ_ACTIVE_BUFFS?.coreXp || 1 };
    function updateBonusPill(){
      const eq=window.IronQuestEquipment.bonuses();
      const g = (eq.globalXp*(buffs.globalXp||1));
      const gd = (eq.gateDmg*(buffs.gateDmg||1));
      container.querySelector("#lMeta").innerHTML = `<b>Bonus:</b> XP×${g.toFixed(2)} • Gate×${gd.toFixed(2)}`;
    }
    updateBonusPill();

    function filteredExercises(){
      const t=typeSel.value;
      const q=String(searchEl.value||"").trim().toLowerCase();
      return exs.filter(e=>{
        if(e.type!==t) return false;
        if(!q) return true;
        return e.name.toLowerCase().includes(q) || String(e.group||"").toLowerCase().includes(q);
      });
    }

    function rebuildExerciseSelect(){
      const list=filteredExercises();
      exSel.innerHTML="";
      list.forEach(e=>{
        const o=document.createElement("option");
        o.value=e.name; o.textContent=e.name;
        exSel.appendChild(o);
      });
      if(!list.length){
        const o=document.createElement("option"); o.value=""; o.textContent="Keine Treffer"; exSel.appendChild(o);
      }
    }

    function rebuildPreview(){
      const list=filteredExercises();
      previewTitle.textContent = `Preview: ${typeSel.value}`;
      previewHint.textContent = `${list.length} Übungen • oben clean, Details unten.`;
      previewList.innerHTML="";
      if(!list.length){ previewList.innerHTML="<li>—</li>"; return; }

      list.slice(0,18).forEach(ex=>{
        const li=document.createElement("li");
        li.innerHTML=`
          <div class="itemTop">
            <div style="min-width:0;">
              <b>${escapeHTML(ex.name)}</b>
              <div class="hint">Empfohlen: ${ex.recSets}×${ex.recReps}</div>
              <div class="hint">Typ: ${escapeHTML(ex.type)} • Fokus: ${escapeHTML(ex.group||"—")}</div>
            </div>
            <button class="secondary" data-pick="${escapeHTML(ex.name)}">Wählen</button>
          </div>
        `;
        previewList.appendChild(li);
      });

      previewList.querySelectorAll("[data-pick]").forEach(btn=>{
        btn.onclick=()=>{
          exSel.value=btn.getAttribute("data-pick");
          recalc();
          container.querySelector("#lSets").focus();
        };
      });
    }

    function getSelected(){
      const name=exSel.value;
      return exs.find(e=>e.name===name);
    }

    function recalc(){
      const ex=getSelected();
      const sets=Number(container.querySelector("#lSets").value||0);
      const reps=Number(container.querySelector("#lReps").value||0);

      if(!ex){
        recEl.innerHTML="<b>Empfohlen:</b> —";
        volEl.innerHTML="<b>Volumen:</b> —";
        xpEl.innerHTML="<b>XP:</b> —";
        descEl.textContent="—";
        return { ex:null, sets, reps, xp:0 };
      }
      recEl.innerHTML=`<b>Empfohlen:</b> ${ex.recSets}×${ex.recReps}`;
      const vol=Math.max(0, sets*reps);
      volEl.innerHTML=`<b>Volumen:</b> ${vol}`;
      descEl.textContent = formatDesc(ex.description||"—");

      // buffs include equipment bonuses (applied inside app hook)
      const xp = window.IronQuestXP.calcExerciseXP({
        type: ex.type,
        recSets: ex.recSets,
        recReps: ex.recReps,
        sets, reps,
        entries,
        buffs: { ...buffs, ...window.IronQuestEquipment.bonuses() }
      });
      xpEl.innerHTML=`<b>XP:</b> ${xp||"—"}`;
      return { ex, sets, reps, xp };
    }

    typeSel.onchange=()=>{ rebuildExerciseSelect(); rebuildPreview(); recalc(); };
    searchEl.oninput=()=>{ rebuildExerciseSelect(); rebuildPreview(); recalc(); };
    exSel.onchange=recalc;
    container.querySelector("#lSets").oninput=recalc;
    container.querySelector("#lReps").oninput=recalc;

    rebuildExerciseSelect();
    rebuildPreview();
    recalc();

    container.querySelector("#lSave").onclick = async ()=>{
      const {ex,sets,reps,xp}=recalc();
      if(!ex || !sets || !reps) return;

      const date=container.querySelector("#lDate").value || today;
      const week=window.IronQuestProgression.getWeekNumberFor(date);
      const dayTag=container.querySelector("#lDay").value;

      const entry={
        date, week,
        type: ex.type,
        exercise: ex.name,
        detail: `Rec ${ex.recSets}×${ex.recReps} • Did ${sets}×${reps} • Tag ${dayTag}`,
        xp
      };

      await window.IronDB.addEntry(entry);
      window.Toast?.toast("Entry saved", `${ex.name} (+${xp} XP)`);

      // consume one-time session buff if configured
      if(window.__IQ_ACTIVE_BUFFS?.sessions){
        window.__IQ_ACTIVE_BUFFS.sessions -= 1;
        if(window.__IQ_ACTIVE_BUFFS.sessions<=0){
          // reset buffs
          window.__IQ_ACTIVE_BUFFS=null;
          buffs={ globalXp:1, gateDmg:1, coreXp:1 };
        }
      }
      await render(container);
    };

    container.querySelector("#lUseSkill").onclick=()=>{
      // Choose one active skill quickly (simple UI)
      const a=window.IronQuestSkilltreeV2.ACTIVE;
      const pick=a[0]; // default adrenaline
      const res=window.IronQuestSkilltreeV2.useActive(pick.id);
      if(!res.ok){
        window.Toast?.toast("Skill", res.reason==="cooldown" ? "Cooldown aktiv." : "Nicht verfügbar.");
        return;
      }
      // apply buff to next session
      window.__IQ_ACTIVE_BUFFS = { ...res.skill.effect };
      buffs = { globalXp: res.skill.effect.globalXp||1, gateDmg: res.skill.effect.gateDmg||1, coreXp: res.skill.effect.coreXp||1, sessions: res.skill.effect.sessions||0 };
      window.Toast?.toast("Skill activated", res.skill.name);
      updateBonusPill();
    };

    // History list
    const ul=container.querySelector("#logList");
    ul.innerHTML="";
    if(!entries.length){
      ul.innerHTML="<li>—</li>";
    }else{
      entries.slice(0,200).forEach(e=>{
        const li=document.createElement("li");
        li.innerHTML=`
          <div class="itemTop">
            <div>
              <b>${e.date}</b> • W${e.week||"?"} • ${escapeHTML(e.exercise||e.type||"Entry")}
              <div class="hint">${escapeHTML(e.detail||"")}</div>
            </div>
            <span class="badge">${Math.round(e.xp||0)} XP</span>
          </div>
        `;
        ul.appendChild(li);
      });
    }

    container.querySelector("#logClear").onclick=async()=>{
      await window.IronDB.clearAllEntries();
      window.Toast?.toast("Log", "Alle Einträge gelöscht");
      await render(container);
    };
  }

  window.IronQuestLog = { render };
})();
