(function(){
  const $ = window.IQ.$;
  const iso = window.IQ.isoDate;

  function setStatus(text){
    const el = $("playerInfo");
    if (el) el.textContent = text;
  }

  function sortEntriesDesc(arr){
    return arr.slice().sort((a,b)=>{
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.id||0) - (a.id||0);
    });
  }

  async function getEntries(){
    const rows = await window.IronQuestDB.getAll(window.IronQuestDB.STORES.entries);
    return sortEntriesDesc(rows);
  }

  function bindTabs(){
    document.querySelectorAll(".tabBtn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const tab = btn.getAttribute("data-tab");
        document.querySelectorAll(".tabBtn").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");

        document.querySelectorAll("main .tab").forEach(sec=>sec.classList.remove("active"));
        const target = document.getElementById(tab);
        if (target) target.classList.add("active");
      });
    });
  }

  async function renderDashboard(container, entries){
    const today = iso(new Date());
    const start = window.IronQuestProgression.ensureStartDate();
    const curWeek = window.IronQuestProgression.weekForDate(today);

    let totalXP=0, todayXP=0, weekXP=0;
    const attr = { STR:0, STA:0, END:0, MOB:0 };

    for (const e of entries){
      totalXP += (e.xp||0);
      if (e.date === today) todayXP += (e.xp||0);
      if (e.week === curWeek) weekXP += (e.xp||0);
      window.IronQuestAttributes.addAttrTotalsFromEntry(attr, e);
    }

    const lv = window.IronQuestProgression.levelFromXP(totalXP);
    const title = window.IronQuestProgression.titleForLevel(lv.lvl);

    const streak = window.IronQuestProgression.updateStreakFromEntries(entries);
    const sm = window.IronQuestProgression.streakMultiplier(streak.count);
    const ad = window.IronQuestProgression.adaptiveHint(entries, curWeek);

    const prTop = window.IronQuestXP.getTopPRs(10);

    // attributes levels
    function attrBox(key){
      const xp = Math.round(attr[key]||0);
      const a = window.IronQuestAttributes.attrLevelFromXP(xp);
      return `<div class="pill"><b>${key}</b> Lv ${a.lvl}<div class="small">${xp} XP • ${Math.max(0, a.need-a.into)} bis next</div></div>`;
    }

    container.innerHTML = `
      <div class="card">
        <h2>Status</h2>
        <div class="row2">
          <div class="pill"><b>Startdatum:</b> <span id="startShow">${start}</span></div>
          <div class="pill"><b>Woche:</b> W${curWeek}</div>
        </div>

        <label>Startdatum ändern (wirkt auf Wochen)
          <input id="startInput" type="date" value="${start}">
        </label>
        <button id="saveStart" class="btn" type="button">Startdatum speichern</button>

        <div class="divider"></div>

        <div class="row2">
          <div class="pill"><b>Heute XP:</b> ${todayXP}</div>
          <div class="pill"><b>Woche XP:</b> ${weekXP}</div>
        </div>
        <div class="row2">
          <div class="pill"><b>Total XP:</b> ${totalXP}</div>
          <div class="pill"><b>Level:</b> ${lv.lvl} – ${title}</div>
        </div>

        <div class="row2">
          <div class="pill"><b>Streak:</b> ${streak.count} Tage <div class="small">Bonus: x${sm.toFixed(2)}</div></div>
          <div class="pill"><b>Adaptive:</b><div class="small">${ad.note}</div></div>
        </div>
      </div>

      <div class="card">
        <h2>Attribute</h2>
        <div class="row2">
          ${attrBox("STR")}
          ${attrBox("STA")}
          ${attrBox("END")}
          ${attrBox("MOB")}
        </div>
      </div>

      <div class="card">
        <h2>Top 10 PRs</h2>
        <ul class="list" id="prList"></ul>
      </div>
    `;

    const prList = document.getElementById("prList");
    prList.innerHTML = prTop.length ? "" : "<li>Keine PRs.</li>";
    prTop.forEach(([ex,val], i)=>{
      const li = document.createElement("li");
      li.innerHTML = `<div class="row" style="justify-content:space-between;align-items:center;">
        <div><b>${i+1}.</b> ${ex}<div class="small">PR Metric: ${val}</div></div>
        <span class="badge ok">PR</span>
      </div>`;
      prList.appendChild(li);
    });

    document.getElementById("saveStart").addEventListener("click", async ()=>{
      const newStart = document.getElementById("startInput").value;
      if (!newStart) return alert("Bitte Datum wählen.");
      if (!confirm("Startdatum ändern? Wochen werden neu berechnet (Einträge bleiben).")) return;

      window.IronQuestProgression.setStartDate(newStart);

      // recalc weeks
      const all = await getEntries();
      for (const e of all){
        const w = window.IronQuestProgression.weekForDate(e.date);
        if (e.week !== w){
          e.week = w;
          await window.IronQuestDB.put(window.IronQuestDB.STORES.entries, e);
        }
      }
      alert("Startdatum gespeichert & Wochen neu berechnet ✅");
      location.reload();
    });
  }

  function renderLog(container, entries){
    const today = iso(new Date());
    const start = window.IronQuestProgression.ensureStartDate();
    const curWeek = window.IronQuestProgression.weekForDate(today);

    const exAll = window.IronQuestExercises.all();

    container.innerHTML = `
      <div class="card">
        <h2>Neuer Eintrag</h2>

        <div class="row2">
          <div>
            <label>Datum</label>
            <input id="lDate" type="date" value="${today}">
          </div>
          <div class="pill"><b>Woche:</b> <span id="lWeek">W${curWeek}</span></div>
        </div>

        <label>Übung</label>
        <select id="lExercise"></select>
        <div class="hint" id="lDesc">—</div>

        <div class="row2">
          <div>
            <label>Tatsächliche Sets</label>
            <input id="lSets" inputmode="numeric" placeholder="z.B. 4">
          </div>
          <div>
            <label>Tatsächliche Reps</label>
            <input id="lReps" inputmode="text" placeholder="z.B. 10 (oder 8-10)">
          </div>
        </div>

        <div class="row2">
          <div>
            <label>Walking Minuten (nur NEAT)</label>
            <input id="lMin" inputmode="numeric" placeholder="z.B. 60">
          </div>
          <div class="pill">
            <b>Preview XP:</b> <span id="lXP">0</span>
            <div class="small" id="lInfo">—</div>
          </div>
        </div>

        <div class="row">
          <button class="btn primary" id="lSave" type="button">Speichern</button>
          <button class="btn danger" id="lClear" type="button">Alle Einträge löschen</button>
        </div>
      </div>

      <div class="card">
        <h2>Einträge</h2>
        <ul class="list" id="lList"></ul>
      </div>
    `;

    const sel = document.getElementById("lExercise");
    exAll.forEach(e=>{
      const opt = document.createElement("option");
      opt.value = e.name;
      opt.textContent = `${e.name} (${e.type})`;
      sel.appendChild(opt);
    });

    function parseSetsReps(){
      const sets = Number(document.getElementById("lSets").value || 0) || 0;
      // reps may be "8-10" -> use first number for metric
      const repsStr = String(document.getElementById("lReps").value || "").trim();
      const m = repsStr.match(/\d+/);
      const reps = m ? Number(m[0]) : 0;
      const minutes = Number(document.getElementById("lMin").value || 0) || 0;
      return { sets, reps, minutes, repsStr };
    }

    function refreshMeta(){
      const ex = window.IronQuestExercises.byName(sel.value);
      if (!ex) return;
      document.getElementById("lDesc").textContent =
        `${ex.desc} • Empfohlen: Sets ${ex.recSets}, Reps ${ex.recReps}`;

      const date = document.getElementById("lDate").value || today;
      const week = window.IronQuestProgression.weekForDate(date);
      document.getElementById("lWeek").textContent = "W"+week;

      const st = window.IronQuestProgression.updateStreakFromEntries(entries);
      const streakMult = window.IronQuestProgression.streakMultiplier(st.count);

      const skillMult = window.IronQuestSkilltree.multiplierForType(ex.type);

      const { sets, reps, minutes } = parseSetsReps();

      const res = window.IronQuestXP.computeXP({
        type: ex.type,
        exercise: ex.name,
        sets, reps, minutes,
        streakMult,
        skillMult
      });

      document.getElementById("lXP").textContent = String(res.xp);
      document.getElementById("lInfo").textContent =
        `Base ${res.base} • Vol x${res.volMult.toFixed(2)} • Streak x${res.streakMult.toFixed(2)} • Skill x${res.skillMult.toFixed(2)}`;
    }

    ["lDate","lSets","lReps","lMin"].forEach(id=>{
      document.getElementById(id).addEventListener("input", refreshMeta);
      document.getElementById(id).addEventListener("change", refreshMeta);
    });
    sel.addEventListener("change", refreshMeta);

    async function fillList(){
      const ul = document.getElementById("lList");
      const rows = await getEntries();
      ul.innerHTML = rows.length ? "" : "<li>Noch keine Einträge.</li>";

      rows.slice(0, 80).forEach(e=>{
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="row" style="justify-content:space-between;align-items:flex-start;">
            <div>
              <b>${e.date}</b> • W${e.week} • <b>${e.exercise}</b>
              <div class="small">${e.type} ${e.detail ? "• "+e.detail : ""}</div>
            </div>
            <div class="row" style="margin:0;">
              <span class="badge">${e.xp} XP</span>
              <button class="btn danger" data-del="${e.id}" type="button">Del</button>
            </div>
          </div>
        `;
        ul.appendChild(li);
      });

      ul.querySelectorAll("[data-del]").forEach(btn=>{
        btn.addEventListener("click", async ()=>{
          const id = Number(btn.getAttribute("data-del"));
          if (!confirm("Eintrag löschen?")) return;
          await window.IronQuestDB.del(window.IronQuestDB.STORES.entries, id);
          await fillList();
        });
      });
    }

    document.getElementById("lSave").addEventListener("click", async ()=>{
      const ex = window.IronQuestExercises.byName(sel.value);
      if (!ex) return;

      const date = document.getElementById("lDate").value || today;
      const week = window.IronQuestProgression.weekForDate(date);

      const st = window.IronQuestProgression.updateStreakFromEntries(entries);
      const streakMult = window.IronQuestProgression.streakMultiplier(st.count);
      const skillMult = window.IronQuestSkilltree.multiplierForType(ex.type);

      const { sets, reps, minutes, repsStr } = parseSetsReps();

      const res = window.IronQuestXP.computeXP({
        type: ex.type,
        exercise: ex.name,
        sets, reps, minutes,
        streakMult,
        skillMult
      });

      const detailParts = [];
      detailParts.push(`Empf Sets ${ex.recSets}, Reps ${ex.recReps}`);
      if (ex.type === "NEAT") detailParts.push(`Min ${minutes}`);
      else if (ex.type !== "Rest") detailParts.push(`Sets ${sets} • Reps ${repsStr || reps}`);
      if (res.pr.isPR) detailParts.push(`NEW PR ${res.pr.old} → ${res.pr.now}`);

      await window.IronQuestDB.add(window.IronQuestDB.STORES.entries, {
        date,
        week,
        exercise: ex.name,
        type: ex.type,
        sets: ex.type==="NEAT" ? null : sets,
        reps: ex.type==="NEAT" ? null : repsStr || reps,
        minutes: ex.type==="NEAT" ? minutes : null,
        xp: res.xp,
        detail: detailParts.join(" • ")
      });

      alert(res.pr.isPR ? `Gespeichert ✅ NEW PR! (+${res.xp} XP)` : `Gespeichert ✅ (+${res.xp} XP)`);
      location.reload();
    });

    document.getElementById("lClear").addEventListener("click", async ()=>{
      if (!confirm("Wirklich ALLE Einträge löschen?")) return;
      await window.IronQuestDB.clear(window.IronQuestDB.STORES.entries);
      alert("Gelöscht ✅");
      location.reload();
    });

    refreshMeta();
    fillList();
  }

  function renderSkills(container, entries){
    const sp = window.IronQuestSkilltree.availableSkillPoints(entries);
    const st = window.IronQuestSkilltree.load();
    const trees = window.IronQuestSkilltree.TREES;

    container.innerHTML = `
      <div class="card">
        <h2>Skilltree</h2>
        <div class="row2">
          <div class="pill"><b>Skillpunkte:</b> ${sp.available} <div class="small">Earned ${sp.earned} • Spent ${sp.spent}</div></div>
          <div class="pill"><b>Bonus:</b> Unlocks geben XP-Multiplikator pro Typ.</div>
        </div>
      </div>
      <div class="card">
        <h2>Trees</h2>
        <div class="grid2" id="skGrid"></div>
      </div>
    `;

    const grid = document.getElementById("skGrid");

    trees.forEach(t=>{
      const nodes = st.nodes[t.key] || [];
      const box = document.createElement("div");
      box.className = "card";
      box.innerHTML = `
        <h2>${t.label}</h2>
        <p class="hint">Typ: ${t.type} • Aktueller Mult: x${window.IronQuestSkilltree.multiplierForType(t.type).toFixed(2)}</p>
        <ul class="list" id="tree_${t.key}"></ul>
      `;
      grid.appendChild(box);

      const ul = box.querySelector(`#tree_${t.key}`);
      nodes.forEach(n=>{
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="row" style="justify-content:space-between;align-items:center;">
            <div><b>${n.name}</b><div class="small">Cost: ${n.cost} • ${n.unlocked?"✅ unlocked":"🔒 locked"}</div></div>
            <button class="btn primary" data-node="${n.id}" ${n.unlocked?"disabled":""} type="button">Unlock</button>
          </div>
        `;
        ul.appendChild(li);
      });
    });

    container.querySelectorAll("[data-node]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-node");
        const res = window.IronQuestSkilltree.unlockNode(id, entries);
        if (!res.ok) return alert(res.msg || "Nicht möglich.");
        alert("Unlocked ✅ (Reload)");
        location.reload();
      });
    });
  }

  async function renderAll(){
    const entries = await getEntries();

    // Update header status
    const today = iso(new Date());
    const curWeek = window.IronQuestProgression.weekForDate(today);
    const streak = window.IronQuestProgression.updateStreakFromEntries(entries);
    setStatus(`OK • W${curWeek} • Streak ${streak.count}`);

    // Render each tab content
    await renderDashboard(document.getElementById("dashboard"), entries);
    renderLog(document.getElementById("log"), entries);
    renderSkills(document.getElementById("skills"), entries);

    window.IronQuestAnalytics.renderAnalytics(document.getElementById("analytics"), entries, curWeek);
    window.IronQuestHealth.renderHealth(document.getElementById("health"), entries);
    window.IronQuestBoss.renderBoss(document.getElementById("boss"), entries, curWeek);
    window.IronQuestChallenges.renderChallenge(document.getElementById("challenge"), entries, curWeek, streak.count);
    window.IronQuestBackup.renderBackup(document.getElementById("backup"));
  }

  async function forceUpdate(){
    try{
      if (navigator.serviceWorker && navigator.serviceWorker.controller){
        navigator.serviceWorker.controller.postMessage({ type:"SKIP_WAITING" });
      }
      // Hard reload
      location.reload(true);
    }catch{
      location.reload();
    }
  }

  window.addEventListener("DOMContentLoaded", async ()=>{
    try{
      bindTabs();

      // SW register
      if ("serviceWorker" in navigator){
        navigator.serviceWorker.register("./sw.js");
      }

      const btn = document.getElementById("btnUpdate");
      if (btn) btn.addEventListener("click", forceUpdate);

      await renderAll();
    }catch(e){
      console.error(e);
      setStatus("JS Error: " + (e && e.message ? e.message : String(e)));
      alert("Anzeige Fehler in JS. " + (e && e.message ? e.message : String(e)));
    }
  });
})();
