import { isoDate } from "./utils.js";
import { entriesAdd } from "./db.js";

export const BOSSES = [
  { week: 2,  name:"The Foundation Beast", xp:650,  workout:["Goblet Squat 5×10","Floor Press 5×8","DB Row 5×10 (Pause)"] },
  { week: 4,  name:"The Asymmetry Lord", xp:800,   workout:["Bulgarian 4×8/Seite","1-Arm Row 4×10/Seite","Side Plank 3×45s/Seite"] },
  { week: 6,  name:"The Core Guardian", xp:900,    workout:["Hollow 4×40s","Shoulder Taps 4×30","Goblet Hold 3×45s"] },
  { week: 8,  name:"The Conditioning Reaper", xp:1100, workout:["5 Runden: Burpees 30s","Mountain 30s","High Knees 30s","Pause 60s"] },
  { week: 10, name:"The Iron Champion", xp:1400,  workout:["Komplex 6 Runden (6/Move)","Deadlift→Clean→Front Squat→Push Press"] },
  { week: 12, name:"FINAL: Iron Overlord", xp:2400, workout:["Goblet 4×12","Floor Press 4×10","1-Arm Row 4×10","Bulgarian 3×8","Plank 3×60s"] },
];

const KEY = "iq_boss_v4";

function loadBossState() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}
function saveBossState(s) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function renderBossPanel(container, currentWeek) {
  const st = loadBossState();
  const today = isoDate();

  container.innerHTML = `
    <div class="card">
      <h2>👹 Boss Fights</h2>
      <p class="hint">Boss kann nur in seiner Woche „gecleart“ werden. Clear gibt XP Eintrag.</p>

      <div class="pill"><b>Aktuell:</b> W${currentWeek} • Heute: ${today}</div>
      <div class="divider"></div>

      <ul class="list" id="bossList"></ul>
    </div>
  `;

  const ul = document.getElementById("bossList");
  ul.innerHTML = "";

  BOSSES.forEach(b=>{
    const cleared = st[b.week]?.cleared === true;
    const locked = currentWeek !== b.week;

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="entryRow">
        <div>
          <div class="entryTitle">W${b.week}: ${b.name}</div>
          <div class="small">XP: ${b.xp} • ${locked ? "🔒 Locked" : "✅ Active"}</div>
          <div class="hint">${b.workout.map(x=>"• "+x).join("<br>")}</div>
          ${cleared ? `<div class="badge ok">CLEARED</div>` : ``}
        </div>
        <button class="${cleared ? "secondary" : ""}" ${cleared || locked ? "disabled":""} data-clear="${b.week}">
          Clear
        </button>
      </div>
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll("button[data-clear]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const week = Number(btn.getAttribute("data-clear"));
      const b = BOSSES.find(x=>x.week===week);
      if (!b) return;

      const ok = confirm(`Boss clearen?\n\n${b.name}\n+${b.xp} XP`);
      if (!ok) return;

      await entriesAdd({
        date: today,
        week,
        exercise: `Bossfight CLEARED: ${b.name}`,
        type: "Boss",
        detail: `Workout: ${b.workout.join(" | ")}`,
        xp: b.xp
      });

      st[week] = { cleared:true, clearedAt: today };
      saveBossState(st);

      window.dispatchEvent(new Event("iq:refresh"));
    });
  });
}

export function resetBoss() {
  localStorage.removeItem(KEY);
}
