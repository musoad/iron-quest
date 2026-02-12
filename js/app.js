import { $, isoDate, fmt, safeText } from "./utils.js";
import { entriesGetAll, entriesAdd, entriesPut, entriesDelete } from "./db.js";
import { listExerciseNames, getExercise } from "./exercises.js";
import { calcEntryXP } from "./xpSystem.js";
import { ensureStartDate, setStartDate, getWeekNumber, clampWeek, levelFromTotalXp, titleForLevel, computeStreak, streakMultiplier, adaptiveHint } from "./progression.js";
import { attrFromEntry, attrLevelFromXp } from "./attributes.js";
import { computeSkillPoints, skillTrees, loadSkill, unlockNode, resetSkill, skillMultiplierForType } from "./skilltree.js";
import { renderAnalyticsPanel, renderDashboardMiniAnalytics } from "./analytics.js";
import { renderHealthPanel } from "./health.js";
import { renderBossPanel, resetBoss } from "./boss.js";
import { renderChallengePanel, challengeMultiplier } from "./challenges.js";
import { renderBackupPanel } from "./backup.js";

/* =========================
   APP BOOT
========================= */

function sortEntriesDesc(entries) {
  return entries.sort((a,b)=>{
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.id||0) - (a.id||0);
  });
}

function bindTabs() {
  document.querySelectorAll(".tabbtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      activateTab(btn.getAttribute("data-tab"));
    });
  });

  const hash = (location.hash || "#dashboard").replace("#","");
  activateTab(hash);
}

function activateTab(tabId) {
  document.querySelectorAll(".tabbtn").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));

  const btn = document.querySelector(`.tabbtn[data-tab="${tabId}"]`);
  const panel = document.getElementById(tabId);

  if (btn) btn.classList.add("active");
  if (panel) panel.classList.add("active");

  location.hash = tabId;
}

function renderPlayerInfo({ totalXp, level, title, streak }) {
  const el = $("playerInfo");
  if (!el) return;
  el.innerHTML = `
    <span class="badge">XP: <b>${fmt(totalXp)}</b></span>
    <span class="badge">Lv <b>${level}</b> (${safeText(title)})</span>
    <span class="badge ${streak>=7 ? "ok":""}">🔥 Streak: <b>${streak}</b></span>
  `;
}

function renderDashboard(container, entries, currentWeek) {
  const start = ensureStartDate();

  let todayXP = 0, weekXP = 0, totalXP = 0;
  const today = isoDate();

  const attr = { STR:0, STA:0, END:0, MOB:0 };

  for (const e of entries) {
    totalXP += (e.xp || 0);
    if (e.date === today) todayXP += (e.xp || 0);
    if (e.week === currentWeek) weekXP += (e.xp || 0);

    const a = attrFromEntry(e);
    attr.STR += a.STR; attr.STA += a.STA; attr.END += a.END; attr.MOB += a.MOB;
  }

  const st = computeStreak(entries);
  const lv = levelFromTotalXp(totalXP);

  renderPlayerInfo({ totalXp: totalXP, level: lv.lvl, title: titleForLevel(lv.lvl), streak: st.current || 0 });

  const ad = adaptiveHint(entries, currentWeek);

  container.innerHTML = `
    <div class="card">
      <h2>Dashboard</h2>
      <p class="hint">Startdatum bestimmt Woche 1. Änderungen wirken sofort auf Wochen-Zuordnung.</p>

      <div class="row2">
        <div class="pill"><b>Startdatum:</b> <span id="dStart">${start}</span></div>
        <div class="pill"><b>Aktuelle Woche:</b> W${currentWeek}</div>
      </div>

      <label>Startdatum ändern
        <input id="startInput" type="date" value="${start}">
      </label>
      <button id="startSave" class="secondary">Startdatum speichern</button>

      <div class="divider"></div>

      <div class="row2">
        <div class="pill"><b>Heute:</b> ${fmt(todayXP)} XP</div>
        <div class="pill"><b>Woche:</b> ${fmt(weekXP)} XP</div>
      </div>

      <div class="pill" style="margin-top:10px;">
        <b>🧬 KI-Adaptive Progression:</b> ${safeText(ad.text)}
      </div>
    </div>

    <div id="dashMini"></div>

    <div class="card">
      <h2>Attribute</h2>
      <div class="row2">
        ${renderAttrPill("STR", attr.STR)}
        ${renderAttrPill("STA", attr.STA)}
      </div>
      <div class="row2">
        ${renderAttrPill("END", attr.END)}
        ${renderAttrPill("MOB", attr.MOB)}
      </div>
    </div>

    <div class="card">
      <h2>Letzte Einträge</h2>
      <ul class="list">
        ${entries.slice(0,8).map(e=>`
          <li>
            <div class="entryRow">
              <div>
                <div class="entryTitle">${safeText(e.date)} • ${safeText(e.exercise)}</div>
                <div class="small">W${e.week} • ${safeText(e.type)} • ${safeText(e.detail||"")}</div>
              </div>
              <span class="badge">${fmt(e.xp)} XP</span>
            </div>
          </li>
        `).join("") || "<li>—</li>"}
      </ul>
    </div>
  `;

  renderDashboardMiniAnalytics(document.getElementById("dashMini"), entries, currentWeek);

  document.getElementById("startSave").onclick = async ()=>{
    const v = document.getElementById("startInput").value;
    if (!v) return alert("Bitte Startdatum wählen.");

    const ok = confirm("Startdatum ändern? Wochen-Zuordnung wird neu gerechnet.");
    if (!ok) return;

    setStartDate(v);
    // Weeks neu berechnen:
    const all = await entriesGetAll();
    for (const e of all) {
      const nw = clampWeek(getWeekNumber(e.date));
      if (e.week !== nw) {
        e.week = nw;
        await entriesPut(e);
      }
    }
    window.dispatchEvent(new Event("iq:refresh"));
  };
}

function renderAttrPill(key, xp) {
  const val = Math.round(Number(xp||0));
  const lv = attrLevelFromXp(val);
  return `
    <div class="pill">
      <b>${key}</b> • Lv ${lv.lvl}<br>
      <span class="small">${fmt(val)} XP • ${fmt(Math.max(0, lv.need - lv.into))} bis nächstes Lv</span>
    </div>
  `;
}

/* ---------- LOG ---------- */
function renderLog(container, entries, currentWeek) {
  const names = listExerciseNames();
  const today = isoDate();

  container.innerHTML = `
    <div class="card">
      <h2>Log</h2>
      <p class="hint">Speichert in IndexedDB (offline). Sätze/Reps = „tatsächlich“, Empfehlungen stehen bei der Übung.</p>

      <input id="editId" type="hidden" value="">

      <label>Datum
        <input id="lDate" type="date" value="${today}">
      </label>

      <label>Übung
        <select id="lEx">
          ${names.map(n=>`<option value="${safeText(n)}">${safeText(n)}</option>`).join("")}
        </select>
      </label>

      <div class="row2">
        <div>
          <label>Tatsächliche Sets
            <input id="lSets" inputmode="numeric" placeholder="z.B. 4">
          </label>
        </div>
        <div>
          <label>Tatsächliche Reps
            <input id="lReps" inputmode="numeric" placeholder="z.B. 10">
          </label>
        </div>
      </div>

      <label>NEAT Minuten (nur bei Walking)
        <input id="lMin" inputmode="numeric" placeholder="z.B. 60">
      </label>

      <label>Notiz (optional)
        <input id="lNote" placeholder="z.B. schwer, gute Form">
      </label>

      <div class="row2">
        <div class="pill"><b>Empfehlung:</b> <span id="lRec">—</span></div>
        <div class="pill"><b>XP Preview:</b> <span id="lXP">—</span></div>
      </div>

      <div class="row2">
        <button id="lSave">Speichern</button>
        <button id="lCancel" class="secondary" disabled>Abbrechen</button>
      </div>

      <div class="divider"></div>

      <h3>Einträge</h3>
      <ul class="list" id="lList"></ul>
      <button id="lClear" class="danger">Alle Einträge löschen</button>
    </div>
  `;

  const exSel = document.getElementById("lEx");
  const dateEl = document.getElementById("lDate");

  const updatePreview = () => {
    const date = dateEl.value || today;
    const week = clampWeek(getWeekNumber(date));
    const name = exSel.value;
    const ex = getExercise(name);

    const rec = ex?.rec ? `${ex.rec.sets} Sets • ${ex.rec.reps} Reps` : "—";
    document.getElementById("lRec").textContent = rec;

    const skill = skillMultiplierForType(ex?.type);
    const ch = challengeMultiplier(entries, week);
    const streak = streakMultiplier((computeStreak(entries).current || 0));

    const { xp } = calcEntryXP(
      { exerciseName: name, minutes: Number(document.getElementById("lMin").value || 0) },
      { skill, challenge: ch, streak }
    );

    document.getElementById("lXP").textContent = `${fmt(xp)} XP • W${week}`;
  };

  ["lEx","lDate","lSets","lReps","lMin"].forEach(id=>{
    document.getElementById(id)?.addEventListener("input", updatePreview);
    document.getElementById(id)?.addEventListener("change", updatePreview);
  });

  updatePreview();

  // list
  const ul = document.getElementById("lList");
  ul.innerHTML = entries.length ? "" : `<li>—</li>`;
  entries.slice(0, 80).forEach(e=>{
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="entryRow">
        <div>
          <div class="entryTitle">${safeText(e.date)} • ${safeText(e.exercise)}</div>
          <div class="small">W${e.week} • ${safeText(e.type)} • ${safeText(e.detail||"")}</div>
        </div>
        <div class="row" style="margin:0">
          <span class="badge">${fmt(e.xp)} XP</span>
          <button class="secondary" data-edit="${e.id}">Edit</button>
          <button class="danger" data-del="${e.id}">Del</button>
        </div>
      </div>
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll("button[data-del]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = Number(btn.getAttribute("data-del"));
      if (!confirm("Eintrag löschen?")) return;
      await entriesDelete(id);
      window.dispatchEvent(new Event("iq:refresh"));
    });
  });

  ul.querySelectorAll("button[data-edit]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = Number(btn.getAttribute("data-edit"));
      const e = entries.find(x=>x.id===id);
      if (!e) return;

      document.getElementById("editId").value = String(id);
      document.getElementById("lDate").value = e.date;
      document.getElementById("lEx").value = e.exercise;

      const mSets = (e.detail||"").match(/Sets:\s*(\d+)/i);
      const mReps = (e.detail||"").match(/Reps:\s*(\d+)/i);
      const mMin  = (e.detail||"").match(/Min:\s*(\d+)/i);

      document.getElementById("lSets").value = mSets ? mSets[1] : "";
      document.getElementById("lReps").value = mReps ? mReps[1] : "";
      document.getElementById("lMin").value = mMin ? mMin[1] : "";

      document.getElementById("lCancel").disabled = false;
      updatePreview();
    });
  });

  document.getElementById("lCancel").onclick = ()=>{
    document.getElementById("editId").value = "";
    document.getElementById("lCancel").disabled = true;
    document.getElementById("lSets").value = "";
    document.getElementById("lReps").value = "";
    document.getElementById("lMin").value = "";
    document.getElementById("lNote").value = "";
    updatePreview();
  };

  document.getElementById("lSave").onclick = async ()=>{
    const editId = Number(document.getElementById("editId").value || 0);
    const date = document.getElementById("lDate").value || today;
    const week = clampWeek(getWeekNumber(date));
    const name = document.getElementById("lEx").value;
    const ex = getExercise(name);

    const sets = Number(document.getElementById("lSets").value || 0);
    const reps = Number(document.getElementById("lReps").value || 0);
    const min  = Number(document.getElementById("lMin").value || 0);
    const note = String(document.getElementById("lNote").value || "");

    const skill = skillMultiplierForType(ex?.type);
    const ch = challengeMultiplier(entries, week);
    const streak = streakMultiplier((computeStreak(entries).current || 0));

    const { xp, type } = calcEntryXP(
      { exerciseName: name, minutes: min },
      { skill, challenge: ch, streak }
    );

    const rec = ex?.rec ? `${ex.rec.sets} Sets • ${ex.rec.reps} Reps` : "—";
    let detail = `Empf: ${rec}`;
    if (type === "NEAT") detail = `Min: ${Math.round(min)} • ` + detail;
    if (type !== "NEAT" && type !== "Rest") detail = `Sets: ${Math.round(sets)} • Reps: ${Math.round(reps)} • ` + detail;
    if (note) detail += ` • Note: ${note}`;
    detail += ` • Skill x${skill.toFixed(2)} • Challenge x${ch.toFixed(2)} • Streak x${streak.toFixed(2)}`;

    if (editId) {
      await entriesPut({ id: editId, date, week, exercise: name, type, detail, xp });
    } else {
      await entriesAdd({ date, week, exercise: name, type, detail, xp });
    }

    window.dispatchEvent(new Event("iq:refresh"));
    alert(editId ? "Updated ✅" : "Saved ✅");
  };

  document.getElementById("lClear").onclick = async ()=>{
    alert("Diese Funktion ist in v4 PRO absichtlich nicht als One-Click drin.\nWenn du sie willst, sag Bescheid.");
  };
}

/* ---------- SKILLTREE ---------- */
function renderSkillPanel(container, entries) {
  const st = loadSkill();
  const sp = computeSkillPoints(entries);
  const trees = skillTrees();

  container.innerHTML = `
    <div class="card">
      <h2>🌳 Skilltree</h2>
      <p class="hint">Skillpunkte: pro Tag 0–3 (nach Sternen). Nodes geben +2% XP pro Unlock + Capstone Bonus.</p>

      <div class="row2">
        <div class="pill"><b>Earned:</b> ${fmt(sp.earned)}</div>
        <div class="pill"><b>Available:</b> ${fmt(sp.available)} (Spent ${fmt(sp.spent)})</div>
      </div>

      <div class="divider"></div>

      <div class="grid2" id="treeGrid"></div>

      <div class="divider"></div>
      <button id="skillReset" class="danger">Skilltree reset</button>
    </div>
  `;

  const grid = document.getElementById("treeGrid");
  grid.innerHTML = "";

  trees.forEach(t=>{
    const nodes = st.nodes[t.key] || [];
    const box = document.createElement("div");
    box.className = "card";

    box.innerHTML = `
      <h3>${safeText(t.name)}</h3>
      <p class="hint">Typ: ${safeText(t.type)} • Multiplikator wirkt automatisch</p>
      <ul class="list">
        ${nodes.map(n=>`
          <li>
            <div class="entryRow">
              <div>
                <div class="entryTitle">${safeText(n.name)}</div>
                <div class="small">Cost ${n.cost} • ${n.unlocked ? "✅ unlocked" : "🔒 locked"}</div>
              </div>
              <button class="secondary" data-node="${n.id}" ${n.unlocked ? "disabled":""}>Unlock</button>
            </div>
          </li>
        `).join("")}
      </ul>
    `;
    grid.appendChild(box);
  });

  grid.querySelectorAll("button[data-node]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-node");
      const res = unlockNode(id, entries);
      alert(res.msg);
      if (res.ok) window.dispatchEvent(new Event("iq:refresh"));
    });
  });

  document.getElementById("skillReset").onclick = ()=>{
    if (!confirm("Skilltree wirklich resetten?")) return;
    resetSkill();
    window.dispatchEvent(new Event("iq:refresh"));
  };
}

/* ---------- SERVICE WORKER / UPDATE ---------- */
async function setupSW() {
  if (!("serviceWorker" in navigator)) return;

  const reg = await navigator.serviceWorker.register("sw.js");

  // Button: force update
  document.getElementById("forceUpdateBtn").onclick = async ()=>{
    if (reg.waiting) {
      reg.waiting.postMessage({ type:"SKIP_WAITING" });
      return;
    }
    await reg.update();
    alert("Update geprüft. Wenn verfügbar, App neu öffnen.");
  };

  // When new SW takes control -> reload (iOS: manchmal nötig)
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    location.reload();
  });
}

/* ---------- MAIN RENDER ---------- */
async function render() {
  const status = $("appStatus");
  try {
    const raw = await entriesGetAll();
    const entries = sortEntriesDesc(raw);

    // compute week from today
    ensureStartDate();
    const currentWeek = clampWeek(getWeekNumber(isoDate()));

    // Panels
    renderDashboard(document.getElementById("dashboard"), entries, currentWeek);
    renderLog(document.getElementById("log"), entries, currentWeek);
    renderSkillPanel(document.getElementById("skills"), entries);
    renderAnalyticsPanel(document.getElementById("analytics"), entries, currentWeek);
    await renderHealthPanel(document.getElementById("health"));
    renderBossPanel(document.getElementById("boss"), currentWeek);
    renderChallengePanel(document.getElementById("challenge"), entries, currentWeek);
    await renderBackupPanel(document.getElementById("backup"));

    if (status) status.textContent = `OK • W${currentWeek} • Entries: ${fmt(entries.length)}`;
  } catch (e) {
    console.error(e);
    if (status) status.textContent = "ERROR (siehe Konsole)";
    alert("Fehler in JS. Bitte Safari-Konsole Screenshot schicken.");
  }
}

function boot() {
  bindTabs();
  setupSW();
  render();
  window.addEventListener("iq:refresh", render);
}

boot();
