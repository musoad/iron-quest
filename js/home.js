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
      li.textContent="Der aktive Plan ist noch leer.";
      listEl.appendChild(li);
      return;
    }
    for(const it of plan.items){
      const name = typeof it === "string" ? it : it.name;
      const unit = typeof it === "string" ? "" : (it.unit || "");
      const sr = typeof it === "string" ? "" : `${it.sets||""} ${it.reps||""}`.trim();
      const li=document.createElement("li");
      li.innerHTML = `
        <div class="itemTop">
          <div style="min-width:0;">
            <b>${escapeHTML(name)}</b>
            <div class="small">${escapeHTML(unit)} ${sr ? '• ' + escapeHTML(sr) : ''}</div>
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
    const trainingFocus = 'Kraft + Joggen';

    container.innerHTML = `
      <div class="card">
        <h2>Training Log</h2>
        <p class="hint">Wähle erst <b>Muskelgruppe</b> → dann <b>Übung</b>. Die Liste ist auf deinen Plan mit Kraft, Joggen, Warm-up und Mobility reduziert.</p>
      </div>

      <div class="card">
        <h2>Trainingspläne A / B</h2>
        <p class="hint">Die App ist auf deinen Oberkörper-/Unterkörper-Plan optimiert. Wähle Plan A oder Plan B und schalte bei Bedarf auf „Nur Plan“.</p>

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
        <div class="row2" style="grid-template-columns: 1fr auto; align-items:end;">
          <select id="lExercise"></select>
          <button class="favBtn" id="lFav" title="Favorite" aria-label="Favorite">⭐</button>
        </div>

        <div class="quickAddBox">
          <div class="chipHdr"><div class="t">Quick add</div><div class="miniHint">Tap → prefilled</div></div>
          <div class="chipRow" id="logFavRow" style="margin-bottom:8px;"></div>
          <div class="chipRow" id="logRecentRow"></div>
        </div>

        <div class="row2">
          <div class="pill" id="lRec"><b>Empfohlen:</b> —</div>
          <div class="pill" id="lDiff"><b>Schwierigkeit:</b> —</div>
        </div>

        <div class="row2">
          <div class="pill" id="lNext"><b>Nächstes Ziel:</b> —</div>
          <div class="pill" id="lMeta"><b>Fokus:</b> ${trainingFocus}</div>
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
                  </div>
        <p class="hint">„Zum Plan hinzufügen“ speichert die Übung im aktiven Plan. Joggen bleibt im Run-Tab separat mit eigenem XP-System erhalten.</p>
      </div>

      <div class="card">
        <div class="row2">
          <button class="danger" id="logClear">Alle Einträge löschen</button>
          <div class="pill"><b>Anzahl:</b> ${entries.length}</div>
        </div>
        <div class="btnRow" style="margin-top:10px;">
          <button class="secondary" id="openHistory">History öffnen</button>
        </div>
        <p class="hint">Die komplette Übungshistorie ist jetzt im Tab <b>History</b> (mit Löschen einzelner Einträge).</p>
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
    const favBtn = container.querySelector("#lFav");
    const favRow = container.querySelector("#logFavRow");
    const recentRow = container.querySelector("#logRecentRow");

    const FAV_KEY = "iq_fav_ex";
    function getFavs(){
      try{ return JSON.parse(localStorage.getItem(FAV_KEY)||"[]") || []; }catch(_){ return []; }
    }
    function setFavs(list){
      try{ localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(new Set(list)).slice(0,30))); }catch(_){ }
    }
    function isFav(name){ return getFavs().includes(String(name||"")); }
    function toggleFav(name){
      const n = String(name||"").trim();
      if(!n) return;
      const favs = getFavs();
      const idx = favs.indexOf(n);
      if(idx>=0) favs.splice(idx,1); else favs.unshift(n);
      setFavs(favs);
    }

    function escapeHtml(s){
      return String(s||"")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;");
    }

    function updateFavUI(){
      if(!favBtn) return;
      const cur = String(exSel.value||"").trim();
      const on = cur && isFav(cur);
      favBtn.classList.toggle("active", !!on);
      favBtn.title = on ? "Unfavorite" : "Favorite";
    }

    async function getRecent(limit=10){
      try{
        const es = await window.IronDB.getAllEntries();
        es.sort((a,b)=> (a.date<b.date?1:-1));
        const seen = new Set();
        const out=[];
        for(const e of es){
          const name = String(e.exercise||"").trim();
          if(!name) continue;
          if(seen.has(name)) continue;
          seen.add(name);
          out.push(name);
          if(out.length>=limit) break;
        }
        return out;
      }catch(_){ return []; }
    }

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
    exSel.addEventListener("change", ()=>{ onPick(); updateFavUI(); });

    if(favBtn){
      favBtn.addEventListener("click", ()=>{
        const cur = String(exSel.value||"").trim();
        if(!cur) return;
        toggleFav(cur);
        updateFavUI();
        renderQuickChips();
        (window.Toast && window.Toast.show) ? window.Toast.show("Favorites", isFav(cur)?"Added" : "Removed") : null;
      });
    }

    // init subgroups + exercises
    fillSubGroups();
    refreshExercises();

    function pickByName(exName){
      const ex = window.IronQuestExercises.findByName(String(exName||"").trim());
      if(!ex) return;
      mgSel.value = ex.muscleGroup;
      fillSubGroups();
      sgSel.value = ex.subGroup;
      const list = getFilteredExercises();
      exSel.innerHTML = "";
      for(const e of list){
        const o=document.createElement("option");
        o.value=e.name; o.textContent=e.name;
        exSel.appendChild(o);
      }
      exSel.value = ex.name;
      onPick();
      updateFavUI();
      setTimeout(()=>{ try{ setsEl && setsEl.focus(); }catch(_){} }, 80);
    }

    async function renderQuickChips(){
      const favs = getFavs();
      const recent = await getRecent(10);

      if(favRow){
        favRow.innerHTML = favs.length
          ? favs.slice(0,10).map(n=>`<button class="chip star" data-ex="${escapeHtml(n)}">⭐ ${escapeHtml(n)}</button>`).join("")
          : `<div class="miniHint">Star an exercise to pin it here.</div>`;
        favRow.querySelectorAll("[data-ex]").forEach(b=>b.addEventListener("click", ()=>pickByName(b.getAttribute("data-ex"))));
      }
      if(recentRow){
        recentRow.innerHTML = recent.length
          ? recent.map(n=>`<button class="chip" data-ex="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join("")
          : `<div class="miniHint">Log something to see recents.</div>`;
        recentRow.querySelectorAll("[data-ex]").forEach(b=>b.addEventListener("click", ()=>pickByName(b.getAttribute("data-ex"))));
      }
    }

    renderQuickChips();

    // One-tap intent (from Home quick-log etc.)
    function applyIntent(){
      try{
        const intent = window.IronQuestIntent && window.IronQuestIntent.log;
        if(!intent) return;
        // date
        if(intent.date && dateEl) dateEl.value = String(intent.date).slice(0,10);

        const exName = String(intent.exercise||"").trim();
        if(exName){
          const ex = window.IronQuestExercises.findByName(exName);
          if(ex){
            mgSel.value = ex.muscleGroup;
            fillSubGroups();
            sgSel.value = ex.subGroup;
            // refresh list for this subgroup
            const list = getFilteredExercises();
            exSel.innerHTML = "";
            for(const e of list){
              const o=document.createElement("option");
              o.value=e.name; o.textContent=e.name;
              exSel.appendChild(o);
            }
            exSel.value = ex.name;
            onPick();

            // optional preset from Plans (sets/reps)
            if(intent.sets && setsEl) setsEl.value = String(intent.sets);
            if(intent.reps && repsEl) repsEl.value = String(intent.reps);
            try{ recalc(); }catch(_){ }
            // scroll into view (mobile)
            setTimeout(()=>{ try{ exSel.scrollIntoView({ block:"center", behavior:"smooth" }); }catch(_){} }, 80);
          }
        }

        // clear intent
        window.IronQuestIntent.log = null;
      }catch(_){ }
    }
    applyIntent();

    function coachText(ex, sets, reps){
      const fatigue = (typeof window.IronQuestCoachPlus?.fatigueScore === "function") ? (window.IronQuestCoachPlus.fatigueScore(entries) || 0) : 0;
      if(fatigue >= 75) return "Müde → Deload empfohlen (−1 Satz oder −2 Wdh).";
      if(fatigue >= 55) return "Achte auf saubere Technik, nicht grinden.";
      if(Number(sets||0) && Number(reps||0) && (sets>=ex.recSets && reps>=ex.recReps)) return "Stabil! Nächstes Mal +1 Wdh.";
      return "Ziel: Empfehlung sauber treffen.";
    }

    function onPick(){
      updateFavUI();
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

      const fatigue = (typeof window.IronQuestCoachPlus?.fatigueScore === "function") ? (window.IronQuestCoachPlus.fatigueScore(entries) || 0) : 0;
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

      const buffs = null;

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

      const buffs = null;
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
      // store recommended params by default, can be edited in Plan view
      window.IronQuestPlans.addExerciseToPlan(active.id, ex.name, { sets: ex.recSets, reps: ex.recReps });
      refreshPlans();
      refreshExercises();
      (window.Toast && (window.Toast.show) && window.Toast.show)("Zum Plan hinzugefügt", `${active.name}: ${ex.name}`);
    });
    // Clear log
    container.querySelector("#logClear").addEventListener("click", async ()=>{
      if(!confirm("Wirklich alle Einträge löschen?")) return;
      await (window.IronDB.clearAllEntries ? window.IronDB.clearAllEntries() : window.IronDB.clearEntries());
      (window.Toast && (window.Toast.show) && window.Toast.show)("Gelöscht", "Alle Entries entfernt.");
      await render(container);
    });

    const openHistory = container.querySelector("#openHistory");
    if(openHistory){
      openHistory.onclick = ()=>{ try{ window.IronQuestNav?.go?.('history'); }catch(_){ location.hash='history'; } };
    }
  }

  window.IronQuestLog = { render };
  window.IronQuestLogFeature = window.IronQuestLog; // alias
})();
