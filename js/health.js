import { isoDate, fmt, safeText } from "./utils.js";
import { healthAdd, healthGetAll, healthDelete } from "./db.js";

function recompIndex({ weightKg, waistCm, sys, dia, pulse }) {
  // Ein einfacher motivierender Index (kein medizinisches Urteil):
  // - niedrigerer Waist gut, stabiler BP gut, Puls moderat gut
  const w = Number(weightKg || 0);
  const waist = Number(waistCm || 0);
  const s = Number(sys || 0);
  const d = Number(dia || 0);
  const p = Number(pulse || 0);

  // Baseline: 100, minus waist Einfluss, plus BP/Puls Bonus
  let score = 100;
  if (waist > 0) score += (90 - waist) * 0.8; // waist runter => score rauf
  if (w > 0) score += (80 - w) * 0.15;        // mild

  if (s > 0 && d > 0) {
    // ideal grob 120/80
    score += (120 - s) * 0.25;
    score += (80 - d) * 0.35;
  }

  if (p > 0) score += (65 - p) * 0.25;

  // clamp
  score = Math.max(0, Math.min(200, Math.round(score)));
  return score;
}

export async function renderHealthPanel(container) {
  const rows = (await healthGetAll()).sort((a,b)=> (a.date < b.date ? 1 : -1));

  container.innerHTML = `
    <div class="card">
      <h2>🫀 Health Tracking</h2>
      <p class="hint">Gewicht + Waist + Blutdruck + Puls. Recomp-Index ist ein Motivation-Score.</p>

      <div class="grid2">
        <div class="card">
          <h3>Neuer Health-Eintrag</h3>

          <label>Datum
            <input id="hDate" type="date" value="${isoDate()}">
          </label>

          <div class="row2">
            <div>
              <label>Gewicht (kg)
                <input id="hWeight" inputmode="decimal" placeholder="z.B. 82.4">
              </label>
            </div>
            <div>
              <label>Waist (cm)
                <input id="hWaist" inputmode="decimal" placeholder="z.B. 86">
              </label>
            </div>
          </div>

          <div class="row2">
            <div>
              <label>Blutdruck SYS
                <input id="hSys" inputmode="numeric" placeholder="z.B. 122">
              </label>
            </div>
            <div>
              <label>Blutdruck DIA
                <input id="hDia" inputmode="numeric" placeholder="z.B. 78">
              </label>
            </div>
          </div>

          <label>Puls (bpm)
            <input id="hPulse" inputmode="numeric" placeholder="z.B. 62">
          </label>

          <label>Notiz (optional)
            <input id="hNote" placeholder="z.B. schlecht geschlafen">
          </label>

          <div class="row2">
            <button id="hSave">Speichern</button>
            <button id="hClear" class="secondary">Felder leeren</button>
          </div>

          <div class="divider"></div>
          <div class="pill"><b>Recomp-Index Preview:</b> <span id="hPreview">—</span></div>
        </div>

        <div class="card">
          <h3>Letzte Werte</h3>
          <div id="hLatest" class="hint">—</div>
          <div class="divider"></div>
          <h3>History</h3>
          <ul id="hList" class="list"></ul>
        </div>
      </div>
    </div>
  `;

  function preview(){
    const weightKg = Number(document.getElementById("hWeight")?.value || 0);
    const waistCm  = Number(document.getElementById("hWaist")?.value || 0);
    const sys      = Number(document.getElementById("hSys")?.value || 0);
    const dia      = Number(document.getElementById("hDia")?.value || 0);
    const pulse    = Number(document.getElementById("hPulse")?.value || 0);
    const score = recompIndex({ weightKg, waistCm, sys, dia, pulse });
    document.getElementById("hPreview").textContent = score ? String(score) : "—";
  }

  ["hWeight","hWaist","hSys","hDia","hPulse"].forEach(id=>{
    document.getElementById(id)?.addEventListener("input", preview);
  });

  const latest = rows[0];
  document.getElementById("hLatest").innerHTML = latest
    ? `
      <div><b>${safeText(latest.date)}</b> • Recomp: <b>${latest.recomp}</b></div>
      <div>Gewicht: ${fmt(latest.weightKg)} kg • Waist: ${fmt(latest.waistCm)} cm</div>
      <div>BP: ${fmt(latest.sys)}/${fmt(latest.dia)} • Puls: ${fmt(latest.pulse)} bpm</div>
      <div class="hint">${safeText(latest.note || "")}</div>
    `
    : "Noch keine Health-Einträge.";

  const ul = document.getElementById("hList");
  ul.innerHTML = rows.length ? "" : `<li>—</li>`;
  rows.slice(0, 25).forEach(r=>{
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="entryRow">
        <div>
          <div class="entryTitle">${safeText(r.date)} • Recomp <b>${r.recomp}</b></div>
          <div class="small">W ${fmt(r.weightKg)} kg • Waist ${fmt(r.waistCm)} cm • BP ${fmt(r.sys)}/${fmt(r.dia)} • Puls ${fmt(r.pulse)}</div>
          <div class="hint">${safeText(r.note||"")}</div>
        </div>
        <button class="danger" data-del="${r.id}">Löschen</button>
      </div>
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll("button[data-del]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = Number(btn.getAttribute("data-del"));
      await healthDelete(id);
      // re-render via custom event
      window.dispatchEvent(new Event("iq:refresh"));
    });
  });

  document.getElementById("hClear").onclick = ()=>{
    ["hWeight","hWaist","hSys","hDia","hPulse","hNote"].forEach(id=>{
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    preview();
  };

  document.getElementById("hSave").onclick = async ()=>{
    const date = document.getElementById("hDate")?.value || isoDate();
    const weightKg = Number(document.getElementById("hWeight")?.value || 0);
    const waistCm  = Number(document.getElementById("hWaist")?.value || 0);
    const sys      = Number(document.getElementById("hSys")?.value || 0);
    const dia      = Number(document.getElementById("hDia")?.value || 0);
    const pulse    = Number(document.getElementById("hPulse")?.value || 0);
    const note     = String(document.getElementById("hNote")?.value || "");

    const recomp = recompIndex({ weightKg, waistCm, sys, dia, pulse });

    await healthAdd({ date, weightKg, waistCm, sys, dia, pulse, note, recomp });
    window.dispatchEvent(new Event("iq:refresh"));
  };

  preview();
}
