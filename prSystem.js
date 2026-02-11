// prSystem.js
import { $, loadJSON, saveJSON, safeText } from "./utils.js";

const KEY_PR = "iq_pr_v3";

function loadPR(){ return loadJSON(KEY_PR, {}); }
function savePR(m){ saveJSON(KEY_PR, m); }

/**
 * PR Key: exercise name
 * Value: { bestXp:number, bestLoad:number, bestReps:number, bestSets:number, bestMinutes:number, dateISO:string }
 */
export function checkAndUpdatePR(entry, meta = {}) {
  const pr = loadPR();
  const name = String(entry.exercise || "");
  if (!name) return { isPR:false };

  const old = pr[name] || null;

  // 3 PR Arten: XP PR, Load PR (optional), Reps PR (optional)
  const newXp = Number(entry.xp || 0);
  const newLoad = Number(meta.load || 0);
  const newReps = Number(meta.reps || 0);
  const newSets = Number(meta.sets || 0);
  const newMin = Number(meta.minutes || 0);

  let isPR = false;
  const updates = [];

  if (!old || newXp > (old.bestXp || 0)) { isPR = true; updates.push(`XP ${old?.bestXp||0} → ${newXp}`); }

  if (newLoad > 0 && (!old || newLoad > (old.bestLoad || 0))) { isPR = true; updates.push(`Load ${old?.bestLoad||0} → ${newLoad}`); }
  if (newReps > 0 && (!old || newReps > (old.bestReps || 0))) { isPR = true; updates.push(`Reps ${old?.bestReps||0} → ${newReps}`); }
  if (newMin  > 0 && (!old || newMin  > (old.bestMinutes || 0))) { isPR = true; updates.push(`Min ${old?.bestMinutes||0} → ${newMin}`); }

  if (isPR) {
    pr[name] = {
      bestXp: Math.max(old?.bestXp||0, newXp),
      bestLoad: Math.max(old?.bestLoad||0, newLoad),
      bestReps: Math.max(old?.bestReps||0, newReps),
      bestSets: Math.max(old?.bestSets||0, newSets),
      bestMinutes: Math.max(old?.bestMinutes||0, newMin),
      dateISO: entry.date
    };
    savePR(pr);
  }
  return { isPR, updates, old, now: pr[name] };
}

export function ensurePRPanel(){
  const nav = document.querySelector("nav.tabs");
  const main = document.querySelector("main");
  if (!nav || !main) return;

  if (!document.querySelector('.tab[data-tab="prs"]')) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab";
    btn.setAttribute("data-tab", "prs");
    btn.textContent = "PRs";
    const exportBtn = nav.querySelector('.tab[data-tab="export"]');
    if (exportBtn) nav.insertBefore(btn, exportBtn);
    else nav.appendChild(btn);
  }

  if (!document.getElementById("tab-prs")) {
    const sec = document.createElement("section");
    sec.id = "tab-prs";
    sec.className = "panel";
    sec.innerHTML = `
      <div class="card">
        <h2>Top 10 PRs</h2>
        <p class="hint">Sortiert nach bestem XP pro Übung (inkl. Load/Reps wenn vorhanden).</p>
        <ul id="prTop10" class="skilllist"></ul>
        <div class="divider"></div>
        <button id="prReset" type="button" class="danger">PRs zurücksetzen</button>
      </div>
    `;
    main.appendChild(sec);

    $("#prReset")?.addEventListener("click", () => {
      if (!confirm("Wirklich alle PRs löschen?")) return;
      localStorage.removeItem(KEY_PR);
      document.dispatchEvent(new CustomEvent("iq:rerender"));
    });
  }
}

export function renderPRTop10(){
  ensurePRPanel();
  const pr = loadPR();
  const items = Object.entries(pr).map(([name,v]) => ({ name, ...v }));
  items.sort((a,b)=> (b.bestXp||0) - (a.bestXp||0));
  const top10 = items.slice(0,10);

  const ul = $("prTop10");
  if (!ul) return;
  ul.innerHTML = top10.length ? "" : "<li>—</li>";

  top10.forEach((x,i)=>{
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="entryRow">
        <div style="min-width:0;">
          <div><b>${i+1}.</b> ${safeText(x.name)}</div>
          <div class="hint">XP PR: <b>${Math.round(x.bestXp||0)}</b> • Load: ${x.bestLoad||0} • Reps: ${x.bestReps||0} • Sets: ${x.bestSets||0} • Min: ${x.bestMinutes||0}</div>
          <div class="hint">Letztes PR: ${safeText(x.dateISO||"—")}</div>
        </div>
        <span class="badge">PR</span>
      </div>
    `;
    ul.appendChild(li);
  });
}

export function showPRPopup(prResult){
  if (!prResult?.isPR) return;

  // iOS-friendly confirm
  const msg =
    `🏆 NEW PR!\n\n` +
    (prResult.updates?.length ? prResult.updates.join("\n") : "Neuer Bestwert!") +
    `\n\nBonus XP hinzufügen? (+100 XP)`;

  const bonus = confirm(msg);
  return { bonusXp: bonus ? 100 : 0 };
}
