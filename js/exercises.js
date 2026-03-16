(() => {
  "use strict";

  const KEY = "iq_plans_v12";
  const WEEK_KEYS = ["mon","tue","wed","thu","fri","sat","sun"];

  function normalizeWeek(w){
    const src = (w && typeof w === "object") ? w : {};
    const out = {};
    for(const k of WEEK_KEYS){
      const arr = Array.isArray(src[k]) ? src[k].map(x=>String(x||"").trim()).filter(Boolean) : [];
      out[k] = Array.from(new Set(arr));
    }
    return out;
  }

  function defaultPlans(){
    return [
      {
        id:"planA",
        name:"Plan A",
        note:"Montag Unterkörper A + Dienstag Oberkörper A • Joggen separat im Run-Tab",
        items:[
          { name:"Bulgarian Split Squat", sets:"4", reps:"8-10", unit:"Unterkörper A" },
          { name:"Romanian Deadlift", sets:"4", reps:"8-10", unit:"Unterkörper A" },
          { name:"Goblet Squat", sets:"3", reps:"10-12", unit:"Unterkörper A" },
          { name:"Hip Thrust", sets:"3", reps:"10-12", unit:"Unterkörper A" },
          { name:"Plank", sets:"3", reps:"45-60 s", unit:"Unterkörper A" },
          { name:"Dumbbell Row", sets:"4", reps:"8-12", unit:"Oberkörper A" },
          { name:"Push-ups", sets:"4", reps:"nahe Muskelversagen", unit:"Oberkörper A" },
          { name:"Shoulder Press", sets:"3", reps:"8-10", unit:"Oberkörper A" },
          { name:"Renegade Row", sets:"3", reps:"8-10", unit:"Oberkörper A" },
          { name:"Side Plank", sets:"3", reps:"30-40 s", unit:"Oberkörper A" },
          { name:"Seitheben", sets:"3", reps:"12-15", unit:"Optional" }
        ],
        week: normalizeWeek({
          mon:["Bulgarian Split Squat","Romanian Deadlift","Goblet Squat","Hip Thrust","Plank"],
          tue:["Dumbbell Row","Push-ups","Shoulder Press","Renegade Row","Side Plank","Seitheben"]
        })
      },
      {
        id:"planB",
        name:"Plan B",
        note:"Donnerstag Unterkörper B + Freitag Oberkörper B • Samstag optional Lauf/Mobility",
        items:[
          { name:"Goblet Squat", sets:"4", reps:"8-10", unit:"Unterkörper B" },
          { name:"Single-Leg Romanian Deadlift", sets:"3", reps:"10", unit:"Unterkörper B" },
          { name:"Reverse Lunge", sets:"3", reps:"10 je Seite", unit:"Unterkörper B" },
          { name:"Hip Thrust", sets:"3", reps:"12", unit:"Unterkörper B" },
          { name:"Hollow Hold", sets:"3", reps:"30-40 s", unit:"Unterkörper B" },
          { name:"Calf Raises", sets:"3", reps:"15-20", unit:"Optional" },
          { name:"Renegade Row", sets:"4", reps:"8-10", unit:"Oberkörper B" },
          { name:"Floor Press (Kurzhantel)", sets:"4", reps:"8-10", unit:"Oberkörper B" },
          { name:"Shoulder Press", sets:"3", reps:"10", unit:"Oberkörper B" },
          { name:"Push-ups", sets:"3", reps:"max", unit:"Oberkörper B" },
          { name:"Russian Twist", sets:"3", reps:"20", unit:"Oberkörper B" },
          { name:"Farmer Carry", sets:"3", reps:"30-40 s", unit:"Optional" }
        ],
        week: normalizeWeek({
          thu:["Goblet Squat","Single-Leg Romanian Deadlift","Reverse Lunge","Hip Thrust","Hollow Hold","Calf Raises"],
          fri:["Renegade Row","Floor Press (Kurzhantel)","Shoulder Press","Push-ups","Russian Twist","Farmer Carry"]
        })
      }
    ];
  }

  function defaultState(){ return { activeId:"planA", plans: defaultPlans() }; }
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY) || "null"); }catch(_){ return null; } }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); try{ window.IronQuestState?.invalidate?.(); }catch(_){ } }

  function normalizeItem(it){
    if(typeof it === 'string') return { name:it, sets:'', reps:'', unit:'' };
    return {
      name:String(it?.name || it?.exercise || '').trim(),
      sets:it?.sets == null ? '' : String(it.sets),
      reps:it?.reps == null ? '' : String(it.reps),
      unit:it?.unit == null ? '' : String(it.unit)
    };
  }

  function normalizeState(st){
    const s = st && Array.isArray(st.plans) && st.plans.length ? st : defaultState();
    s.plans = s.plans.map(p => ({
      id:String(p.id || ('plan_' + Date.now())),
      name:String(p.name || 'Plan'),
      note:String(p.note || ''),
      items:Array.isArray(p.items) ? p.items.map(normalizeItem).filter(x=>x.name) : [],
      week: normalizeWeek(p.week)
    }));
    if(!s.plans.some(p=>p.id===s.activeId)) s.activeId = s.plans[0].id;
    return s;
  }

  function getState(){ return normalizeState(load()); }
  function setState(st){ save(normalizeState(st)); }
  function state(){ return getState(); }
  function getActive(){ const st=getState(); return st.plans.find(p=>p.id===st.activeId) || st.plans[0]; }
  function setActive(id){ const st=getState(); if(st.plans.some(p=>p.id===id)){ st.activeId=id; save(st); } }
  function createPlan(name){ const st=getState(); const id='plan_'+Date.now(); st.plans.push({ id, name:String(name||'Plan'), note:'', items:[], week:normalizeWeek(null) }); st.activeId=id; save(st); return id; }
  function renamePlan(id,name){ const st=getState(); const p=st.plans.find(x=>x.id===id); if(p){ p.name=String(name||p.name); save(st);} }
  function removePlan(id){ const st=getState(); st.plans = st.plans.filter(p=>p.id!==id); if(!st.plans.length) st.plans = defaultPlans(); if(!st.plans.some(p=>p.id===st.activeId)) st.activeId=st.plans[0].id; save(st); }

  function addExerciseToPlan(planId,name,params){
    const st=getState(); const p=st.plans.find(x=>x.id===planId); if(!p) return;
    const ex=String(name||'').trim(); if(!ex) return;
    if(!p.items.some(x=>x.name===ex)) p.items.push({ name:ex, sets:String(params?.sets ?? ''), reps:String(params?.reps ?? ''), unit:String(params?.unit ?? '') });
    save(st);
  }
  function addExercise(name){ const p=getActive(); addExerciseToPlan(p.id,name,{}); }
  function removeExerciseFromPlan(planId,name){ const st=getState(); const p=st.plans.find(x=>x.id===planId); if(!p) return; p.items=p.items.filter(x=>x.name!==String(name||'').trim()); for(const k of WEEK_KEYS){ p.week[k]=(p.week[k]||[]).filter(x=>x!==name); } save(st); }
  function removeExercise(name){ const p=getActive(); removeExerciseFromPlan(p.id,name); }
  function moveExercise(planId,name,dir){ const st=getState(); const p=st.plans.find(x=>x.id===planId); if(!p) return; const i=p.items.findIndex(x=>x.name===name); if(i<0) return; const j=dir==='up'?i-1:i+1; if(j<0||j>=p.items.length) return; [p.items[i],p.items[j]]=[p.items[j],p.items[i]]; save(st); }
  function setParams(planId,name,sets,reps){ const st=getState(); const p=st.plans.find(x=>x.id===planId); const it=p?.items.find(x=>x.name===name); if(!it) return; it.sets=sets==null?'':String(sets); it.reps=reps==null?'':String(reps); save(st); }
  function setUnit(planId,name,unit){ const st=getState(); const p=st.plans.find(x=>x.id===planId); const it=p?.items.find(x=>x.name===name); if(!it) return; it.unit=String(unit||''); save(st); }
  function setDayAssignments(planId, dayKey, names){ const st=getState(); const p=st.plans.find(x=>x.id===planId); if(!p) return; p.week[String(dayKey||'').toLowerCase()] = Array.from(new Set((names||[]).map(x=>String(x||'').trim()).filter(Boolean))); save(st); }
  function assignToDay(planId,dayKey,name){ const st=getState(); const p=st.plans.find(x=>x.id===planId); if(!p) return; const k=String(dayKey||'').toLowerCase(); const ex=String(name||'').trim(); if(!ex) return; p.week[k]=p.week[k]||[]; if(!p.week[k].includes(ex)) p.week[k].push(ex); save(st); }
  function removeFromDay(planId,dayKey,name){ const st=getState(); const p=st.plans.find(x=>x.id===planId); if(!p) return; const k=String(dayKey||'').toLowerCase(); p.week[k]=(p.week[k]||[]).filter(x=>x!==String(name||'').trim()); save(st); }
  function dayKeyForDate(d){ const day=(d instanceof Date? d : new Date()); return ["sun","mon","tue","wed","thu","fri","sat"][day.getDay()] || 'mon'; }

  window.IronQuestPlans = { getState,setState,state,getActive,setActive,createPlan,renamePlan,removePlan,addExercise,removeExercise,addExerciseToPlan,removeExerciseFromPlan,moveExercise,setParams,setUnit,setDayAssignments,assignToDay,removeFromDay,dayKeyForDate };
})();
