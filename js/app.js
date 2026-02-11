// app.js (v3 PRO orchestrator)
import { $, isoDate, loadJSON, saveJSON, todayISO, debounce } from "./utils.js";
import { idbGetAll, idbAdd, idbPut, idbDelete, idbClear, sortEntriesDesc } from "./db.js";
import { getMutationForWeek, mutationXpMultiplierForType, resetMutations } from "./mutations.js";
import { ensurePRPanel, renderPRTop10, checkAndUpdatePR, showPRPopup } from "./prSystem.js";
import { getStatus, setStatus, statusIcon, nextStatus } from "./statusIcons.js";
import { ensureHealthPanel, renderHealth } from "./health.js";
import { ensureBackupPanel } from "./cloud.js";
import { ensureAnalyticsTab, renderAnalyticsPro } from "./analyticsPro.js";
import { ensureChallengeState, challengeMultiplier, toggleChallenge, setChallengeMult } from "./challenge.js";
import { getStreak, updateStreakOnTrainingDay } from "./streak.js";
import { skillMultiplierForType, renderSkillTrees, computeSkillPointsAvailable, resetSkillTree } from "./skilltree.js";

// ✅ Deine 3 Dateien:
import { EXERCISES, buildExerciseDropdown, getExerciseMeta } from "./exercises.js";
import { computeXP } from "./xpSystem.js";
import { levelFromTotalXp, titleForLevel, getAdaptiveModifiers, getStarThresholdsForWeek, starsForDay } from "./progression.js";

/* ========= KEYS ========= */
const KEY_START_V3 = "iq_startdate_v3";
const KEY_CAL = "ironquest_calendar_v20";
const KEY_PLANOVR = "ironquest_plan_overrides_v20";

/* ========= STARTDATE / WEEK ========= */
function ensureStartDate(){
  let start = localStorage.getItem(KEY_START_V3);
  if (!start) {
    // fallback migration
    const old = localStorage.getItem("ironquest_startdate_v20") || localStorage.getItem("ironquest_startdate");
    start = (old && /^\d{4}-\d{2}-\d{2}$/.test(old)) ? old : isoDate(new Date());
    localStorage.setItem(KEY_START_V3, start);
  }
  if ($("startDateDash")) $("startDateDash").value = start;
  return start;
}
function setStartDateLocal(newISO){
  localStorage.setItem(KEY_START_V3, newISO);
  if ($("startDateDash")) $("startDateDash").value = newISO;
}
function daysBetween(aISO, bISO){
  return Math.floor((new Date(bISO)-new Date(aISO))/86400000);
}
function getWeekNumber(startISO, dateISO){
  const diff = daysBetween(startISO, dateISO);
  return diff < 0 ? 0 : Math.floor(diff/7)+1;
}
function clampWeek(w){ return Math.max(1, Math.min(52, Number(w||1))); }
function currentWeekFor(dateISO){
  const start = ensureStartDate();
  return clampWeek(getWeekNumber(start, dateISO));
}
async function recalcAllEntryWeeks(){
  const start = ensureStartDate();
  const all = await idbGetAll();
  for (const e of all){
    const nw = clampWeek(getWeekNumber(start, e.date));
    if (e.week !== nw){
      e.week = nw;
      await idbPut(e);
    }
  }
}
function resetWeekBoundSystems(){
  resetMutations();
  localStorage.removeItem("ironquest_weeklyach_v20");
  localStorage.removeItem("ironquest_boss_v20");
  localStorage.removeItem("ironquest_boss_checks_v20");
}

/* ========= UI: ensure missing panels ========= */
function ensureProPanels(){
  ensurePRPanel();
  ensureHealthPanel();
  ensureBackupPanel();
  ensureAnalyticsTab();
}

/* ========= LOG DRAFT ========= */
function loadDraft(){ return loadJSON("ironquest_log_draft_v3", {}); }
function saveDraft(d){ saveJSON("ironquest_log_draft_v3", d); }
function autosaveDraft(){
  const date = $("date")?.value;
  if (!date) return;
  const d = loadDraft();
  d[date] = {
    date,
    exercise: $("exercise")?.value || "",
    sets: $("sets")?.value || "",
    reps: $("reps")?.value || "",
    load: $("load")?.value || "",
    minutes: $("walkMin")?.value || "",
    note: $("note")?.value || ""
  };
  saveDraft(d);
}
function restoreDraft(){
  const date = $("date")?.value;
  if (!date) return;
  const d = loadDraft()[date];
  if (!d) return;
  if ($("exercise") && d.exercise) $("exercise").value = d.exercise;
  if ($("sets") && d.sets) $("sets").value = d.sets;
  if ($("reps") && d.reps) $("reps").value = d.reps;
  if ($("load") && d.load) $("load").value = d.load;
  if ($("walkMin") && d.minutes) $("walkMin").value = d.minutes;
  if ($("note") && d.note) $("note").value = d.note;
}

/* ========= EXTRA INPUTS (Load + Note) ========= */
function ensureExtraInputs(){
  // load field
  if (!$("load")){
    const setsRow = document.getElementById("setsRow");
    if (setsRow){
      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <label>Gewicht / Load (optional)
          <input id="load" type="number" step="0.5" inputmode="decimal" placeholder="z.B. 22.5">
        </label>
      `;
      setsRow.appendChild(wrap);
    }
  }
  // note
  if (!$("note")){
    const addBtn = $("add");
    const card = addBtn?.closest(".card");
    if (card){
      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <label>Notiz (optional)
          <input id="note" type="text" placeholder="z.B. RPE 8, gutes Pump">
        </label>
      `;
      const divider = card.querySelector(".divider");
      if (divider) divider.insertAdjacentElement("beforebegin", wrap);
      else card.appendChild(wrap);
    }
  }
}

/* ========= WEEKLY PLAN (keine neue HTML nötig) ========= */
const PLAN_DEFAULT = {
  "Mon": ["DB Floor Press (neutral)","Arnold Press","Deficit Push-Ups","Overhead Trizeps Extension","DB Lateral Raises"],
  "Tue": ["1-Arm DB Row (Pause oben)","Renegade Rows","Reverse Flys (langsam)","DB Supinated Curl","Farmer’s Carry (DB)"],
  "Wed": ["Ruhetag (Recovery + Mobility)"],
  "Thu": ["Bulgarian Split Squats","DB Romanian Deadlift","Goblet Squat","Side Plank + Leg Raise","Standing DB Calf Raises"],
  "Fri": ["Komplex: Deadlift","Komplex: Clean","Komplex: Front Squat","Komplex: Push Press","Plank Shoulder Taps"],
  "Sat": ["Burpees","Mountain Climbers","High Knees","Russian Twists (DB)","Hollow Body Hold"],
  "Sun": ["Ruhetag (Recovery + Mobility)"],
};

function loadPlanOverrides(){ return loadJSON(KEY_PLANOVR, {}); }
function savePlanOverrides(x){ saveJSON(KEY_PLANOVR, x); }

function getWeekPlan(week){
  const ovr = loadPlanOverrides();
  const w = String(week);
  const base = structuredClone(PLAN_DEFAULT);
  if (!ovr[w]) return base;
  for (const k of Object.keys(ovr[w])) base[k] = ovr[w][k];
  return base;
}
function groupForDayKey(dayKey){
  if (dayKey === "Mon") return "Tag 1 – Push";
  if (dayKey === "Tue") return "Tag 2 – Pull";
  if (dayKey === "Thu") return "Tag 3 – Beine & Core";
  if (dayKey === "Fri") return "Tag 4 – Ganzkörper";
  if (dayKey === "Sat") return "Tag 5 – Conditioning & Core";
  return "Ruhetag";
}
function exercisesForGroup(groupName){
  return EXERCISES.filter(e => e.group === groupName && e.type !== "Rest");
}

function renderWeeklyPlan(curWeek, entries){
  const content = $("planContent");
  if (!content) return;

  const start = ensureStartDate();
  const w = clampWeek(curWeek || 1);
  const plan = getWeekPlan(w);
  const mutation = getMutationForWeek(w);
  const adaptive = getAdaptiveModifiers(entries, w);

  if ($("planStart")) $("planStart").textContent = start;
  if ($("planWeek")) $("planWeek").textContent = `W${w}`;
  if ($("planBlock")) $("planBlock").textContent = w <= 4 ? "Block 1" : (w<=8 ? "Block 2":"Block 3");
  if ($("planMutation")) $("planMutation").textContent = `${mutation.name} – ${mutation.effect}`;
  if ($("planAdaptive")) $("planAdaptive").textContent = `${adaptive.setDelta>=0?"+":""}${adaptive.setDelta} Sets, ${adaptive.repDelta>=0?"+":""}${adaptive.repDelta} Reps`;
  if ($("planHint")) $("planHint").textContent = adaptive.note || "—";

  const dayNames = [
    ["Mon","Montag (Tag 1 – Push)"],
    ["Tue","Dienstag (Tag 2 – Pull)"],
    ["Wed","Mittwoch (Ruhetag)"],
    ["Thu","Donnerstag (Tag 3 – Beine & Core)"],
    ["Fri","Freitag (Tag 4 – Ganzkörper)"],
    ["Sat","Samstag (Tag 5 – Conditioning)"],
    ["Sun","Sonntag (Ruhetag)"],
  ];

  let html = "";
  dayNames.forEach(([dayKey,label])=>{
    const exList = plan[dayKey] || [];
    html += `<div class="planDay"><h3>${label}</h3><ul class="planList">`;

    if (dayKey === "Wed" || dayKey === "Sun"){
      html += `<li><b>Ruhetag</b><br><span class="small">10–20 Min Mobility + Spaziergang.</span></li></ul></div>`;
      return;
    }

    const group = groupForDayKey(dayKey);
    const options = exercisesForGroup(group);

    exList.forEach((exName, idx)=>{
      const meta = getExerciseMeta(exName);
      const type = meta?.type || "Mehrgelenkig";
      const icon = statusIcon(getStatus(w, dayKey, idx));
      const rec = meta?.recommended ? meta.recommended(w, adaptive) : { setsText:"—", repsText:"—" };

      let sel = `<select class="swapSel" data-day="${dayKey}" data-idx="${idx}">`;
      options.forEach(o=>{
        sel += `<option value="${o.name}" ${o.name===exName?"selected":""}>${o.name}</option>`;
      });
      sel += `</select>`;

      html += `
        <li class="planItem">
          <button type="button" class="planStatusBtn" data-status-week="${w}" data-day="${dayKey}" data-idx="${idx}" title="Status toggeln">${icon}</button>
          <div class="planMain">
            <div><b>${exName}</b></div>
            <div class="small">${type} • Empf: ${rec.setsText} / ${rec.repsText}</div>
            <div class="small">${meta?.desc ? meta.desc : ""}</div>
            <div class="small">Swap: ${sel}</div>
          </div>
        </li>
      `;
    });

    html += `</ul></div>`;
  });

  content.innerHTML = html;

  content.querySelectorAll("select.swapSel").forEach(sel=>{
    sel.addEventListener("change", ()=>{
      const day = sel.getAttribute("data-day");
      const idx = parseInt(sel.getAttribute("data-idx"),10);
      const val = sel.value;
      const ovr = loadPlanOverrides();
      const wk = String(w);
      ovr[wk] ??= {};
      ovr[wk][day] = (ovr[wk][day] || (PLAN_DEFAULT[day] || [])).slice();
      ovr[wk][day][idx] = val;
      savePlanOverrides(ovr);
      document.dispatchEvent(new CustomEvent("iq:rerender"));
    });
  });

  content.querySelectorAll("button.planStatusBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const week = parseInt(btn.getAttribute("data-status-week"),10);
      const day = btn.getAttribute("data-day");
      const idx = parseInt(btn.getAttribute("data-idx"),10);
      const cur = getStatus(week, day, idx);
      const nxt = nextStatus(cur);
      setStatus(week, day, idx, nxt);
      btn.textContent = statusIcon(nxt);
    });
  });
}

/* ========= Calendar (minimal: nutzt vorhandene DOM) ========= */
function loadCalendarState(){
  return loadJSON(KEY_CAL, { weekOffset: 0, selectedDate: isoDate(new Date()) });
}
function saveCalendarState(st){ saveJSON(KEY_CAL, st); }

/* ========= Render ========= */
async function computeStats(entries){
  const startDate = ensureStartDate();
  const today = todayISO();
  const curWeek = clampWeek(getWeekNumber(startDate, today));

  let todayXp = 0, weekXp = 0, totalXp = 0;
  for (const e of entries){
    totalXp += e.xp || 0;
    if (e.date === today) todayXp += e.xp || 0;
    if ((e.week || currentWeekFor(e.date)) === curWeek) weekXp += e.xp || 0;
  }
  return { todayXp, weekXp, totalXp, curWeek, startDate };
}

function renderDashboard(stats, entries){
  if ($("startDisplay")) $("startDisplay").textContent = stats.startDate;
  if ($("weekNumber")) $("weekNumber").textContent = `W${stats.curWeek}`;
  if ($("todayXp")) $("todayXp").textContent = stats.todayXp;
  if ($("weekXp")) $("weekXp").textContent = stats.weekXp;
  if ($("totalXp")) $("totalXp").textContent = stats.totalXp;

  const lv = levelFromTotalXp(stats.totalXp);
  if ($("level")) $("level").textContent = lv.lvl;
  if ($("title")) $("title").textContent = titleForLevel(lv.lvl);

  const thr = getStarThresholdsForWeek(stats.curWeek, entries);
  if ($("todayStars")) $("todayStars").textContent = starsForDay(stats.todayXp, thr);
  if ($("appStatus")) $("appStatus").textContent = `OK • ⭐ ${thr.one} • ⭐⭐ ${thr.two} • ⭐⭐⭐ ${thr.three}`;

  // streak display (inject pill)
  const todayCard = document.querySelector("#tab-dash .card:nth-of-type(2)");
  if (todayCard && !document.getElementById("streakPill")){
    const row = todayCard.querySelector(".row2:last-of-type") || todayCard.querySelector(".row2");
    const pill = document.createElement("div");
    pill.className = "pill";
    pill.id = "streakPill";
    pill.innerHTML = `<b>Streak:</b> <span id="streakNow">0</span> (Best <span id="streakBest">0</span>)`;
    row?.appendChild(pill);
  }
  const st = getStreak();
  if ($("streakNow")) $("streakNow").textContent = st.current || 0;
  if ($("streakBest")) $("streakBest").textContent = st.best || 0;
}

function renderRecent(entries){
  const ul = $("recentList");
  if (!ul) return;
  const recent = entries.slice(0, 6);
  ul.innerHTML = recent.length ? "" : "<li>Noch keine Einträge.</li>";
  recent.forEach(e=>{
    const li=document.createElement("li");
    li.textContent = `${e.date} (W${e.week}) • ${e.exercise} • ${e.xp} XP`;
    ul.appendChild(li);
  });
}

function ensureRepsInput(){
  if ($("reps")) return;
  const setsRow = $("setsRow");
  if (!setsRow) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <label>Wiederholungen pro Satz
      <input id="reps" type="number" min="0" step="1" inputmode="numeric" placeholder="z. B. 10">
    </label>
  `;
  setsRow.appendChild(wrap);
}

function toggleLogRowsByType(type){
  const walkingRow = $("walkingRow");
  const setsRow = $("setsRow");
  if (!walkingRow || !setsRow) return;
  const isWalk = type === "NEAT";
  const isRest = type === "Rest";
  walkingRow.classList.toggle("hide", !isWalk);
  setsRow.classList.toggle("hide", isWalk || isRest);
}

async function renderAll(){
  ensureProPanels();
  ensureExtraInputs();
  ensureRepsInput();

  ensureStartDate();
  ensureChallengeState();

  buildExerciseDropdown("exercise"); // in exercises.js: build dropdown by id

  const entries = sortEntriesDesc(await idbGetAll());
  // ensure week field
  entries.forEach(e=>{ if (!e.week) e.week = currentWeekFor(e.date); });

  const stats = await computeStats(entries);
  renderDashboard(stats, entries);
  renderRecent(entries);

  // Weekly Plan
  renderWeeklyPlan(stats.curWeek, entries);

  // PR screen
  renderPRTop10();

  // Health screen
  renderHealth();

  // Skilltrees
  const sp = computeSkillPointsAvailable(entries, starsForDay, getStarThresholdsForWeek, (d)=>currentWeekFor(d));
  const avail = sp.available;
  if ($("skillPointsAvail")) $("skillPointsAvail").textContent = avail;
  renderSkillTrees(entries, stats.curWeek, avail);

  // Analytics pro
  const thr = getStarThresholdsForWeek(stats.curWeek, entries);
  renderAnalyticsPro(entries, stats.curWeek, thr, starsForDay, (d)=>currentWeekFor(d), stats.startDate);

  // update log UI
  await updateLogUI(entries, stats.curWeek);
  renderEntriesList(entries);
}

/* ========= Log UI ========= */
async function updateLogUI(entries, curWeek){
  const date = $("date")?.value || todayISO();
  const week = currentWeekFor(date);
  if ($("logStart")) $("logStart").textContent = ensureStartDate();
  if ($("logWeek")) $("logWeek").textContent = `W${week}`;

  const exName = $("exercise")?.value || "";
  const meta = getExerciseMeta(exName);
  const type = meta?.type || "Mehrgelenkig";
  if ($("autoType")) $("autoType").textContent = type;

  const mutation = getMutationForWeek(week);
  const adaptive = getAdaptiveModifiers(entries, week);

  const rec = meta?.recommended ? meta.recommended(week, adaptive) : { setsText:"—", repsText:"—", setsValue:null, repsValue:null };
  if ($("recommendedSets")) $("recommendedSets").textContent = rec.setsText || "—";
  if ($("recommendedReps")) $("recommendedReps").textContent = rec.repsText || "—";

  toggleLogRowsByType(type);

  // preview XP
  const sets = Number($("sets")?.value || 0) || 0;
  const reps = Number($("reps")?.value || 0) || 0;
  const load = Number($("load")?.value || 0) || 0;
  const minutes = Number($("walkMin")?.value || 0) || 0;

  const skillMult = skillMultiplierForType(type);
  const mutMult = mutationXpMultiplierForType(type, mutation);
  const challMult = challengeMultiplier();

  const xp = computeXP({
    dateISO: date,
    week,
    exercise: exName,
    type,
    sets, reps, load, minutes,
    mutationMultiplier: mutMult,
    skillMultiplier: skillMult,
    challengeMultiplier: challMult
  });

  if ($("calcXp")) $("calcXp").textContent = xp;
  if ($("calcInfo")) $("calcInfo").textContent =
    `Mut x${mutMult.toFixed(2)} • Skill x${skillMult.toFixed(2)} • Challenge x${challMult.toFixed(2)}`;
}

function renderEntriesList(entries){
  const list = $("list");
  if (!list) return;
  list.innerHTML = entries.length ? "" : "<li>Noch keine Einträge.</li>";

  entries.forEach(e=>{
    const li=document.createElement("li");
    li.innerHTML = `
      <div class="entryRow">
        <div style="min-width:0;">
          <div class="entryTitle"><b>${e.date}</b> (W${e.week}) • <b>${e.exercise}</b></div>
          <div class="hint">${e.type} • ${e.detail || ""}</div>
        </div>
        <div class="row" style="margin:0; align-items:flex-start;">
          <span class="badge">${e.xp} XP</span>
          <button class="secondary" style="width:auto; padding:10px 12px;" data-edit="${e.id}">Edit</button>
          <button class="danger" style="width:auto; padding:10px 12px;" data-del="${e.id}">Delete</button>
        </div>
      </div>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll("button[data-del]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = Number(btn.getAttribute("data-del"));
      if (!confirm("Diesen Eintrag wirklich löschen?")) return;
      await idbDelete(id);
      document.dispatchEvent(new CustomEvent("iq:rerender"));
    });
  });

  list.querySelectorAll("button[data-edit]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = Number(btn.getAttribute("data-edit"));
      const all = await idbGetAll();
      const e = all.find(x=>x.id===id);
      if (!e) return;

      $("editId").value = String(e.id);
      if ($("date")) $("date").value = e.date;
      if ($("exercise")) $("exercise").value = e.exercise;

      // try parse stored meta
      const mSets = (e.detail||"").match(/Sets:\s*(\d+)/i);
      const mReps = (e.detail||"").match(/Reps:\s*(\d+)/i);
      const mLoad = (e.detail||"").match(/Load:\s*([0-9.]+)/i);
      const mMin  = (e.detail||"").match(/Min:\s*(\d+)/i);

      if ($("sets") && mSets) $("sets").value = mSets[1];
      if ($("reps") && mReps) $("reps").value = mReps[1];
      if ($("load") && mLoad) $("load").value = mLoad[1];
      if ($("walkMin") && mMin) $("walkMin").value = mMin[1];

      if ($("add")) $("add").textContent = "Änderungen speichern";
      $("cancelEdit")?.classList.remove("hide");

      document.dispatchEvent(new CustomEvent("iq:rerender"));
    });
  });
}

/* ========= SAVE ENTRY ========= */
async function saveOrUpdateEntry(){
  const date = $("date")?.value || todayISO();
  const week = currentWeekFor(date);

  const exName = $("exercise")?.value || "Unbekannt";
  const meta = getExerciseMeta(exName);
  const type = meta?.type || "Mehrgelenkig";

  const entries = sortEntriesDesc(await idbGetAll());
  const adaptive = getAdaptiveModifiers(entries, week);
  const mutation = getMutationForWeek(week);

  const sets = Number($("sets")?.value || 0) || 0;
  const reps = Number($("reps")?.value || 0) || 0;
  const load = Number($("load")?.value || 0) || 0;
  const minutes = Number($("walkMin")?.value || 0) || 0;

  const rec = meta?.recommended ? meta.recommended(week, adaptive) : { setsText:"—", repsText:"—" };

  const skillMult = skillMultiplierForType(type);
  const mutMult = mutationXpMultiplierForType(type, mutation);
  const challMult = challengeMultiplier();

  const xp = computeXP({
    dateISO: date,
    week,
    exercise: exName,
    type,
    sets, reps, load, minutes,
    mutationMultiplier: mutMult,
    skillMultiplier: skillMult,
    challengeMultiplier: challMult
  });

  let detailParts = [];
  detailParts.push(`Empf: ${rec.setsText} / ${rec.repsText}`);
  if (type === "NEAT") detailParts.push(`Min: ${minutes||0}`);
  if (type !== "NEAT" && type !== "Rest") {
    if (sets) detailParts.push(`Sets: ${sets}`);
    if (reps) detailParts.push(`Reps: ${reps}`);
    if (load) detailParts.push(`Load: ${load}`);
  }
  const note = ($("note")?.value || "").trim();
  if (note) detailParts.push(`Note: ${note}`);
  detailParts.push(`Mut x${mutMult.toFixed(2)} • Skill x${skillMult.toFixed(2)} • Challenge x${challMult.toFixed(2)}`);
  const detail = detailParts.join(" • ");

  const editId = Number(($("editId")?.value || "").trim() || 0);

  const entry = { date, week, exercise: exName, type, detail, xp };

  if (editId) {
    await idbPut({ id: editId, ...entry });
  } else {
    await idbAdd(entry);
  }

  // PR check + bonus
  const prRes = checkAndUpdatePR(entry, { sets, reps, load, minutes });
  const prBonus = showPRPopup(prRes);
  if (prBonus?.bonusXp) {
    await idbAdd({ date, week, exercise:`PR Bonus: ${exName}`, type:"PR", detail:"Bonus XP", xp: prBonus.bonusXp });
  }

  // Streak update: zählt wenn echtes Training (nicht Rest/Quest)
  if (!["Rest","Quest","Reward"].includes(type)) {
    updateStreakOnTrainingDay(date);
  }

  // Reset edit mode
  $("editId").value = "";
  if ($("add")) $("add").textContent = "Eintrag speichern";
  $("cancelEdit")?.classList.add("hide");

  alert(`Gespeichert: ${date} • +${xp} XP ✅`);
  document.dispatchEvent(new CustomEvent("iq:rerender"));
}

/* ========= SW Update: iOS Home Screen safe ========= */
async function registerSW(){
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register("./sw.js");

    // Force update checks
    reg.update?.();

    // If new SW waiting -> activate + reload
    if (reg.waiting) {
      reg.waiting.postMessage({ type:"SKIP_WAITING" });
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // reload once controller updated
      window.location.reload();
    });

    // Periodic update check
    setInterval(() => reg.update?.(), 30 * 1000);

  } catch (e) {
    console.warn("SW register failed", e);
  }
}

/* ========= EVENTS + INIT ========= */
async function init(){
  ensureProPanels();
  ensureExtraInputs();
  ensureRepsInput();

  if ($("date")) $("date").value = todayISO();
  ensureStartDate();

  buildExerciseDropdown("exercise");

  // rerender bus
  document.addEventListener("iq:rerender", debounce(()=>renderAll(), 80));

  // start date save
  $("saveStartDash")?.addEventListener("click", async ()=>{
    const newStart = $("startDateDash")?.value;
    if (!newStart) return alert("Bitte ein Startdatum wählen.");

    const oldStart = ensureStartDate();
    if (newStart === oldStart) return alert("Startdatum unverändert.");

    if (!confirm("Startdatum rückwirkend ändern?\n✅ Einträge werden neu in Wochen einsortiert\n⚠️ Boss/Achievements/Mutations reset")) {
      $("startDateDash").value = oldStart;
      return;
    }
    setStartDateLocal(newStart);
    resetWeekBoundSystems();
    await recalcAllEntryWeeks();
    alert("Startdatum gespeichert ✅");
    document.dispatchEvent(new CustomEvent("iq:rerender"));
  });

  $("exercise")?.addEventListener("change", ()=>{ autosaveDraft(); document.dispatchEvent(new CustomEvent("iq:rerender")); });
  $("date")?.addEventListener("change", ()=>{ autosaveDraft(); restoreDraft(); document.dispatchEvent(new CustomEvent("iq:rerender")); });

  ["sets","reps","load","walkMin","note"].forEach(id=>{
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", debounce(()=>{ autosaveDraft(); document.dispatchEvent(new CustomEvent("iq:rerender")); }, 80));
  });

  $("add")?.addEventListener("click", saveOrUpdateEntry);

  $("cancelEdit")?.addEventListener("click", ()=>{
    $("editId").value = "";
    $("cancelEdit")?.classList.add("hide");
    if ($("add")) $("add").textContent = "Eintrag speichern";
    document.dispatchEvent(new CustomEvent("iq:rerender"));
  });

  $("clear")?.addEventListener("click", async ()=>{
    if (!confirm("Wirklich ALLE Einträge löschen?")) return;
    await idbClear();
    document.dispatchEvent(new CustomEvent("iq:rerender"));
  });

  $("resetSkills")?.addEventListener("click", ()=>{
    if (!confirm("Skilltrees zurücksetzen?")) return;
    resetSkillTree();
    document.dispatchEvent(new CustomEvent("iq:rerender"));
  });

  // Challenge toggle pill on dashboard (inject)
  const dash = document.getElementById("tab-dash");
  if (dash && !document.getElementById("challengeCard")){
    const cards = dash.querySelectorAll(".card");
    const after = cards?.[1] || null;
    const card = document.createElement("div");
    card.className="card";
    card.id="challengeCard";
    card.innerHTML = `
      <h2>Challenge Mode</h2>
      <div class="row2">
        <div class="pill"><b>Status:</b> <span id="chState">—</span></div>
        <div class="pill"><b>Multiplier:</b> <span id="chMult">—</span></div>
      </div>
      <div class="row2">
        <button id="chToggle" type="button" class="secondary">Toggle</button>
        <button id="ch115" type="button" class="secondary">Set x1.15</button>
      </div>
      <p class="hint">Challenge gibt mehr XP – aber du willst den Streak halten.</p>
    `;
    if (after) after.insertAdjacentElement("afterend", card);
    else dash.appendChild(card);

    $("#chToggle")?.addEventListener("click", ()=>{
      const st = toggleChallenge();
      $("#chState").textContent = st.enabled ? "ON" : "OFF";
      $("#chMult").textContent = (st.mult||1.15).toFixed(2);
      document.dispatchEvent(new CustomEvent("iq:rerender"));
    });
    $("#ch115")?.addEventListener("click", ()=>{
      const st = setChallengeMult(1.15);
      $("#chMult").textContent = (st.mult||1.15).toFixed(2);
      document.dispatchEvent(new CustomEvent("iq:rerender"));
    });
  }

  await registerSW();

  await recalcAllEntryWeeks();
  await renderAll();
  restoreDraft();
}

init().catch((e)=>{
  console.error(e);
  alert("Fehler in app.js. Bitte Screenshot der Konsole schicken.");
});
