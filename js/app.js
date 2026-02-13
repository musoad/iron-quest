// js/app.js
(function(){
  const $ = (id)=>document.getElementById(id);

  const isoDate = (d)=> new Date(d).toISOString().slice(0,10);

  // ⭐ thresholds (wie früher)
  const STAR = { one:1200, two:1600, three:2000 };
  function starsForXp(xp){
    const v = Number(xp||0);
    if(v >= STAR.three) return "⭐⭐⭐";
    if(v >= STAR.two) return "⭐⭐";
    if(v >= STAR.one) return "⭐";
    return "—";
  }

  function groupForType(type){
    // Jogging zählt wie Conditioning
    if(type==="Jogging") return "Conditioning";
    return type;
  }

  // Tabs
  function showTab(tab){
    document.querySelectorAll("nav button[data-tab]").forEach(b=>{
      b.classList.toggle("active", b.getAttribute("data-tab")===tab);
    });
    document.querySelectorAll("main .tab").forEach(sec=>{
      sec.classList.toggle("active", sec.id===tab);
    });
  }

  // Week helper
  function getStartDate(){
    return window.Progression?.getStartDate?.() || isoDate(new Date());
  }
  function weekFor(dateISO){
    return window.Progression?.getWeek?.(dateISO) || 1;
  }

  // Canvas helper (simple line)
  function drawLineChart(canvas, points, valueFn, labelFn){
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);

    if(!points.length){
      ctx.globalAlpha = 0.7;
      ctx.font = "18px system-ui";
      ctx.fillText("Noch keine Daten.", 18, 34);
      ctx.globalAlpha = 1;
      return;
    }

    const pad = 28;
    const innerW = W - pad*2;
    const innerH = H - pad*2;

    const vals = points.map(valueFn);
    const maxV = Math.max(...vals);
    const minV = Math.min(...vals);
    const range = Math.max(1e-6, maxV - minV);

    const pts = points.map((p,i)=>{
      const x = pad + (i/(Math.max(1, points.length-1))) * innerW;
      const y = pad + innerH - ((valueFn(p)-minV)/range)*innerH;
      return {x,y};
    });

    // baseline
    ctx.globalAlpha = 0.25;
    ctx.fillRect(pad, H-pad, innerW, 2);
    ctx.globalAlpha = 1;

    // line
    ctx.beginPath();
    pts.forEach((p,i)=> i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // dots
    pts.forEach(p=>{
      ctx.beginPath();
      ctx.arc(p.x,p.y,4,0,Math.PI*2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    });

    // labels (last)
    const last = points[points.length-1];
    ctx.globalAlpha = 0.8;
    ctx.font = "18px system-ui";
    ctx.fillText(labelFn(last), pad, 22);
    ctx.globalAlpha = 1;
  }

  // Weekly plan (im Dashboard, kein extra Tab)
  function buildWeeklyPlanHTML(week, adaptive){
    const plan = {
      "Mo (Push)": ["DB Floor Press","DB Overhead Press","Deficit Push-Ups","Overhead Trizeps Extension","DB Lateral Raises"],
      "Di (Pull)": ["1-Arm DB Row","Renegade Rows","Reverse Flys","DB Curl (supinated)","Farmer’s Carry"],
      "Mi (Recovery)": ["Recovery + Mobility"],
      "Do (Legs+Core)": ["Bulgarian Split Squats","DB Romanian Deadlift","Goblet Squat","Side Plank","Dead Bug"],
      "Fr (Fullbody)": ["DB Thrusters","Complex: DL→Clean→FS→PP","Goblet Squat"],
      "Sa (Conditioning)": ["Burpees","Mountain Climbers","High Knees","Jumping Jacks"],
      "So (Optional)": ["Walking Desk (optional)","Jogging (optional)"]
    };

    const days = Object.entries(plan);

    let html = `<div class="planGrid">`;
    for(const [day, items] of days){
      html += `<div class="planDay"><h3>${day}</h3>`;
      for(const it of items){
        if(it==="Walking Desk (optional)"){
          html += `
            <div class="planLine">
              <b>Walking Desk</b>
              <span>NEAT • 30–60 Min</span>
            </div>`;
          continue;
        }
        if(it==="Jogging (optional)"){
          html += `
            <div class="planLine">
              <b>Jogging</b>
              <span>END • 2–6 km oder 15–40 Min</span>
            </div>`;
          continue;
        }

        const ex = window.Exercises?.getByName?.(it);
        if(!ex){
          html += `<div class="planLine"><b>${it}</b><span>—</span></div>`;
          continue;
        }
        const rec = window.Exercises?.recommend?.(ex, week, adaptive) || {sets:"—", reps:"—"};
        const setsTxt = (rec.sets==null) ? "—" : `Sets ${rec.sets}`;
        html += `
          <div class="planLine">
            <b>${ex.name}</b>
            <span>${ex.type} • ${setsTxt}, Reps ${rec.reps}</span>
          </div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
    return html;
  }

  // Dashboard
  async function renderDashboard(){
    const el = $("dashboard");
    const entries = await window.IronQuestDB.getAll();
    const today = isoDate(new Date());
    const week = weekFor(today);

    const totalXp = entries.reduce((s,e)=>s+Number(e.xp||0),0);
    const todayXp = entries.filter(e=>e.date===today).reduce((s,e)=>s+Number(e.xp||0),0);
    const weekXp = entries.filter(e=>Number(e.week||0)===week).reduce((s,e)=>s+Number(e.xp||0),0);

    const level = window.Progression?.levelFromXp?.(totalXp) || { lvl:1 };
    const streak = window.Progression?.getStreak?.() || 0;

    // Training day count + ⭐⭐⭐ count in current week
    const dayMap = {};
    for(const e of entries){
      if(Number(e.week||0)!==week) continue;
      dayMap[e.date] = (dayMap[e.date]||0) + Number(e.xp||0);
    }
    const weekDays = Object.keys(dayMap);
    const trainDays = weekDays.filter(d=>dayMap[d] >= STAR.one).length;
    const threeDays = weekDays.filter(d=>dayMap[d] >= STAR.three).length;

    // adaptive hint
    const adaptive = window.Progression?.adaptiveAdjust?.(entries, week) || { setDelta:0, repDelta:0 };

    el.innerHTML = `
      <div class="card">
        <div class="row">
          <div>
            <div class="pill">Woche: W${week}</div>
            <div class="sub">Start: ${getStartDate()}</div>
          </div>
          <div class="pill">Streak ${streak}</div>
        </div>

        <div class="grid2">
          <div class="mini">
            <div class="row"><b>Heute</b><span class="badge">${todayXp} XP</span></div>
            <div class="small">Sterne: <b>${starsForXp(todayXp)}</b></div>
          </div>
          <div class="mini">
            <div class="row"><b>Woche</b><span class="badge">${weekXp} XP</span></div>
            <div class="small">Trainingstage (≥⭐): <b>${trainDays}</b> • ⭐⭐⭐-Tage: <b>${threeDays}</b></div>
          </div>
        </div>

        <div class="mini" style="margin-top:10px;">
          <div class="row"><b>Level</b><span class="badge">Lv ${level.lvl}</span></div>
          <div class="small">Gesamt XP: ${totalXp}</div>
        </div>

        <div class="mini" style="margin-top:10px;">
          <div class="row"><b>Adaptive</b><span class="pill">${adaptive.setDelta>=0?"+":""}${adaptive.setDelta} Sets • ${adaptive.repDelta>=0?"+":""}${adaptive.repDelta} Reps</span></div>
          <div class="small">Hinweis: Adaptive verändert Empfehlungen (nicht deine Einträge).</div>
        </div>
      </div>

      <div class="card">
        <h2>Weekly Plan</h2>
        <p class="sub">Empfohlen pro Tag (automatisch nach Woche/Adaptive).</p>
        ${buildWeeklyPlanHTML(week, adaptive)}
      </div>
    `;
  }

  // Log (mit HowTo + Sterne-Hinweis)
  async function renderLog(){
    const el = $("log");
    const entries = await window.IronQuestDB.getAll();
    entries.sort((a,b)=> (a.date<b.date?1:-1) || ((b.id||0)-(a.id||0)));

    const today = isoDate(new Date());
    const week = weekFor(today);

    const exAll = window.Exercises.getAll();

    el.innerHTML = `
      <div class="card">
        <h2>Log</h2>

        <label>Datum</label>
        <input id="logDate" type="date" value="${today}">

        <div class="row" style="margin-top:8px;">
          <span class="pill">Woche: W<span id="logWeek">${week}</span></span>
          <span class="pill">Sterne: <b id="logStars">—</b></span>
        </div>

        <label>Übung</label>
        <select id="logExercise">
          ${exAll.map(x=>`<option value="${x.name}">${x.name} (${x.type})</option>`).join("")}
        </select>

        <div class="small" id="exMeta"></div>
        <div class="small" id="exHow"></div>

        <label>Tatsächliche Sets</label>
        <input id="logSets" placeholder="z.B. 4">

        <label>Tatsächliche Reps</label>
        <input id="logReps" placeholder="z.B. 10 (oder 8-10)">

        <label>Walking Minuten (nur NEAT)</label>
        <input id="logMinutes" placeholder="z.B. 60">

        <div class="mini" style="margin-top:10px;">
          <div class="row">
            <b>Preview XP: <span id="previewXP">0</span></b>
            <span class="pill" id="previewBreakdown">—</span>
          </div>
        </div>

        <div class="grid2" style="margin-top:10px;">
          <button class="btn" id="saveEntry">Speichern</button>
          <button class="btn danger" id="clearEntries">Alle Einträge löschen</button>
        </div>
      </div>

      <div class="card">
        <h2>Einträge</h2>
        <ul class="list" id="entriesList">
          ${entries.length ? "" : "<li>Noch keine Einträge.</li>"}
        </ul>
      </div>
    `;

    function updateExerciseUI(){
      const date = $("logDate").value;
      const w = weekFor(date);
      $("logWeek").textContent = String(w);

      // stars for that day
      const dayXp = entries.filter(e=>e.date===date).reduce((s,e)=>s+Number(e.xp||0),0);
      $("logStars").textContent = starsForXp(dayXp);

      const exName = $("logExercise").value;
      const ex = window.Exercises.getByName(exName);
      const adaptive = window.Progression?.adaptiveAdjust?.(entries, w) || {setDelta:0, repDelta:0};
      const rec = window.Exercises.recommend(ex, w, adaptive);

      $("exMeta").textContent = ex ? `${ex.muscle} • ${ex.desc} • Empfohlen: ${rec.sets==null?"—":("Sets "+rec.sets)}, Reps ${rec.reps}` : "";
      $("exHow").textContent = ex ? `Ausführung: ${ex.how}` : "";

      // preview xp
      const sets = $("logSets").value;
      const reps = $("logReps").value;
      const minutes = $("logMinutes").value;

      const entry = {
        date,
        week: w,
        exercise: exName,
        type: ex?.type || "Mehrgelenkig",
        sets: sets ? Number(sets) : null,
        reps: reps ? Number(reps) : null,
        minutes: minutes ? Number(minutes) : null
      };
      const res = window.XP.compute(entry);
      $("previewXP").textContent = String(res.xp);
      $("previewBreakdown").textContent = `Base ${res.breakdown.base} • Vol x${res.breakdown.vol} • Streak x${res.breakdown.streak} • Skill x${res.breakdown.skill}`;
    }

    $("logDate").addEventListener("change", updateExerciseUI);
    $("logExercise").addEventListener("change", updateExerciseUI);
    ["logSets","logReps","logMinutes"].forEach(id=>{
      $(id).addEventListener("input", updateExerciseUI);
    });

    $("saveEntry").addEventListener("click", async ()=>{
      const date = $("logDate").value;
      const w = weekFor(date);
      const exName = $("logExercise").value;
      const ex = window.Exercises.getByName(exName);

      const entry = {
        date,
        week: w,
        exercise: exName,
        type: ex?.type || "Mehrgelenkig",
        sets: $("logSets").value ? Number($("logSets").value) : null,
        reps: $("logReps").value ? Number($("logReps").value) : null,
        minutes: $("logMinutes").value ? Number($("logMinutes").value) : null
      };

      const res = window.XP.compute(entry);
      entry.xp = res.xp;
      entry.meta = { breakdown: res.breakdown };

      await window.IronQuestDB.add(entry);

      // streak update
      window.Progression?.updateStreak?.(date);

      await renderAll();
      showTab("log");
    });

    $("clearEntries").addEventListener("click", async ()=>{
      if(confirm("Wirklich alle Einträge löschen?")){
        await window.IronQuestDB.clear();
        await renderAll();
        showTab("log");
      }
    });

    const listEl = $("entriesList");
    if(entries.length){
      const html = entries.map(e=>{
        const extra = [];
        if(e.type==="NEAT" && e.minutes) extra.push(`${e.minutes} Min`);
        if(e.type==="Jogging" && e.distanceKm) extra.push(`${e.distanceKm} km / ${e.timeMin} min`);
        if(e.sets) extra.push(`${e.sets} Sets`);
        if(e.reps) extra.push(`${e.reps} Reps`);
        const extraStr = extra.length ? ` • ${extra.join(" • ")}` : "";
        return `<li><b>${e.date}</b> • ${e.exercise} <span class="badge">${e.xp} XP</span><div class="small">${e.type}${extraStr}</div></li>`;
      }).join("");
      listEl.innerHTML = html;
    }

    updateExerciseUI();
  }

  // Jogging Tab (XP + List + Chart pace)
  async function renderJogging(){
    const el = $("jogging");
    const entries = await window.IronQuestDB.getAll();

    const runs = entries
      .filter(e=> e.type==="Jogging")
      .sort((a,b)=> (a.date<b.date?1:-1) || ((b.id||0)-(a.id||0)));

    const today = isoDate(new Date());
    const week = weekFor(today);

    el.innerHTML = `
      <div class="card">
        <h2>Jogging</h2>
        <p class="sub">Trage Strecke + Zeit ein → XP wird automatisch berechnet.</p>

        <label>Datum</label>
        <input id="runDate" type="date" value="${today}">
        <div class="row" style="margin-top:8px;">
          <span class="pill">Woche: W<span id="runWeek">${week}</span></span>
          <span class="pill">Pace: <b id="runPace">—</b></span>
        </div>

        <label>Strecke (km)</label>
        <input id="runDist" inputmode="decimal" placeholder="z.B. 3.2">

        <label>Zeit (Minuten)</label>
        <input id="runTime" inputmode="decimal" placeholder="z.B. 18">

        <div class="mini" style="margin-top:10px;">
          <div class="row">
            <b>Preview XP: <span id="runXP">0</span></b>
            <span class="pill" id="runBreak">—</span>
          </div>
          <div class="jogHint">Tipp: Pace = Minuten / km. XP steigt mit Strecke + Tempo (Speed Bonus ab ~8 km/h).</div>
        </div>

        <div class="grid2" style="margin-top:10px;">
          <button class="btn" id="saveRun">Run speichern</button>
          <button class="btn danger" id="clearRuns">Alle Runs löschen</button>
        </div>
      </div>

      <div class="card">
        <h2>Verbesserung</h2>
        <p class="sub">Chart zeigt deine Pace (min/km) über Zeit (niedriger = besser).</p>
        <canvas id="runChart" width="900" height="240"></canvas>
      </div>

      <div class="card">
        <h2>Runs</h2>
        <ul class="list" id="runList">
          ${runs.length ? "" : "<li>Noch keine Runs.</li>"}
        </ul>
      </div>
    `;

    function paceText(dist, time){
      const d = Math.max(0.0001, Number(dist||0));
      const t = Math.max(0, Number(time||0));
      if(!dist || !time) return "—";
      const pace = t / d; // min/km
      const mm = Math.floor(pace);
      const ss = Math.round((pace - mm) * 60);
      return `${mm}:${String(ss).padStart(2,"0")} min/km`;
    }

    function updateRunUI(){
      const date = $("runDate").value;
      const w = weekFor(date);
      $("runWeek").textContent = String(w);

      const dist = Number($("runDist").value || 0);
      const time = Number($("runTime").value || 0);

      $("runPace").textContent = paceText(dist, time);

      const entry = {
        date,
        week: w,
        exercise: "Jogging",
        type: "Jogging",
        distanceKm: dist,
        timeMin: time
      };
      const res = window.XP.compute(entry);
      $("runXP").textContent = String(res.xp);
      $("runBreak").textContent = `Base ${res.breakdown.base} • Mut x${res.breakdown.mut} • Streak x${res.breakdown.streak} • Skill x${res.breakdown.skill}`;
    }

    $("runDate").addEventListener("change", updateRunUI);
    $("runDist").addEventListener("input", updateRunUI);
    $("runTime").addEventListener("input", updateRunUI);

    $("saveRun").addEventListener("click", async ()=>{
      const date = $("runDate").value;
      const w = weekFor(date);
      const dist = Number($("runDist").value || 0);
      const time = Number($("runTime").value || 0);

      if(!(dist>0) || !(time>0)) return alert("Bitte Strecke und Zeit eingeben.");

      const entry = {
        date,
        week: w,
        exercise: "Jogging",
        type: "Jogging",
        distanceKm: dist,
        timeMin: time
      };
      const res = window.XP.compute(entry);
      entry.xp = res.xp;
      entry.meta = { breakdown: res.breakdown, paceMinPerKm: (time/dist) };

      await window.IronQuestDB.add(entry);
      window.Progression?.updateStreak?.(date);

      await renderAll();
      showTab("jogging");
    });

    $("clearRuns").addEventListener("click", async ()=>{
      if(!confirm("Alle Jogging-Einträge löschen?")) return;
      // delete only Jogging entries
      const all = await window.IronQuestDB.getAll();
      const toDel = all.filter(e=>e.type==="Jogging").map(e=>e.id);
      for(const id of toDel){
        await window.IronQuestDB.delete(id);
      }
      await renderAll();
      showTab("jogging");
    });

    // render list
    const runList = $("runList");
    if(runs.length){
      runList.innerHTML = runs.map(r=>{
        const pace = paceText(r.distanceKm, r.timeMin);
        return `<li>
          <div class="row">
            <b>${r.date}</b>
            <span class="badge">${r.xp} XP</span>
          </div>
          <div class="small">${r.distanceKm} km • ${r.timeMin} min • ${pace}</div>
        </li>`;
      }).join("");
    }

    // chart (pace over time, chronological)
    const chrono = runs.slice().sort((a,b)=> (a.date>b.date?1:-1));
    const canvas = $("runChart");
    drawLineChart(
      canvas,
      chrono,
      r => (Number(r.timeMin||0) / Math.max(0.0001, Number(r.distanceKm||0))), // pace min/km
      r => `Letzte Pace: ${paceText(r.distanceKm, r.timeMin)}`
    );

    updateRunUI();
  }

  async function renderSkills(){
    const el = $("skills");
    window.SkillTree.render(el);
  }
  async function renderAnalytics(){
    const el = $("analytics");
    window.Analytics.render(el);
  }
  async function renderHealth(){
    const el = $("health");
    window.Health.render(el);
  }
  async function renderBoss(){
    const el = $("boss");
    window.Boss.render(el);
  }
  async function renderChallenge(){
    const el = $("challenge");
    window.Challenges.render(el);
  }
  async function renderBackup(){
    const el = $("backup");
    window.Backup.render(el);
  }

  async function renderAll(){
    // header info
    const entries = await window.IronQuestDB.getAll();
    const today = isoDate(new Date());
    const week = weekFor(today);
    const streak = window.Progression?.getStreak?.() || 0;
    const status = "OK";
    $("playerInfo").textContent = `${status} • W${week} • Streak ${streak}`;

    await renderDashboard();
    await renderLog();
    await renderSkills();
    await renderAnalytics();
    await renderHealth();
    await renderBoss();
    await renderChallenge();
    await renderBackup();
    await renderJogging();
  }

  // Update button / SW
  function setupUpdateButton(){
    const btn = $("btnUpdate");
    if(!btn) return;
    btn.addEventListener("click", async ()=>{
      try{
        if("serviceWorker" in navigator){
          const regs = await navigator.serviceWorker.getRegistrations();
          for(const r of regs) await r.update();
          alert("Update angestoßen ✅ (falls neue Version vorhanden, neu öffnen).");
        } else {
          alert("Kein Service Worker verfügbar.");
        }
      }catch(e){
        alert("Update fehlgeschlagen.");
      }
    });
  }

  function setupNav(){
    document.querySelectorAll("nav button[data-tab]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const tab = btn.getAttribute("data-tab");
        showTab(tab);
      });
    });
  }

  async function init(){
    setupNav();
    setupUpdateButton();

    // SW register (falls vorhanden)
    if("serviceWorker" in navigator){
      try { await navigator.serviceWorker.register("sw.js"); } catch {}
    }

    await renderAll();
    showTab("dashboard");
  }

  init();
})();
