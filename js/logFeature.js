(() => {
  "use strict";

  function escapeHTML(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  function formatDesc(text){
    const t = String(text||"").trim();
    return t || "—"; // already contains \n\n
  }

  function stars(n){
    const d = Math.max(1, Math.min(5, Number(n||1)));
    return "★".repeat(d) + "☆".repeat(5-d);
  }

  function safeGetPlansState(){
    const P = window.IronQuestPlans;
    if(P && typeof P.getState === "function") return P.getState();
    if(P && typeof P.state === "function") return P.state();
    return { activeId:"planA", plans:[{id:"planA", name:"Plan A", items:[]}] };
  }

  function safeGetActivePlan(){
    const P = window.IronQuestPlans;
    if(P && typeof P.getActive === "function") return P.getActive();
    const st = safeGetPlansState();
    const plans = st && st.plans ? st.plans : [];
    return plans.find(p=>p.id===st.activeId) || plans[0] || { id:"planA", name:"Plan A", items:[] };
  }

  function safeSetActivePlan(id){
    const P = window.IronQuestPlans;
    if(P && typeof P.setActive === "function") return P.setActive(id);
    try{
      const st = safeGetPlansState();
      st.activeId = id;
      if(P && typeof P.setState === "function") P.setState(st);
    }catch{}
  }


  function renderPlanList(listEl, plan, onAction){
    listEl.innerHTML = "";
    if(!plan || !(plan.items && plan.items.length)){
      const li=document.createElement("li");
      li.className="hint";
      li.textContent="Noch keine Übungen im Plan. Wähle eine Übung und klicke „Zum Plan hinzufügen“.";
      listEl.appendChild(li);
      return;
    }
    for(const name of plan.items){
      const li=document.createElement("li");
      li.innerHTML = `
        <div class="itemTop">
          <div style="min-width:0;">
            <b>${escapeHTML(name)}</b>
            <div class="small">Im aktiven Plan</div>
          </div>
          <div class="bossActions">
            <button class="secondary" data-a="up" data-n="${escapeHTML(name)}">↑</button>
            <button class="secondary" data-a="down" data-n="${escapeHTML(name)}">↓</button>
            <button class="danger" data-a="remove" data-n="${escapeHTML(name)}">✕</button>
          </div>
        </div>
      `;
      li.querySelectorAll("button").forEach(btn=>{
        btn.addEventListener("click", ()=> onAction(btn.dataset.a, btn.dataset.n));
      });
      listEl.appendChild(li);
    }
  }

  async function render(container){
    const entries = await window.IronDB.getAllEntries();
    entries.sort((a,b)=> (a.date<b.date?1:-1));

    const today = window.Utils.isoDate(new Date());
    // Equipment can be missing/partially loaded on some clients (iOS/Safari caching).
    // Always normalize bonus object to avoid "undefined.toFixed" crashes.
    const eqBonusRaw = window.IronQuestEquipment?.bonuses?.() || {};
    const eqBonus = {
      globalXp: Number(eqBonusRaw.globalXp ?? 1),
      gateDmg: Number(eqBonusRaw.gateDmg ?? 1)
    };

    container.innerHTML = `
      <div class="card">
        <h2>Training Log</h2>
        <p class="hint">Wähle erst <b>Muskelgruppe</b> → dann <b>Übung</b>. Oben bleibt es clean: keine langen Texte. Die Ausführung steht nur unten.</p>
      </div>

      <div class="card">
        <h2>Trainingsplan (frei)</h2>
        <p class="hint">Erstelle einen Plan (z.B. „Plan A“) und füge Übungen hinzu. Im Log kannst du auf „Nur Plan“ umschalten.</p>

        <div class="row2">
          <div>
            <label>Aktiver Plan</label>
            <select id="pActive"></select>
          </div>
          <div>
            <label>Nur Plan</label>
            <select id="pOnly">
              <option value="0">Alle Übungen</option>
              <option value="1">Nur Übungen aus aktivem Plan</option>
            </select>
          </div>
        </div>

        <div class="btnRow">
          <button class="secondary" id="pNew">Neuen Plan</button>
          <button class="danger" id="pDel">Plan löschen</button>
        </div>

        <div class="card soft">
          <h2>Plan-Inhalt</h2>
          <ul class="list" id="pList"></ul>
        </div>
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
            <label>Muskelgruppe</label>
            <select id="lMG"></select>
          </div>
          <div>
            <label>Untergruppe</label>
            <select id="lSG"></select>
          </div>
        </div>

        <label>Übung</label>
        <select id="lExercise"></select>

        <div class="row2">
          <div class="pill" id="lRec"><b>Empfohlen:</b> —</div>
          <div class="pill" id="lDiff"><b>Schwierigkeit:</b> —</div>
        </div>

        <div class="row2">
          <div class="pill" id="lNext"><b>Nächstes Ziel:</b> —</div>
          <div class="pill" id="lMeta"><b>Bonus:</b> XP×${eqBonus.globalXp.toFixed(2)} • Gate×${eqBonus.gateDmg.toFixed(2)}</div>
        </div>

        <div class="row2">
          <div class="pill" id="lCoach"><b>Coach:</b> —</div>
          <div class="pill" id="lXp"><b>XP:</b> —</div>
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

        <div class="descBox">
          <div class="descTitle">Ausführung</div>
          <div class="descText" id="lDesc">—</div>
        </div>

        <div class="btnRow">
          <button class="primary" id="lSave">Speichern</button>
          <button class="secondary" id="lAddToPlan">Zum Plan hinzufügen</button>
          <button class="secondary" id="lUseSkill">Use Active Skill</button>
        </div>
        <p class="hint">Active Skill wirkt für die nächste Session (Cooldown 24h). „Zum Plan hinzufügen“ speichert die Übung im aktiven Plan.</p>
      </div>

      <div class="card">
        <div class="row2">
          <button class="danger" id="logClear">Alle Einträge löschen</button>
          <div class="pill"><b>Anzahl:</b> ${entries.length}</div>
        </div>
        <ul class="list" id="logList"></ul>
      </div>
    `;

    // ---- Plan UI ----
    const pActive = container.querySelector("#pActive");
    const pOnly = container.querySelector("#pOnly");
    const pNew = container.querySelector("#pNew");
    const pDel = container.querySelector("#pDel");
    const pList = container.querySelector("#pList");

    function refreshPlans(){
      const st = window.IronQuestPlans.getState();
      pActive.innerHTML = "";
      if(!st.plans.length){
        const o=document.createElement("option");
        o.value=""; o.textContent="(kein Plan)";
        pActive.appendChild(o);
      } else {
        for(const p of st.plans){
          const o=document.createElement("option");
          o.value=p.id; o.textContent=p.name;
          if(p.id===st.activeId) o.selected=true;
          pActive.appendChild(o);
        }
      }
      const plan = safeGetActivePlan();
      renderPlanList(pList, plan, (action, exName)=>{
        const active = safeGetActivePlan();
        if(!active) return;
        if(action==="remove") window.IronQuestPlans.removeExerciseFromPlan(active.id, exName);
        if(action==="up") window.IronQuestPlans.moveExercise(active.id, exName, "up");
        if(action==="down") window.IronQuestPlans.moveExercise(active.id, exName, "down");
        refreshPlans();
        refreshExercises(); // update "Nur Plan" filter
      });
    }

    pActive.addEventListener("change", ()=>{
      safeSetActivePlan(pActive.value);
      refreshPlans();
      refreshExercises();
    });

    pOnly.addEventListener("change", ()=>{
      refreshExercises();
    });

    pNew.addEventListener("click", ()=>{
      const name = prompt("Name des Plans (z.B. Plan A):", "Plan A");
      if(name === null) return;
      window.IronQuestPlans.addPlan(name);
      refreshPlans();
      refreshExercises();
      (window.Toast && (window.Toast.show) && window.Toast.show)("Plan erstellt", name);
    });

    pDel.addEventListener("click", ()=>{
      const active = safeGetActivePlan();
      if(!active) return;
      if(!confirm(`Plan „${active.name}“ wirklich löschen?`)) return;
      window.IronQuestPlans.removePlan(active.id);
      refreshPlans();
      refreshExercises();
      (window.Toast && (window.Toast.show) && window.Toast.show)("Plan gelöscht", active.name);
    });

    refreshPlans();

    // ---- Exercise dropdowns ----
    const mgSel = container.querySelector("#lMG");
    const sgSel = container.querySelector("#lSG");
    const exSel = container.querySelector("#lExercise");

    const recPill = container.querySelector("#lRec");
    const diffPill = container.querySelector("#lDiff");
    const nextPill = container.querySelector("#lNext");
    const coachPill = container.querySelector("#lCoach");
    const xpPill = container.querySelector("#lXp");
    const descEl = container.querySelector("#lDesc");

    const dateEl = container.querySelector("#lDate");
    const dayEl  = container.querySelector("#lDay");
    const setsEl = container.querySelector("#lSets");
    const repsEl = container.querySelector("#lReps");

    // Fill muscle groups
    window.IronQuestExercises.MUSCLE_GROUPS.forEach(g=>{
      const o=document.createElement("option");
      o.value=g; o.textContent=g;
      mgSel.appendChild(o);
    });

    function fillSubGroups(){
      const mg = mgSel.value;
      sgSel.innerHTML="";
      const pairs = window.IronQuestExercises.SUB_GROUPS
        .filter(k=>k.startsWith(mg+"|||"))
        .map(k=>k.split("|||")[1]);
      for(const sg of pairs){
        const o=document.createElement("option");
        o.value=sg; o.textContent=sg;
        sgSel.appendChild(o);
      }
    }

    function getFilteredExercises(){
      const mg = mgSel.value;
      const sg = sgSel.value;
      let list = window.IronQuestExercises.EXERCISES.filter(e => e.muscleGroup===mg && e.subGroup===sg);

      if(pOnly.value === "1"){
        const active = safeGetActivePlan();
        const set = new Set((active && active.items) || []);
        list = list.filter(e => set.has(e.name));
      }
      list.sort((a,b)=>a.name.localeCompare(b.name));
      return list;
    }

    function refreshExercises(){
      fillSubGroups();
      const list = getFilteredExercises();

      exSel.innerHTML = "";
      if(!list.length){
        const o=document.createElement("option");
        o.value=""; o.textContent="(keine Übung in dieser Gruppe)";
        exSel.appendChild(o);
      } else {
        for(const e of list){
          const o=document.createElement("option");
          o.value=e.name;
          o.textContent = e.name;
          exSel.appendChild(o);
        }
      }
      onPick();
    }

    mgSel.addEventListener("change", refreshExercises);
    sgSel.addEventListener("change", refreshExercises);
    exSel.addEventListener("change", onPick);

    // init subgroups + exercises
    fillSubGroups();
    refreshExercises();

    function coachText(ex, sets, reps){
      const fatigue = (window.IronQuestCoachPlus && (window.IronQuestCoachPlus.fatigueScore) && window.IronQuestCoachPlus.fatigueScore)(entries) || 0;
      if(fatigue >= 75) return "Müde → Deload empfohlen (−1 Satz oder −2 Wdh).";
      if(fatigue >= 55) return "Achte auf saubere Technik, nicht grinden.";
      if(Number(sets||0) && Number(reps||0) && (sets>=ex.recSets && reps>=ex.recReps)) return "Stabil! Nächstes Mal +1 Wdh.";
      return "Ziel: Empfehlung sauber treffen.";
    }

    function onPick(){
      const ex = window.IronQuestExercises.findByName(exSel.value);
      if(!ex){
        recPill.innerHTML = "<b>Empfohlen:</b> —";
        diffPill.innerHTML = "<b>Schwierigkeit:</b> —";
        nextPill.innerHTML = "<b>Nächstes Ziel:</b> —";
        coachPill.innerHTML = "<b>Coach:</b> —";
        xpPill.innerHTML = "<b>XP:</b> —";
        descEl.textContent = "—";
        return;
      }

      recPill.innerHTML = `<b>Empfohlen:</b> ${ex.recSets}×${ex.recReps}`;
      diffPill.innerHTML = `<b>Schwierigkeit:</b> ${stars(ex.difficulty)} (${ex.difficulty}/5)`;
      descEl.textContent = formatDesc(ex.description);

      // next target based on last entry for that exercise
      const last = entries.find(e => e.exercise === ex.name);
      const lastSets = (last && last.sets) || ex.recSets;
      const lastReps = (last && last.reps) || ex.recReps;

      const fatigue = (window.IronQuestCoachPlus && (window.IronQuestCoachPlus.fatigueScore) && window.IronQuestCoachPlus.fatigueScore)(entries) || 0;
      let tgtSets = ex.recSets;
      let tgtReps = ex.recReps;

      if(fatigue >= 75){
        tgtSets = Math.max(1, ex.recSets - 1);
        tgtReps = Math.max(1, ex.recReps - 2);
      } else if(lastSets >= ex.recSets && lastReps >= ex.recReps){
        tgtReps = Math.min(ex.recReps + 4, Number(lastReps) + 1);
        tgtSets = ex.recSets;
      }
      nextPill.innerHTML = `<b>Nächstes Ziel:</b> ${tgtSets}×${tgtReps}`;
      coachPill.innerHTML = `<b>Coach:</b> ${coachText(ex, setsEl.value, repsEl.value)}`;

      recalc();
    }

    function recalc(){
      const ex = window.IronQuestExercises.findByName(exSel.value);
      if(!ex) return;

      const sets = Number(setsEl.value || 0);
      const reps = Number(repsEl.value || 0);

      const buffs = (window.IronQuestSkilltreeV2 && (window.IronQuestSkilltreeV2.getActiveBuff) && window.IronQuestSkilltreeV2.getActiveBuff)() || null;

      const xp = window.IronQuestXP.calcExerciseXP({
        exercise: ex,
        type: ex.type,
        recSets: ex.recSets,
        recReps: ex.recReps,
        sets, reps,
        entries,
        buffs
      });

      xpPill.innerHTML = `<b>XP:</b> ${isFinite(xp)?xp:0}`;
      coachPill.innerHTML = `<b>Coach:</b> ${coachText(ex, sets, reps)}`;
    }

    setsEl.addEventListener("input", recalc);
    repsEl.addEventListener("input", recalc);

    // Save
    container.querySelector("#lSave").addEventListener("click", async ()=>{
      const ex = window.IronQuestExercises.findByName(exSel.value);
      if(!ex){ (window.Toast && (window.Toast.show) && window.Toast.show)("Fehler", "Bitte Übung wählen."); return; }

      const sets = Number(setsEl.value||0);
      const reps = Number(repsEl.value||0);
      if(!sets || !reps){
        (window.Toast && (window.Toast.show) && window.Toast.show)("Fehler", "Bitte Sätze und Wdh eingeben.");
        return;
      }

      const buffs = (window.IronQuestSkilltreeV2 && (window.IronQuestSkilltreeV2.consumeActiveBuff) && window.IronQuestSkilltreeV2.consumeActiveBuff)() || null;
      const xp = window.IronQuestXP.calcExerciseXP({
        exercise: ex,
        type: ex.type,
        recSets: ex.recSets,
        recReps: ex.recReps,
        sets, reps,
        entries,
        buffs
      });

      const date = dateEl.value;
      const week = window.IronQuestProgression.getWeekNumberFor(date);

      const entry = {
        id: window.Utils.uid(),
        date,
        week,
        dayTag: dayEl.value,
        exercise: ex.name,
        type: ex.type,
        muscleGroup: ex.muscleGroup,
        subGroup: ex.subGroup,
        difficulty: ex.difficulty,
        recSets: ex.recSets,
        recReps: ex.recReps,
        sets,
        reps,
        xp,
        detail: `Did ${sets}x${reps}`
      };

      await window.IronDB.addEntry(entry);
      (window.Toast && (window.Toast.show) && window.Toast.show)("Gespeichert", `${ex.name} • +${xp} XP`);
      (window.IronQuestUIEffects && (window.IronQuestUIEffects.xpBurst) && window.IronQuestUIEffects.xpBurst)(xp);

      // re-render to refresh list and streak/coach
      await render(container);
    });

    // Add to plan
    container.querySelector("#lAddToPlan").addEventListener("click", ()=>{
      const ex = window.IronQuestExercises.findByName(exSel.value);
      const active = safeGetActivePlan();
      if(!active){ (window.Toast && (window.Toast.show) && window.Toast.show)("Kein Plan", "Erstelle zuerst einen Plan."); return; }
      if(!ex){ (window.Toast && (window.Toast.show) && window.Toast.show)("Fehler", "Bitte Übung wählen."); return; }
      window.IronQuestPlans.addExerciseToPlan(active.id, ex.name);
      refreshPlans();
      refreshExercises();
      (window.Toast && (window.Toast.show) && window.Toast.show)("Zum Plan hinzugefügt", `${active.name}: ${ex.name}`);
    });

    // Use skill
    container.querySelector("#lUseSkill").addEventListener("click", ()=>{
      const ok = (window.IronQuestSkilltreeV2 && (window.IronQuestSkilltreeV2.openActiveSkillPicker) && window.IronQuestSkilltreeV2.openActiveSkillPicker)();
      if(!ok) (window.Toast && (window.Toast.show) && window.Toast.show)("Skill", "Keine Skills verfügbar oder Cooldown aktiv.");
    });

    // Clear log
    container.querySelector("#logClear").addEventListener("click", async ()=>{
      if(!confirm("Wirklich alle Einträge löschen?")) return;
      await window.IronDB.clearEntries();
      (window.Toast && (window.Toast.show) && window.Toast.show)("Gelöscht", "Alle Entries entfernt.");
      await render(container);
    });

    // Render log list
    const listEl = container.querySelector("#logList");
    for(const e of entries.slice(0, 80)){
      const li=document.createElement("li");
      li.innerHTML = `
        <div class="itemTop">
          <div style="min-width:0;">
            <b>${escapeHTML(e.exercise)}</b>
            <div class="small">${escapeHTML(e.date)} • W${escapeHTML(e.week)} • ${escapeHTML(e.muscleGroup||"")} / ${escapeHTML(e.subGroup||"")}</div>
            <div class="small">Empf. ${e.recSets}×${e.recReps} • Du ${e.sets}×${e.reps} • ${e.xp} XP</div>
          </div>
          <span class="badge ok">+${e.xp}</span>
        </div>
      `;
      listEl.appendChild(li);
    }
  }

  window.IronQuestLog = { render };
  window.IronQuestLogFeature = window.IronQuestLog; // alias
})();
