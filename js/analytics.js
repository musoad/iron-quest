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

  function escapeHTML(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  async function renderDashboard(el){
    const entries = await window.IronDB.getAllEntries();
    const totalXp = entries.reduce((s,e)=>s+Number(e.xp||0),0);
    const L = window.IronQuestProgression.levelFromTotalXp(totalXp);
    const rank = window.IronQuestRPG.getRankName(L.lvl);
    const week = window.IronQuestProgression.getWeekNumber();
    const s = window.IronQuestRPG.summarize(entries);
    const fatigue = window.IronQuestCoach.deloadHint(entries);

    const lootState = window.IronQuestLoot.getState();

    el.innerHTML = `
      <div class="card">
        <h2>Hunter HUD</h2>
        <div class="statRow">
          <div class="pill"><b>${rank}</b></div>
          <div class="pill"><b>Lv:</b> ${L.lvl} (${L.title})</div>
          <div class="pill"><b>Woche:</b> W${week}</div>
          <div class="pill"><b>Streak:</b> ${s.streak}</div>
          <div class="pill"><b>Chests:</b> ${lootState.chests}</div>
        </div>
        <div class="hint">${fatigue.heavy ? "⚠️ SYSTEM: Signs of fatigue detected. Consider a deload." : "SYSTEM: Status stable."}</div>
      </div>

      <div class="card">
        <h2>System</h2>
        <div class="systemPanel">
          <div class="sysHead">[ SYSTEM ]</div>
          <div class="sysBody">Weekly XP: ${Math.round(fatigue.weekXp)}\nTraining Days: ${fatigue.days}\nKomplexe Count: ${fatigue.complexCount}</div>
        </div>
      </div>

      <div id="attrMount"></div>
      <div id="classMount"></div>

      <div class="card">
        <h2>Quick Actions</h2>
        <div class="btnRow">
          <button class="primary" id="goLog">Open Training Log</button>
          <button class="purple" id="goGate">Go to Gates</button>
          <button class="secondary" id="openChest">Open Chest</button>
        </div>
        <div class="hint">Last drop: ${lootState.lastDrop || "—"}</div>
      </div>

      <div class="card">
        <h2>Equipment</h2>
        <div id="equipMount"></div>
      </div>

      <div class="card">
        <h2>Story</h2>
        <div class="hint">Unlocked chapters:</div>
        <ul class="list" id="storyList"></ul>
      </div>
    `;

    window.IronQuestAttributes.renderAttributes(el.querySelector("#attrMount"));
    window.IronQuestClasses.renderClassPanel(el.querySelector("#classMount"), L.lvl);
    window.IronQuestEquipment.renderEquipment(el.querySelector("#equipMount"), lootState.inv);

    const story = window.IronQuestRPG.getStoryUnlocked();
    const ul = el.querySelector("#storyList");
    ul.innerHTML = story.length ? "" : "<li>—</li>";
    story.slice(-6).forEach(ch=>{
      const li = document.createElement("li");
      li.innerHTML = `
        <div><b>${ch.title}</b></div>
        <div class="hint">${escapeHTML(ch.text)}</div>
      `;
      ul.appendChild(li);
    });

    el.querySelector("#goLog").onclick=()=>{ document.querySelector('nav button[data-tab="log"]').click(); };
    el.querySelector("#goGate").onclick=()=>{ document.querySelector('nav button[data-tab="gates"]').click(); };
    el.querySelector("#openChest").onclick=()=>{
      const r = window.IronQuestLoot.rollDrop();
      if(!r.ok) return window.Toast?.toast("Chest", "Keine Chests verfügbar.");
      window.UIEffects?.systemMessage([`Chest opened`, `${r.drop||"XP shard"}`]);
      window.Toast?.toast("Chest opened", r.drop||"XP shard");
      renderDashboard(el);
    };
  }

  async function renderLog(el){
    const plan = window.IronQuestExercises.TRAINING_PLAN;
    const allExercises = window.IronQuestExercises.EXERCISES;
    const entries = await window.IronDB.getAllEntries();
    entries.sort((a,b)=> (a.date<b.date?1:-1));

    const today = window.Utils.isoDate(new Date());
    const dayDefault = 1;

    el.innerHTML = `
      <div class="card">
        <h2>Training Log</h2>
        <p class="hint">Wähle den Trainingstag (1–5). Preview zeigt den Übungs-Pool. Dann Übung wählen & Sets/Reps eintragen.</p>

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

          <button class="primary" id="lSave">Speichern</button>
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
      if(d===dayDefault) opt.selected=true;
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

      list.forEach(ex=>{
        const li=document.createElement("li");
        li.innerHTML=`
          <div class="itemTop">
            <div style="min-width:0; width:100%;">
              <b>${ex.name}</b>

              <div class="descBox" style="margin-top:10px;">
                <div class="descTitle">Ausführung</div>
                <div class="descText">${escapeHTML(ex.description || "—")}</div>
              </div>

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
        descEl.textContent="—";
        volEl.innerHTML="<b>Volumen:</b> —";
        xpEl.innerHTML="<b>XP:</b> —";
        return {ex:null,sets,reps,xp:0};
      }

      recEl.innerHTML=`<b>Empfohlen:</b> ${ex.recSets}×${ex.recReps}`;
      typeEl.innerHTML=`<b>Typ:</b> ${ex.type}`;
      descEl.textContent=ex.description||"—";
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

    el.querySelector("#lSave").onclick = async ()=>{
      const {ex,sets,reps,xp} = recalc();
      if(!ex || !sets || !reps) return;

      const date = el.querySelector("#lDate").value || today;
      const week = window.IronQuestProgression.getWeekNumberFor(date);

      const entry = {
        date, week,
        type: ex.type,
        exercise: ex.name,
        detail: `Rec ${ex.recSets}×${ex.recReps} • Did ${sets}×${reps} • Day ${daySel.value}`,
        xp
      };

      await window.IronDB.addEntry(entry);
      const pr = window.IronQuestCoach.updatePR(entry);
      if (pr.isNew){
        window.UIEffects?.systemMessage([`PR unlocked: ${ex.name}`, `Best Volume: ${pr.best.bestVolume}`]);
      }
      window.Toast?.toast("Entry saved", `${ex.name} (+${xp} XP)`);
      await window.IronQuestLevelUp.checkLevelUp();
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
              <div class="hint">${escapeHTML(e.detail||"")}</div>
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
