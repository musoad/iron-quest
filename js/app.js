// js/app.js
(function(){
  const { isoDate, startOfWeekMonday, addDays } = window.Utils;
  const { ensureStartDate, setStartDate, weekNumberFor, clampWeek, starsForXP, levelFromTotalXP, titleForLevel, computeStreak, recommendedSets, recommendedReps } = window.Progression;

  function setActiveTab(tabId){
    document.querySelectorAll("nav button").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll("main .tab").forEach(s=>s.classList.remove("active"));

    const btn = document.querySelector(`nav button[data-tab="${tabId}"]`);
    const sec = document.getElementById(tabId);
    if (btn) btn.classList.add("active");
    if (sec) sec.classList.add("active");
  }

  function ensureNavOrder(){
    // Ordnung: Dashboard, Log, Joggen, Skilltree, Analytics, Health, Boss, Challenge, Backup
    const nav = document.querySelector("nav");
    if (!nav) return;

    const order = ["dashboard","log","jogging","skills","analytics","health","boss","challenge","backup"];
    order.forEach(id=>{
      if (!nav.querySelector(`[data-tab="${id}"]`)){
        const b = document.createElement("button");
        b.textContent = id[0].toUpperCase() + id.slice(1);
        b.setAttribute("data-tab", id);
        nav.appendChild(b);
      }
    });

    // Reorder existing
    const buttons = {};
    nav.querySelectorAll("button[data-tab]").forEach(b=> buttons[b.getAttribute("data-tab")] = b);
    nav.innerHTML = "";
    order.forEach(id=> nav.appendChild(buttons[id]));
  }

  function renderPlayerInfo(stats){
    const el = document.getElementById("playerInfo");
    if (!el) return;
    el.innerHTML = `
      <span class="badge ok">W${stats.curWeek}</span>
      <span class="badge">Heute: ${stats.todayXp} XP ${starsForXP(stats.todayXp)}</span>
      <span class="badge">Woche: ${stats.weekXp} XP</span>
      <span class="badge">Total: ${stats.totalXp} XP</span>
      <span class="badge">Lv ${stats.level.lvl} – ${stats.title}</span>
      <span class="badge warn">Streak ${stats.streak.current} (Best ${stats.streak.best})</span>
    `;
  }

  async function computeStats(entries){
    const today = isoDate(new Date());
    const curWeek = clampWeek(weekNumberFor(today));
    let todayXp=0, weekXp=0, totalXp=0;

    const dayMap = {};
    for (const e of entries){
      totalXp += (e.xp||0);
      if (e.date === today) todayXp += (e.xp||0);
      if (Number(e.week) === curWeek) weekXp += (e.xp||0);
      dayMap[e.date] = (dayMap[e.date]||0) + (e.xp||0);
    }

    const level = levelFromTotalXP(totalXp);
    const title = titleForLevel(level.lvl);
    const streak = computeStreak(entries);

    return { today, curWeek, todayXp, weekXp, totalXp, level, title, dayMap, streak };
  }

  function renderDashboard(elId, entries, stats){
    const el = document.getElementById(elId);
    if (!el) return;

    const start = ensureStartDate();

    el.innerHTML = `
      <div class="card">
        <h2>Dashboard</h2>
        <p class="hint">Startdatum steuert Woche/Plan. Sterne: ⭐ ab 1200 • ⭐⭐ ab 1600 • ⭐⭐⭐ ab 2000</p>
        <div class="row2">
          <div class="pill"><b>Startdatum:</b> <span class="kbd">${start}</span></div>
          <div class="pill"><b>Aktuelle Woche:</b> W${stats.curWeek}</div>
        </div>
        <label>Startdatum ändern</label>
        <input id="startDateInput" type="date" value="${start}">
        <div class="btnRow">
          <button class="secondary" id="saveStart">Startdatum speichern</button>
        </div>
      </div>

      <div class="card">
        <h2>Heute</h2>
        <div class="row2">
          <div class="pill"><b>Heute XP:</b> ${stats.todayXp}</div>
          <div class="pill"><b>Sterne:</b> ${starsForXP(stats.todayXp)}</div>
        </div>
        <div class="row2">
          <div class="pill"><b>Woche XP:</b> ${stats.weekXp}</div>
          <div class="pill"><b>Total XP:</b> ${stats.totalXp}</div>
        </div>
      </div>

      <div class="card">
        <h2>Weekly Plan</h2>
        <p class="hint">Empfohlene Sätze/Reps sind abhängig vom Block.</p>
        <div id="weekPlan"></div>
      </div>
    `;

    document.getElementById("saveStart").onclick = async ()=>{
      const v = document.getElementById("startDateInput").value;
      if (!v) return alert("Bitte Datum wählen.");
      if (!confirm("Startdatum wirklich ändern? (Woche/Plan werden neu berechnet)")) return;
      setStartDate(v);

      // Weeks in entries neu berechnen
      const all = await window.DB.getAll("entries");
      for (const e of all){
        const w = clampWeek(weekNumberFor(e.date));
        if (Number(e.week) !== w){
          e.week = w;
          await window.DB.put("entries", e);
        }
      }
      await renderAll();
    };

    renderWeekPlan("weekPlan", stats.curWeek);
  }

  function renderWeekPlan(elId, curWeek){
    const box = document.getElementById(elId);
    if (!box) return;

    const plan = window.Exercises.WEEK_PLAN;
    const days = [
      ["Mon","Montag"],["Tue","Dienstag"],["Wed","Mittwoch"],["Thu","Donnerstag"],["Fri","Freitag"],["Sat","Samstag"],["Sun","Sonntag"]
    ];

    let html = "";
    days.forEach(([k,label])=>{
      const list = plan[k] || [];
      html += `<div class="card"><h2>${label}</h2><ul class="list">`;
      list.forEach(name=>{
        const ex = window.Exercises.byName(name);
        const type = ex?.type || "—";
        const sets = recommendedSets(type, curWeek);
        const reps = recommendedReps(type, curWeek);
        const desc = ex?.desc || "";
        html += `
          <li>
            <div><b>${name}</b> <span class="badge">${type}</span></div>
            <div class="small">Empf: ${sets} • ${reps}</div>
            <div class="small">${desc}</div>
          </li>
        `;
      });

      // Jogging Empfehlung zusätzlich (optional)
      if (k === "Wed" || k === "Sun"){
        html += `
          <li>
            <div><b>Optional: Jogging</b> <span class="badge">Jogging</span></div>
            <div class="small">Empf: ${recommendedSets("Jogging",curWeek)} • ${recommendedReps("Jogging",curWeek)}</div>
            <div class="small">Locker laufen, Fokus Pace-Verbesserung über Wochen.</div>
          </li>
        `;
      }

      html += `</ul></div>`;
    });

    box.innerHTML = html;
  }

  function exerciseOptionsHTML(){
    const all = window.Exercises.all().filter(x=>x.type!=="Jogging"); // Jogging separat im Jogging Tab
    return all
      .filter(x=>x.type!=="Rest" || x.name.includes("Ruhetag"))
      .map(x=>`<option value="${x.name}">${x.name} (${x.type})</option>`)
      .join("");
  }

  async function renderLog(elId, entries, stats){
    const el = document.getElementById(elId);
    if (!el) return;

    const today = isoDate(new Date());
    el.innerHTML = `
      <div class="card">
        <h2>Log</h2>
        <p class="hint">Trainings speichern → XP + Sterne werden automatisch berechnet.</p>

        <div class="card">
          <h2>Neuer Eintrag</h2>
          <label>Datum</label>
          <input id="lDate" type="date" value="${today}">

          <label>Übung</label>
          <select id="lExercise">${exerciseOptionsHTML()}</select>

          <div class="row2">
            <div>
              <label>Tatsächliche Sätze</label>
              <input id="lSets" type="number" inputmode="numeric" placeholder="z. B. 4">
            </div>
            <div>
              <label>Tatsächliche Reps / Satz</label>
              <input id="lReps" type="number" inputmode="numeric" placeholder="z. B. 10">
            </div>
          </div>

          <div class="pill" id="lPreview">—</div>

          <div class="btnRow">
            <button class="primary" id="lSave">Speichern</button>
            <button class="secondary" id="lReset">Reset</button>
          </div>
        </div>

        <div class="card">
          <h2>Einträge (neueste zuerst)</h2>
          <ul class="list" id="lList"></ul>
        </div>
      </div>
    `;

    function updatePreview(){
      const date = document.getElementById("lDate").value || today;
      const week = clampWeek(weekNumberFor(date));
      const exName = document.getElementById("lExercise").value;
      const ex = window.Exercises.byName(exName);
      const type = ex?.type || "Mehrgelenkig";
      const setsRec = recommendedSets(type, week);
      const repsRec = recommendedReps(type, week);

      const sets = Number(document.getElementById("lSets").value||0);
      const reps = Number(document.getElementById("lReps").value||0);

      const base = window.XP.baseXPForType(type, {});
      const skillMult = window.Skilltree.multiplierFor(type);
      const xp = Math.round(base * skillMult);

      document.getElementById("lPreview").innerHTML =
        `<b>${type}</b> • Empf: ${setsRec}/${repsRec} • Deine Werte: ${sets||"—"} Sätze, ${reps||"—"} Reps • XP: <b>${xp}</b> (Skill x${skillMult.toFixed(2)})`;
    }

    ["lDate","lExercise","lSets","lReps"].forEach(id=>{
      document.getElementById(id).addEventListener("change", updatePreview);
      document.getElementById(id).addEventListener("input", updatePreview);
    });

    document.getElementById("lReset").onclick = ()=>{
      document.getElementById("lSets").value = "";
      document.getElementById("lReps").value = "";
      updatePreview();
    };

    document.getElementById("lSave").onclick = async ()=>{
      const date = document.getElementById("lDate").value || today;
      const week = clampWeek(weekNumberFor(date));
      const exName = document.getElementById("lExercise").value;
      const ex = window.Exercises.byName(exName);
      const type = ex?.type || "Mehrgelenkig";

      const sets = Number(document.getElementById("lSets").value||0) || null;
      const reps = Number(document.getElementById("lReps").value||0) || null;

      const base = window.XP.baseXPForType(type, {});
      const skillMult = window.Skilltree.multiplierFor(type);
      const xp = Math.round(base * skillMult);

      const detail = [
        `Empf: ${recommendedSets(type, week)} / ${recommendedReps(type, week)}`,
        sets ? `Sets: ${sets}` : null,
        reps ? `Reps: ${reps}` : null,
        `Skill x${skillMult.toFixed(2)}`
      ].filter(Boolean).join(" • ");

      await window.DB.add("entries", { date, week, exercise: exName, type, detail, xp });

      alert(`Gespeichert: +${xp} XP ✅`);
      await renderAll();
      setActiveTab("dashboard");
    };

    updatePreview();

    // List
    const ul = document.getElementById("lList");
    const sorted = entries.slice().sort((a,b)=>{
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.id||0)-(a.id||0);
    });

    if (!sorted.length) ul.innerHTML = `<li>—</li>`;
    else {
      ul.innerHTML = "";
      sorted.slice(0,60).forEach(e=>{
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="itemTop">
            <div>
              <b>${e.date}</b> • <span class="badge">W${e.week}</span> • <b>${e.exercise}</b>
              <div class="small">${e.type} • ${e.detail||""}</div>
            </div>
            <div class="row" style="justify-content:flex-end">
              <span class="badge">${e.xp} XP</span>
              <button class="danger" data-del="${e.id}">Del</button>
            </div>
          </div>
        `;
        ul.appendChild(li);
      });

      ul.querySelectorAll("[data-del]").forEach(btn=>{
        btn.onclick = async ()=>{
          const id = Number(btn.getAttribute("data-del"));
          if (!confirm("Eintrag löschen?")) return;
          await window.DB.del("entries", id);
          await renderAll();
        };
      });
    }
  }

  // Jogging Tab: Runs store + XP into entries + Chart pace
  function drawRunChart(canvas, runs){
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);

    if (!runs.length){
      ctx.font="22px system-ui";
      ctx.globalAlpha=0.75;
      ctx.fillText("Noch keine Runs.", 20, 40);
      ctx.globalAlpha=1;
      return;
    }

    const pad=28;
    const innerW = W - pad*2;
    const innerH = H - pad*2;

    const paces = runs.map(r => (r.timeMin / Math.max(0.01,r.distanceKm))); // min/km
    const minP = Math.min(...paces);
    const maxP = Math.max(...paces);

    const range = Math.max(0.1, maxP - minP);

    const pts = paces.map((p,i)=>{
      const x = pad + (i/(paces.length-1||1))*innerW;
      const y = pad + innerH - ((p - minP)/range)*innerH;
      return {x,y};
    });

    ctx.globalAlpha=0.35;
    ctx.fillRect(pad, H-pad, innerW, 2);
    ctx.globalAlpha=1;

    ctx.beginPath();
    pts.forEach((pt,i)=> i===0 ? ctx.moveTo(pt.x,pt.y) : ctx.lineTo(pt.x,pt.y));
    ctx.strokeStyle="#ffffff";
    ctx.lineWidth=3;
    ctx.stroke();

    pts.forEach(pt=>{
      ctx.beginPath();
      ctx.arc(pt.x,pt.y,4,0,Math.PI*2);
      ctx.fill();
    });

    ctx.font="18px system-ui";
    ctx.globalAlpha=0.85;
    ctx.fillText(`Pace min/km: best ${minP.toFixed(2)} • worst ${maxP.toFixed(2)}`, pad, 22);
    ctx.globalAlpha=1;
  }

  async function renderJogging(elId){
    const el = document.getElementById(elId);
    if (!el) return;

    const runs = await window.DB.getAll("runs");
    runs.sort((a,b)=> (a.date<b.date ? 1 : -1));

    const today = isoDate(new Date());

    el.innerHTML = `
      <div class="card">
        <h2>Joggen</h2>
        <p class="hint">Distanz + Zeit speichern → XP wird erzeugt (und zählt in Sterne/Level/Analytics).</p>

        <div class="card">
          <h2>Neuer Run</h2>
          <label>Datum</label>
          <input id="rDate" type="date" value="${today}">
          <div class="row2">
            <div>
              <label>Distanz (km)</label>
              <input id="rKm" type="number" step="0.01" inputmode="decimal" placeholder="z. B. 3.2">
            </div>
            <div>
              <label>Zeit (Minuten)</label>
              <input id="rMin" type="number" step="1" inputmode="numeric" placeholder="z. B. 18">
            </div>
          </div>

          <div class="pill" id="rPreview">—</div>
          <div class="btnRow">
            <button class="primary" id="rSave">Speichern + XP</button>
            <button class="secondary" id="rReset">Reset</button>
          </div>
        </div>

        <div class="card">
          <h2>Progress Chart (Pace)</h2>
          <canvas id="runChart" width="900" height="260"></canvas>
        </div>

        <div class="card">
          <h2>Letzte Runs</h2>
          <ul class="list" id="rList"></ul>
        </div>
      </div>
    `;

    function updatePreview(){
      const km = Number(document.getElementById("rKm").value||0);
      const min = Number(document.getElementById("rMin").value||0);
      const pace = (km>0 ? (min/km) : 0);
      const xp = window.XP.joggingXP(km, min);
      const skillMult = window.Skilltree.multiplierFor("Jogging");
      const finalXP = Math.round(xp * skillMult);

      document.getElementById("rPreview").innerHTML =
        `Pace: <b>${pace?pace.toFixed(2):"—"}</b> min/km • Base XP: <b>${xp}</b> • Skill x${skillMult.toFixed(2)} → <b>${finalXP}</b> XP`;
    }

    ["rKm","rMin"].forEach(id=>{
      document.getElementById(id).addEventListener("input", updatePreview);
      document.getElementById(id).addEventListener("change", updatePreview);
    });

    document.getElementById("rReset").onclick = ()=>{
      document.getElementById("rKm").value="";
      document.getElementById("rMin").value="";
      updatePreview();
    };

    document.getElementById("rSave").onclick = async ()=>{
      const date = document.getElementById("rDate").value || today;
      const km = Number(document.getElementById("rKm").value||0);
      const min = Number(document.getElementById("rMin").value||0);
      if (km<=0 || min<=0) return alert("Bitte Distanz und Zeit eingeben.");

      const week = clampWeek(weekNumberFor(date));
      const baseXP = window.XP.joggingXP(km, min);
      const skillMult = window.Skilltree.multiplierFor("Jogging");
      const xp = Math.round(baseXP * skillMult);

      const pace = (min/km);

      // Save run
      await window.DB.add("runs", { date, distanceKm: km, timeMin: min, paceMinPerKm: pace, xp });

      // Also add entry for global XP/Stars
      await window.DB.add("entries", {
        date, week,
        exercise: "Jogging",
        type: "Jogging",
        detail: `Dist: ${km} km • Time: ${min} min • Pace: ${pace.toFixed(2)} min/km • Skill x${skillMult.toFixed(2)}`,
        xp
      });

      alert(`Run gespeichert: +${xp} XP ✅`);
      await renderAll();
      setActiveTab("dashboard");
    };

    updatePreview();

    const last = runs.slice().reverse().slice(-10); // oldest->newest for chart
    drawRunChart(document.getElementById("runChart"), last);

    const ul = document.getElementById("rList");
    if (!runs.length) ul.innerHTML = `<li>—</li>`;
    else {
      ul.innerHTML = "";
      runs.slice(0,40).forEach(r=>{
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="itemTop">
            <div>
              <b>${r.date}</b> • ${r.distanceKm} km • ${r.timeMin} min
              <div class="small">Pace: ${(r.paceMinPerKm||0).toFixed(2)} min/km</div>
            </div>
            <div class="row" style="justify-content:flex-end">
              <span class="badge">${r.xp} XP</span>
              <button class="danger" data-del="${r.id}">Del</button>
            </div>
          </div>
        `;
        ul.appendChild(li);
      });

      ul.querySelectorAll("[data-del]").forEach(btn=>{
        btn.onclick = async ()=>{
          const id = Number(btn.getAttribute("data-del"));
          if (!confirm("Run löschen?")) return;
          await window.DB.del("runs", id);
          await renderJogging(elId);
        };
      });
    }
  }

  async function renderAll(){
    // Optional migration from earlier names (wenn du mal DB umbenannt hattest)
    await window.DB.tryMigrateFrom("ironquest_v4_pro").catch(()=>{});

    const entries = await window.DB.getAll("entries");
    const stats = await computeStats(entries);
    renderPlayerInfo(stats);

    renderDashboard("dashboard", entries, stats);
    await renderLog("log", entries, stats);
    await renderJogging("jogging");

    window.Skilltree.render("skills");
    window.Analytics.render("analytics", entries);
    await window.Health.render("health");
    await window.Boss.render("boss");
    await window.Challenges.render("challenge");
    await window.Backup.render("backup");
  }

  function bindNav(){
    document.querySelectorAll("nav button[data-tab]").forEach(btn=>{
      btn.addEventListener("click", (e)=>{
        const id = btn.getAttribute("data-tab");
        setActiveTab(id);
      });
    });
  }

  async function init(){
    // ensure jogging section exists
    if (!document.getElementById("jogging")){
      const sec = document.createElement("section");
      sec.id="jogging";
      sec.className="tab";
      document.querySelector("main")?.insertBefore(sec, document.getElementById("skills") || null);
    }

    ensureNavOrder();
    bindNav();

    // Default tab
    setActiveTab("dashboard");

    // Register SW
    if ("serviceWorker" in navigator){
      try{ await navigator.serviceWorker.register("./sw.js"); }catch{}
    }

    await renderAll();
  }

  init().catch((e)=>{
    console.error(e);
    alert("Anzeige Fehler in JS. (Bitte sag mir den Text, der angezeigt wurde.)");
  });
})();
