(() => {
  "use strict";

  function drawBars(canvas, labels, values){
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);

    const pad=28;
    const innerW=W-pad*2;
    const innerH=H-pad*2;
    const maxV=Math.max(1,...values);
    const n=Math.max(1,values.length);
    const gap=10;
    const bw=Math.max(8,Math.floor((innerW-gap*(n-1))/n));

    ctx.globalAlpha=.35;
    ctx.fillRect(pad,H-pad,innerW,2);
    ctx.globalAlpha=1;

    for(let i=0;i<values.length;i++){
      const v=Number(values[i]||0);
      const h=Math.round((v/maxV)*(innerH-20));
      const x=pad+i*(bw+gap);
      const y=pad+(innerH-h);
      ctx.fillRect(x,y,bw,h);
      ctx.globalAlpha=.85;
      ctx.font="16px system-ui";
      ctx.fillText(labels[i]||"",x,H-8);
      ctx.globalAlpha=1;
    }
  }

  function weekXpMap(entries){
    const m={};
    for(const e of entries){
      const w=Number(e.week||0);
      if(!w) continue;
      m[w]=(m[w]||0)+Number(e.xp||0);
    }
    return m;
  }

  async function renderDashboard(el){
    const entries = await window.IronDB.getAllEntries();
    const totalXp = entries.reduce((s,e)=>s+Number(e.xp||0),0);
    const L = window.IronQuestProgression.levelFromTotalXp(totalXp);
    const rank = window.IronQuestRPG.getRankName(L.lvl);

    const start = window.IronQuestProgression.getStartDate();
    const week = window.IronQuestProgression.getWeekNumber();

    const s = window.IronQuestRPG.summarize(entries);
    const deload = window.IronQuestCoach.deloadHint(entries);

    const rpgState = window.IronQuestRPG.getState();
    const dailyDef = window.IronQuestRPG.DAILY_POOL.find(x=>x.id===rpgState.daily.id);
    const weeklyDef = window.IronQuestRPG.WEEKLY_POOL.find(x=>x.id===rpgState.weekly.id);

    const story = window.IronQuestRPG.storyStatus(rpgState, s, entries.length);
    const loot = window.IronQuestLoot.getState();
    const sess = window.IronQuestSession.getState();

    el.innerHTML = `
      <div class="card">
        <h2>Hunter HUD</h2>
        <div class="statRow">
          <div class="pill"><b>${rank}</b></div>
          <div class="pill"><b>Lv:</b> ${L.lvl} (${L.title})</div>
          <div class="pill"><b>Woche:</b> W${week}</div>
          <div class="pill"><b>Streak:</b> ${s.streak}</div>
          <div class="pill"><b>Total XP:</b> ${Math.round(totalXp)}</div>
        </div>
        <p class="hint">„Arise.“ – Jede Session macht dich stärker.</p>
        ${deload.heavy ? `<p class="hint">⚠️ Deload Hint: Woche sehr heavy (${Math.round(deload.weekXp)} XP, ${deload.days} Tage). Nächste Woche Volumen -30% empfohlen.</p>` : ""}
      </div>

      <div class="card">
        <h2>Session</h2>
        <p class="hint">Optionaler Workout-Flow (ohne Zwang). Du kannst trotzdem alles normal loggen.</p>
        <div class="row2">
          <div class="pill"><b>Status:</b> ${sess.active ? "ACTIVE" : "OFF"}</div>
          <div class="pill"><b>Chests:</b> ${loot.chests||0}</div>
        </div>
        <div class="btnRow">
          <button class="secondary" id="goLog">Zum Log</button>
          <button class="primary" id="openChest" ${((loot.chests||0)>0)?"":"disabled"}>Chest öffnen</button>
        </div>
        <div class="hint">${loot.lastDrop ? `Letzter Drop: ${loot.lastDrop}` : ""}</div>
      </div>

      <div class="card">
        <h2>Challenge Start</h2>
        <p class="hint">Startdatum bestimmt Woche 1 (auch rückwirkend).</p>
        <label>Startdatum</label>
        <input id="startDateInput" type="date" value="${start}">
        <div class="btnRow">
          <button class="primary" id="startSave">Speichern</button>
          <button class="danger" id="startReset">Heute als Start</button>
        </div>
      </div>

      <div id="attrMount"></div>

      <div class="card">
        <h2>Quests</h2>
        <div class="row2">
          <div class="skillbox">
            <h3>Daily Quest</h3>
            <div class="hint">${dailyDef?.title||"—"} – ${dailyDef?.desc||""}</div>
            <div class="pill"><b>Reward:</b> +${dailyDef?.reward||0} XP</div>
            <div class="btnRow">
              <button class="secondary" id="claimDaily" ${rpgState.daily.claimed?"disabled":""}>Claim</button>
              <span class="badge ${rpgState.daily.claimed?"ok":"gold"}">${rpgState.daily.claimed?"CLAIMED":"OPEN"}</span>
            </div>
          </div>

          <div class="skillbox">
            <h3>Weekly Quest</h3>
            <div class="hint">${weeklyDef?.title||"—"} – ${weeklyDef?.desc||""}</div>
            <div class="pill"><b>Reward:</b> +${weeklyDef?.reward||0} XP</div>
            <div class="btnRow">
              <button class="secondary" id="claimWeekly" ${rpgState.weekly.claimed?"disabled":""}>Claim</button>
              <span class="badge ${rpgState.weekly.claimed?"ok":"gold"}">${rpgState.weekly.claimed?"CLAIMED":"OPEN"}</span>
            </div>
          </div>
        </div>
        <hr>
        <div class="skillbox">
          <h3>Story Quest</h3>
          <div class="hint"><b>${story.cur?.title||"—"}</b></div>
          <div class="hint">${story.cur?.desc||""}</div>
          <div class="pill"><b>Reward:</b> +${story.cur?.reward||0} XP + 1 Chest</div>
          <div class="btnRow">
            <button class="primary" id="claimStory" ${(!story.done || story.claimed)?"disabled":""}>Claim Story</button>
            <span class="badge ${story.claimed?"ok":(story.done?"gold":"lock")}">${story.claimed?"CLAIMED":(story.done?"READY":"LOCKED")}</span>
          </div>
        </div>
      <div id="classMount"></div>
      <div id="equipMount"></div>

      <div class="card">
        <h2>Chests</h2>
        <div class="pill"><b>Available:</b> ${window.IronQuestLoot?.getState?.().chests || 0}</div>
        <div class="btnRow">
          <button class="secondary" id="openChestDash">Open Chest</button>
        </div>
        <div class="hint" id="dropResultDash">—</div>
      </div>

      </div>
    `;

    if (window.IronQuestAttributes?.renderAttributes){
      window.IronQuestAttributes.renderAttributes(el.querySelector("#attrMount"));
    }

    el.querySelector("#startSave").onclick=()=>{
      const v=el.querySelector("#startDateInput").value;
      if(!v) return;
      localStorage.setItem("ironquest_startdate_v5", v);
      window.Toast?.toast("Startdatum gespeichert", v);
    };
    el.querySelector("#startReset").onclick=()=>{
      const today=window.Utils.isoDate(new Date());
      localStorage.setItem("ironquest_startdate_v5", today);
      el.querySelector("#startDateInput").value=today;
      window.Toast?.toast("Startdatum gesetzt", today);
    };

    el.querySelector("#claimDaily").onclick = async ()=>{
      const ok = await window.IronQuestRPG.claimDaily();
      if(!ok) window.Toast?.toast("Daily Quest", "Noch nicht erfüllt oder bereits geclaimed.");
    };
    el.querySelector("#claimWeekly").onclick = async ()=>{
      const ok = await window.IronQuestRPG.claimWeekly();
      if(!ok) window.Toast?.toast("Weekly Quest", "Noch nicht erfüllt oder bereits geclaimed.");
    };


    // Class selector (unlock at Lv 10)
    const cm = el.querySelector("#classMount");
    if (cm && window.IronQuestClass){
      const unlocked = window.IronQuestClass.isUnlocked(L.lvl);
      const cur = window.IronQuestClass.get();
      cm.innerHTML = `
        <div class="card">
          <h2>Class</h2>
          ${unlocked ? `<p class="hint">Choose your specialization. Bonuses affect XP gain.</p>` : `<p class="hint">Unlocks at Lv 10. Current: Lv ${L.lvl}</p>`}
          <label>Class</label>
          <select id="classSel" ${unlocked ? "" : "disabled"}>
            ${window.IronQuestClass.CLASSES.map(c=>`<option value="${c.id}" ${c.id===cur.id?"selected":""}>${c.name}</option>`).join("")}
          </select>
          <div class="hint" id="classDesc">${cur.desc || ""}</div>
        </div>
      `;
      const sel = cm.querySelector("#classSel");
      if (sel){
        sel.onchange = ()=>{
          const ok = window.IronQuestClass.set(sel.value);
          const now = window.IronQuestClass.get();
          cm.querySelector("#classDesc").textContent = now.desc || "";
          if (ok) window.IronQuestUI?.systemMessage?.(`Class set: ${now.name}`);
        };
      }
    }

    // Equipment panel
    const em = el.querySelector("#equipMount");
    if (em && window.IronQuestEquipment?.renderEquipmentPanel){
      window.IronQuestEquipment.renderEquipmentPanel(em);
    }

    // Chest open (dashboard)
    const openBtn = el.querySelector("#openChestDash");
    if (openBtn){
      openBtn.onclick = ()=>{
        const res = window.IronQuestLoot.rollDrop();
        if (!res.ok) return window.Toast?.toast("Chest", "No chests available.");
        window.IronQuestUI?.systemMessage?.(res.drop ? `Loot acquired: ${res.drop}` : "Loot acquired: XP shard");
        el.querySelector("#dropResultDash").textContent = res.drop ? `You obtained: ${res.drop}` : "Nothing found… but you gained resolve.";
      };
    }

    el.querySelector("#claimStory").onclick = async ()=>{
      const ok = await window.IronQuestRPG.claimStory();
      if(!ok) window.Toast?.toast("Story Quest", "Noch nicht bereit oder bereits geclaimed.");
    };

    el.querySelector("#openChest").onclick = ()=>{
      const res = window.IronQuestLoot.rollDrop();
      if (!res.ok) return window.Toast?.toast("Chest", "Keine Chest verfügbar.");
      window.Toast?.toast("Chest opened", res.drop || "Nothing (XP shard)");
      renderDashboard(el);
    };

    el.querySelector("#goLog").onclick = ()=>{
      document.querySelector('nav button[data-tab="log"]')?.click();
    };
  }

  async function renderLog(el){
    const plan = window.IronQuestExercises.TRAINING_PLAN;
    const allExercises = window.IronQuestExercises.EXERCISES;
    const entries = await window.IronDB.getAllEntries();
    entries.sort((a,b)=> (a.date<b.date?1:-1));

    const today = window.Utils.isoDate(new Date());
    const dayDefault = 1;

    const sess = window.IronQuestSession.getState();

    el.innerHTML = `
      <div class="card">
        <h2>Training Log</h2>
        <p class="hint">Wähle den Trainingstag (1–5). Preview zeigt den Übungs-Pool. Dann Übung wählen & Sets/Reps eintragen.</p>

        <div class="card">
          <h2>Workout Session Mode</h2>
          <div class="row2">
            <div class="pill"><b>Status:</b> ${sess.active ? "ACTIVE" : "OFF"}</div>
            <div class="pill"><b>Day:</b> ${sess.day || dayDefault}</div>
          </div>
          <div class="btnRow">
            <button class="secondary" id="sessStart" ${sess.active?"disabled":""}>Start Session</button>
            <button class="danger" id="sessStop" ${sess.active?"":"disabled"}>Stop</button>
            <button class="primary" id="sessFinish" ${sess.active?"":"disabled"}>Finish (+Chest)</button>
          </div>
          <p class="hint small">Session ist optional. Finish gibt 1 Chest. Du kannst trotzdem normal loggen.</p>
        </div>

        <div class="card">
          <h2>Neuer Eintrag</h2>

          <div class="row2">
            <div>
              <label>Datum</label>
              <input id="lDate" type="date" value="${today}">
            </div>
            <div>
              <label>Trainingstag</label>
              <select id="lDay"></select>
            </div>
          </div>

          <div class="card">
            <h2 id="dayTitle">Tag-Preview</h2>
            <div class="hint" id="dayHint">—</div>
            <ul class="list" id="dayPreviewList"></ul>
          </div>

          <label>Übung</label>
          <select id="lExercise"></select>

          <div class="descBox" id="lDescBox">
            <div class="descTitle">Ausführung</div>
            <div class="descText" id="lDesc">—</div>
          </div>

          <div class="row2">
            <div class="pill" id="lRec"><b>Empfohlen:</b> —</div>
            <div class="pill" id="lType"><b>Typ:</b> —</div>
          </div>

          <div class="row2">
            <div>
              <label>Sätze (geleistet)</label>
              <input id="lSets" type="number" step="1" placeholder="z. B. 4">
            </div>
            <div>
              <label>Wdh pro Satz (geleistet)</label>
              <input id="lReps" type="number" step="1" placeholder="z. B. 8">
            </div>
          </div>

          <div class="row2">
            <div class="pill" id="lVol"><b>Volumen:</b> —</div>
            <div class="pill" id="lXp"><b>XP:</b> —</div>
          </div>

          <div class="btnRow">
            <button class="primary" id="lSave">Speichern</button>
            <button class="secondary" id="markDone" ${sess.active?"":"disabled"}>Session: Done</button>
          </div>
        </div>

        <div class="card">
          <div class="row2">
            <button class="danger" id="logClear">Alle löschen</button>
            <div class="pill"><b>Anzahl:</b> ${entries.length}</div>
          </div>
          <ul class="list" id="logList"></ul>
        </div>
      </div>
    `;

    const daySel = el.querySelector("#lDay");
    for(let d=1; d<=5; d++){
      const opt=document.createElement("option");
      opt.value=String(d);
      opt.textContent=`Tag ${d}: ${plan.days[d].name}`;
      if((sess.active?Number(sess.day):dayDefault)===d) opt.selected=true;
      daySel.appendChild(opt);
    }

    const exSel = el.querySelector("#lExercise");
    const recEl = el.querySelector("#lRec");
    const typeEl = el.querySelector("#lType");
    const volEl = el.querySelector("#lVol");
    const xpEl  = el.querySelector("#lXp");
    const descEl= el.querySelector("#lDesc");

    const previewTitle = el.querySelector("#dayTitle");
    const previewHint  = el.querySelector("#dayHint");
    const previewList  = el.querySelector("#dayPreviewList");


    function escapeHTML(str){
      return String(str)
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;");
    }

    function formatDesc(text){
      const t = String(text || "").trim();
      if (!t) return "—";
      if (t.includes("\n")) return t;
      return t
        .replaceAll(". ", ".\n")
        .replaceAll("! ", "!\n")
        .replaceAll("? ", "?\n");
    }

    function listForDay(day){
      return allExercises.filter(x=>Number(x.day||0)===Number(day) && x.type!=="Joggen");
    }

    function rebuildExerciseOptions(){
      const day=Number(daySel.value||1);
      const list=listForDay(day);
      exSel.innerHTML="";
      list.forEach(ex=>{
        const o=document.createElement("option");
        o.value=ex.name; o.textContent=ex.name;
        exSel.appendChild(o);
      });
      if(!list.length){
        const o=document.createElement("option");
        o.value=""; o.textContent="Keine Übungen";
        exSel.appendChild(o);
      }
    }

    function rebuildPreview(){
      const day=Number(daySel.value||1);
      const list=listForDay(day);
      previewTitle.textContent=`Tag ${day}: ${plan.days[day].name}`;
      previewHint.textContent=`Übungs-Pool: ${list.length} Übungen. (Du musst nicht alle machen.)`;
      previewList.innerHTML="";
      if(!list.length){ previewList.innerHTML="<li>—</li>"; return; }

      const sessionState = window.IronQuestSession.getState();

      list.forEach(ex=>{
        const done = sessionState.active && sessionState.done.includes(ex.name);
        const li=document.createElement("li");
        li.innerHTML=`
          <div class="itemTop">
            <div style="min-width:0;">
              <b>${done ? "✅ " : ""}${ex.name}</b>
              <div class="previewMeta">
                <div class="hint">Empfohlen: ${ex.recSets}×${ex.recReps}</div>
                <div class="hint">Typ: ${ex.type}</div>
              </div>
            </div>
            <button class="secondary" data-pick="${ex.name}">Wählen</button>
          </div>
        `;
        previewList.appendChild(li);
      });

      previewList.querySelectorAll("[data-pick]").forEach(btn=>{
        btn.onclick=()=>{
          exSel.value=btn.dataset.pick;
          recalc();
          el.querySelector("#lSets").focus();
        };
      });
    }

    function getSelected(){
      const name=exSel.value;
      return allExercises.find(x=>x.name===name);
    }

    function recalc(){
      const ex=getSelected();
      const sets=Number(el.querySelector("#lSets").value||0);
      const reps=Number(el.querySelector("#lReps").value||0);

      if(!ex){
        recEl.innerHTML="<b>Empfohlen:</b> —";
        typeEl.innerHTML="<b>Typ:</b> —";
        descEl.textContent = "—";
        volEl.innerHTML="<b>Volumen:</b> —";
        xpEl.innerHTML="<b>XP:</b> —";
        return {ex:null,sets,reps,xp:0};
      }

      recEl.innerHTML=`<b>Empfohlen:</b> ${ex.recSets}×${ex.recReps}`;
      typeEl.innerHTML=`<b>Typ:</b> ${ex.type}`;
      descEl.textContent = formatDesc(ex.description || "—");
      volEl.innerHTML=`<b>Volumen:</b> ${Math.max(0,sets*reps)}`;

      const xp = window.IronQuestXP.calcExerciseXP({
        type:ex.type, recSets:ex.recSets, recReps:ex.recReps,
        sets, reps, entries
      });
      xpEl.innerHTML=`<b>XP:</b> ${xp||"—"}`;
      return {ex,sets,reps,xp};
    }

    daySel.onchange=()=>{ rebuildExerciseOptions(); rebuildPreview(); recalc(); };
    exSel.onchange=recalc;
    el.querySelector("#lSets").oninput=recalc;
    el.querySelector("#lReps").oninput=recalc;

    rebuildExerciseOptions();
    rebuildPreview();
    recalc();

    el.querySelector("#sessStart").onclick = ()=>{
      const day = Number(daySel.value||1);
      window.IronQuestSession.start(day);
      window.Toast?.toast("Session started", `Day ${day}`);
      renderLog(el);
    };
    el.querySelector("#sessStop").onclick = ()=>{
      window.IronQuestSession.stop();
      window.Toast?.toast("Session stopped");
      renderLog(el);
    };
    el.querySelector("#sessFinish").onclick = ()=>{
      const res = window.IronQuestSession.finishAndReward();
      if (!res.ok) return;
      window.Toast?.toast("Session finished", "+1 Chest");
      renderLog(el);
    };

    el.querySelector("#markDone").onclick = ()=>{
      const ex=getSelected();
      if (!ex) return;
      window.IronQuestSession.toggleDone(ex.name);
      rebuildPreview();
      window.Toast?.toast("Session", `Done: ${ex.name}`);
    };

    el.querySelector("#lSave").onclick = async ()=>{
      const {ex,sets,reps,xp} = recalc();
      if(!ex || !sets || !reps) return;

      const date = el.querySelector("#lDate").value || today;
      const week = window.IronQuestProgression.getWeekNumberFor(date);

      const entry = {
        date, week,
        type: ex.type,
        exercise: ex.name,
        detail: `Rec ${ex.recSets}×${ex.recReps} • Did ${sets}x${reps} • Day ${daySel.value}`,
        xp
      };

      await window.IronDB.addEntry(entry);

      // Coach PR
      const pr = window.IronQuestCoach.updatePR(entry);
      if (pr?.isNew) window.Toast?.toast("NEW PR!", `${ex.name} volume ${pr.best.bestVolume}`);

      window.Toast?.toast("Entry saved", `${ex.name} (+${xp} XP)`);
      await renderLog(el);
    };

    const ul=el.querySelector("#logList");
    if(!entries.length) ul.innerHTML="<li>—</li>";
    else{
      ul.innerHTML="";
      entries.slice(0,250).forEach(e=>{
        const li=document.createElement("li");
        li.innerHTML=`
          <div class="itemTop">
            <div>
              <b>${e.date}</b> • W${e.week||"?"} • ${e.exercise||e.type||"Entry"}
              <div class="hint">${e.detail||""}</div>
            </div>
            <span class="badge">${Math.round(e.xp||0)} XP</span>
          </div>
        `;
        ul.appendChild(li);
      });
    }

    el.querySelector("#logClear").onclick = async ()=>{
      await window.IronDB.clearAllEntries();
      window.Toast?.toast("Log", "Alle Einträge gelöscht");
      await renderLog(el);
    };
  }

  async function renderAnalytics(el){
    const entries = await window.IronDB.getAllEntries();
    const today = window.Utils.isoDate(new Date());
    const curWeek = window.IronQuestProgression.getWeekNumberFor(today);
    const map = weekXpMap(entries);

    const weeks=[];
    for(let w=Math.max(1,curWeek-7); w<=curWeek; w++) weeks.push(w);
    const vals = weeks.map(w=>map[w]||0);
    const labels = weeks.map(w=>`W${w}`);

    el.innerHTML=`
      <div class="card">
        <h2>Stats</h2>
        <p class="hint">Wochen-XP der letzten 8 Wochen.</p>
        <canvas id="anChart" width="900" height="260"></canvas>
      </div>
    `;
    drawBars(el.querySelector("#anChart"), labels, vals);
  }

  window.IronQuestAnalytics = { renderDashboard, renderLog, renderAnalytics };
})();
