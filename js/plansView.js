(() => {
  "use strict";

  function esc(s){
    return String(s||"").replace(/[&<>\"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m]));
  }

  function getState(){
    return window.IronQuestPlans?.getState?.() || { activeId:"planA", plans:[{id:"planA", name:"Plan A", items:[]}] };
  }

  function getActivePlan(st){
    return st.plans.find(p=>p.id===st.activeId) || st.plans[0];
  }

  function findExerciseMeta(name){
    try{ return window.IronQuestExercises?.findByName?.(name) || null; }catch{ return null; }
  }

  function toItemRow(p, it){
    const meta = findExerciseMeta(it.name);
    const hint = meta ? `${meta.type} • ${meta.muscleGroup}${meta.subGroup?" / "+meta.subGroup:""}` : "";
    const rs = meta ? meta.recSets : "";
    const rr = meta ? meta.recReps : "";
    const setsV = (it.sets ?? "");
    const repsV = (it.reps ?? "");

    return `
      <div class="planItem" data-ex="${esc(it.name)}">
        <div class="planItemTop">
          <div class="planItemName"><b>${esc(it.name)}</b><div class="hint">${esc(hint)}</div></div>
          <div class="planBtns">
            <button class="iconBtn" data-move="up" title="Up">▲</button>
            <button class="iconBtn" data-move="down" title="Down">▼</button>
            <button class="iconBtn danger" data-del="1" title="Remove">✕</button>
          </div>
        </div>
        <div class="planParams">
          <label class="miniField"><span>Sets</span><input inputmode="numeric" pattern="[0-9]*" class="pSets" value="${esc(setsV)}" placeholder="${esc(String(rs||""))}" /></label>
          <label class="miniField"><span>Reps</span><input inputmode="numeric" pattern="[0-9]*" class="pReps" value="${esc(repsV)}" placeholder="${esc(String(rr||""))}" /></label>
          <button class="btn small" data-log="1">Log</button>
        </div>

        <div class="planWeek" style="margin-top:14px;">
          <div class="itemTop">
            <div>
              <h3 style="margin:0;">Wochenansicht</h3>
              <div class="hint">Lege fest, welche Plan-Übungen an welchem Wochentag angezeigt werden. (Home zeigt automatisch „Today Plan“.)</div>
            </div>
          </div>

          <div class="weekDays" id="weekDays">
            ${[
              ["mon","Mo"],["tue","Di"],["wed","Mi"],["thu","Do"],["fri","Fr"],["sat","Sa"],["sun","So"]
            ].map(([k,l])=>`<button class="weekDayBtn ${k===selDay?"active":""}" data-day="${k}">${l}</button>`).join("")}
          </div>

          <div class="weekControls">
            <label class="field" style="flex:1;">
              <span>Übung zum Tag hinzufügen</span>
              <div class="row" style="gap:8px;">
                <select id="weekAddSel" style="flex:1;">
                  <option value="">Select…</option>
                  ${(p.items||[]).map(it=>`<option value="${esc(it.name)}">${esc(it.name)}</option>`).join("")}
                </select>
                <button class="btn" id="weekAddBtn">Add</button>
              </div>
            </label>
          </div>

          <div class="weekList" id="weekList" data-day="${selDay}">
            ${(p.week && p.week[selDay] && p.week[selDay].length) ? p.week[selDay].map(name=>{
              const it = (p.items||[]).find(x=>x.name===name);
              const sets = it?.sets ? `${esc(it.sets)}x` : "";
              const reps = it?.reps ? `${esc(it.reps)}` : "";
              const sub = (sets||reps) ? `${sets}${reps}` : "";
              return `
                <div class="weekRow" data-ex="${esc(name)}">
                  <div class="wName">${esc(name)} ${sub?`<span class="pill small">${sub}</span>`:""}</div>
                  <div class="wBtns">
                    <button class="btn small" data-wlog>Log</button>
                    <button class="btn small danger" data-wdel>Remove</button>
                  </div>
                </div>
              `;
            }).join("") : `<div class="hint">Für diesen Tag sind noch keine Übungen geplant.</div>`}
          </div>
        </div>

      </div>
    `;
  }

  function wire(container){
    // add exercise
    const addBtn = container.querySelector("#pAddBtn");
    const sel = container.querySelector("#pAddSel");
    if(addBtn && sel){
      addBtn.onclick = () => {
        const st = getState();
        const p = getActivePlan(st);
        const name = String(sel.value||"").trim();
        if(!name) return;
        const meta = findExerciseMeta(name);
        window.IronQuestPlans?.addExerciseToPlan?.(p.id, name, { sets: meta?.recSets ?? "", reps: meta?.recReps ?? "" });
        render(container);
      };
    }

    // new plan
    container.querySelector("#pNewPlan")?.addEventListener("click", ()=>{
      const name = prompt("Name des Plans?", "New Plan");
      if(!name) return;
      window.IronQuestPlans?.createPlan?.(name);
      render(container);
    });

    // rename / delete / select plan
    const planSel = container.querySelector("#pPlanSel");
    if(planSel){
      planSel.onchange = ()=>{ window.IronQuestPlans?.setActive?.(planSel.value); render(container); };
  

    // weekly schedule
    const weekDays = container.querySelector("#weekDays");
    const weekList = container.querySelector("#weekList");
    const weekAddSel = container.querySelector("#weekAddSel");
    const weekAddBtn = container.querySelector("#weekAddBtn");

    function currentDay(){
      return (weekList && weekList.getAttribute("data-day")) || (window.IronQuestPlans?.dayKeyForDate?.(new Date()) || "mon");
    }
    function setDay(dayKey){
      try{ localStorage.setItem("iq_week_day_sel", String(dayKey||"")); }catch(_){ }
      if(weekList) weekList.setAttribute("data-day", dayKey);
      weekDays?.querySelectorAll("[data-day]").forEach(b=>b.classList.toggle("active", b.getAttribute("data-day")===dayKey));
      // re-render just the list for simplicity
      render(container);
    }

    weekDays?.querySelectorAll("[data-day]").forEach(btn=>{
      btn.addEventListener("click", ()=>setDay(btn.getAttribute("data-day")));
    });

    if(weekAddBtn && weekAddSel){
      weekAddBtn.addEventListener("click", ()=>{
        const st = getState();
        const p = getActivePlan(st);
        const name = String(weekAddSel.value||"").trim();
        if(!name) return;
        window.IronQuestPlans?.assignToDay?.(p.id, currentDay(), name);
        render(container);
      });
    }

    // remove/log within week list
    container.querySelectorAll(".weekRow").forEach(row=>{
      const ex = row.getAttribute("data-ex") || "";
      const st = getState();
      const p = getActivePlan(st);
      row.querySelector("[data-wdel]")?.addEventListener("click", ()=>{
        window.IronQuestPlans?.removeFromDay?.(p.id, currentDay(), ex);
        render(container);
      });
      row.querySelector("[data-wlog]")?.addEventListener("click", ()=>{
        const it = (p.items||[]).find(x=>x.name===ex);
        try{
          window.IronQuestIntent = window.IronQuestIntent || {};
          window.IronQuestIntent.log = {
            date: window.Utils?.isoDate?.(new Date()) || "",
            exercise: ex,
            sets: it?.sets || "",
            reps: it?.reps || "",
          };
        }catch(_){}
        try{ window.IronQuestNav?.go?.("log"); }catch(_){ location.hash="log"; }
      });
    });

  }
    container.querySelector("#pRename")?.addEventListener("click", ()=>{
      const st = getState();
      const p = getActivePlan(st);
      const name = prompt("Neuer Plan-Name", p.name);
      if(!name) return;
      window.IronQuestPlans?.renamePlan?.(p.id, name);
      render(container);
    });
    container.querySelector("#pDelete")?.addEventListener("click", ()=>{
      const st = getState();
      const p = getActivePlan(st);
      if(!confirm(`Plan „${p.name}“ löschen?`)) return;
      window.IronQuestPlans?.removePlan?.(p.id);
      render(container);
    });

    // item actions
    container.querySelectorAll(".planItem").forEach(row=>{
      const ex = row.getAttribute("data-ex") || "";
      const st = getState();
      const p = getActivePlan(st);

      row.querySelector("[data-del]")?.addEventListener("click", ()=>{
        window.IronQuestPlans?.removeExerciseFromPlan?.(p.id, ex);
        render(container);
      });
      row.querySelectorAll("[data-move]").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          window.IronQuestPlans?.moveExercise?.(p.id, ex, btn.getAttribute("data-move"));
          render(container);
        });
      });

      const setsEl = row.querySelector(".pSets");
      const repsEl = row.querySelector(".pReps");
      const persist = ()=>{
        window.IronQuestPlans?.setParams?.(p.id, ex, setsEl?.value, repsEl?.value);
      };
      setsEl?.addEventListener("change", persist);
      repsEl?.addEventListener("change", persist);
      setsEl?.addEventListener("blur", persist);
      repsEl?.addEventListener("blur", persist);

      // 1-tap log intent
      row.querySelector("[data-log]")?.addEventListener("click", ()=>{
        try{
          window.IronQuestIntent = window.IronQuestIntent || {};
          window.IronQuestIntent.log = {
            date: window.Utils?.isoDate?.(new Date()) || "",
            exercise: ex,
            sets: setsEl?.value || "",
            reps: repsEl?.value || "",
          };
        }catch(_){ }
        try{ window.IronQuestNav?.go?.("log"); }catch(_){ location.hash = "log"; }
      });
    });
  }

  async function render(container){
    const st = getState();
    const p = getActivePlan(st);
    const allExercises = (window.IronQuestExercises?.list?.() || window.IronQuestExercises?.EXERCISES || []).map(x=>x.name).filter(Boolean);
    const todayKey = window.IronQuestPlans?.dayKeyForDate?.(new Date()) || "mon";
    const selDay = (localStorage.getItem("iq_week_day_sel") || "").trim() || todayKey;
    allExercises.sort((a,b)=>String(a).localeCompare(String(b)));

    container.innerHTML = `
      <div class="card soft">
        <div class="itemTop">
          <div>
            <h2>Plans</h2>
            <div class="hint">Passe Übungen an (Sets/Reps). Tap „Log“ um mit einem Klick ins Log zu springen.</div>
          </div>
          <div class="row" style="gap:8px; align-items:center;">
            <button class="btn small" id="pNewPlan">+ Plan</button>
            <button class="btn small" id="pRename">Rename</button>
            <button class="btn small danger" id="pDelete">Delete</button>
          </div>
        </div>

        <div class="row" style="gap:10px; align-items:end; margin-top:8px;">
          <label class="field" style="flex:1;">
            <span>Active plan</span>
            <select id="pPlanSel">
              ${st.plans.map(x=>`<option value="${esc(x.id)}" ${x.id===st.activeId?"selected":""}>${esc(x.name)}</option>`).join("")}
            </select>
          </label>
          <label class="field" style="flex:2;">
            <span>Add exercise</span>
            <div class="row" style="gap:8px;">
              <select id="pAddSel" style="flex:1;">
                <option value="">Select…</option>
                ${allExercises.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("")}
              </select>
              <button class="btn" id="pAddBtn">Add</button>
            </div>
          </label>
        </div>

        <div class="planList" style="margin-top:12px;">
          ${(p.items && p.items.length) ? p.items.map(it=>toItemRow(p,it)).join("") : `<div class="hint">Noch leer. Füge Übungen hinzu oder nutze im Log „Zum Plan hinzufügen“.</div>`}
        </div>

        <div class="planWeek" style="margin-top:14px;">
          <div class="itemTop">
            <div>
              <h3 style="margin:0;">Wochenansicht</h3>
              <div class="hint">Lege fest, welche Plan-Übungen an welchem Wochentag angezeigt werden. (Home zeigt automatisch „Today Plan“.)</div>
            </div>
          </div>

          <div class="weekDays" id="weekDays">
            ${[
              ["mon","Mo"],["tue","Di"],["wed","Mi"],["thu","Do"],["fri","Fr"],["sat","Sa"],["sun","So"]
            ].map(([k,l])=>`<button class="weekDayBtn ${k===selDay?"active":""}" data-day="${k}">${l}</button>`).join("")}
          </div>

          <div class="weekControls">
            <label class="field" style="flex:1;">
              <span>Übung zum Tag hinzufügen</span>
              <div class="row" style="gap:8px;">
                <select id="weekAddSel" style="flex:1;">
                  <option value="">Select…</option>
                  ${(p.items||[]).map(it=>`<option value="${esc(it.name)}">${esc(it.name)}</option>`).join("")}
                </select>
                <button class="btn" id="weekAddBtn">Add</button>
              </div>
            </label>
          </div>

          <div class="weekList" id="weekList" data-day="${selDay}">
            ${(p.week && p.week[selDay] && p.week[selDay].length) ? p.week[selDay].map(name=>{
              const it = (p.items||[]).find(x=>x.name===name);
              const sets = it?.sets ? `${esc(it.sets)}x` : "";
              const reps = it?.reps ? `${esc(it.reps)}` : "";
              const sub = (sets||reps) ? `${sets}${reps}` : "";
              return `
                <div class="weekRow" data-ex="${esc(name)}">
                  <div class="wName">${esc(name)} ${sub?`<span class="pill small">${sub}</span>`:""}</div>
                  <div class="wBtns">
                    <button class="btn small" data-wlog>Log</button>
                    <button class="btn small danger" data-wdel>Remove</button>
                  </div>
                </div>
              `;
            }).join("") : `<div class="hint">Für diesen Tag sind noch keine Übungen geplant.</div>`}
          </div>
        </div>

      </div>
    `;

    wire(container);
  }

  window.IronQuestPlansView = { render };
})();
