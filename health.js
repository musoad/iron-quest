// health.js
import { $, loadJSON, saveJSON, isoDate, safeText } from "./utils.js";

const KEY_VITALS = "iq_vitals_v3";

function loadVitals(){ return loadJSON(KEY_VITALS, []); }
function saveVitals(list){ saveJSON(KEY_VITALS, list); }

export function ensureHealthPanel(){
  const nav = document.querySelector("nav.tabs");
  const main = document.querySelector("main");
  if (!nav || !main) return;

  if (!document.querySelector('.tab[data-tab="health"]')) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab";
    btn.setAttribute("data-tab", "health");
    btn.textContent = "Health";
    const exportBtn = nav.querySelector('.tab[data-tab="export"]');
    if (exportBtn) nav.insertBefore(btn, exportBtn);
    else nav.appendChild(btn);
  }

  if (!document.getElementById("tab-health")) {
    const sec = document.createElement("section");
    sec.id = "tab-health";
    sec.className = "panel";
    sec.innerHTML = `
      <div class="card">
        <h2>Health Tracking</h2>
        <p class="hint">Gewicht + Waist + Blutdruck + Puls → Recomposition Index (Trend).</p>

        <div class="grid2">
          <label>Datum
            <input id="vDate" type="date">
          </label>

          <label>Gewicht (kg)
            <input id="vWeight" type="number" step="0.1" inputmode="decimal" placeholder="z.B. 84.2">
          </label>

          <label>Waist (cm)
            <input id="vWaist" type="number" step="0.1" inputmode="decimal" placeholder="z.B. 88.0">
          </label>

          <label>Blutdruck (SYS/DIA)
            <div class="row2">
              <input id="vSys" type="number" step="1" inputmode="numeric" placeholder="SYS">
              <input id="vDia" type="number" step="1" inputmode="numeric" placeholder="DIA">
            </div>
          </label>

          <label>Puls (bpm)
            <input id="vPulse" type="number" step="1" inputmode="numeric" placeholder="z.B. 62">
          </label>

          <label>Notiz
            <input id="vNote" type="text" placeholder="optional">
          </label>
        </div>

        <div class="row2">
          <button id="vSave" type="button">Speichern</button>
          <button id="vClear" type="button" class="secondary">Reset Felder</button>
        </div>

        <div class="divider"></div>

        <div class="row2">
          <div class="pill"><b>Recomp Index (7d Trend):</b> <span id="recompIdx">—</span></div>
          <div class="pill"><b>Letzter Eintrag:</b> <span id="vLast">—</span></div>
        </div>

        <canvas id="vChart" width="900" height="240" style="width:100%; height:auto; border-radius:12px;"></canvas>
        <p class="hint">Chart: Gewicht & Waist (vereinfachter Trend).</p>

        <div class="divider"></div>
        <h2>Letzte Einträge</h2>
        <ul id="vList" class="skilllist"></ul>
        <button id="vExport" type="button" class="secondary">Vitals Export (JSON)</button>
        <button id="vResetAll" type="button" class="danger">Vitals löschen</button>
      </div>
    `;
    main.appendChild(sec);

    $("#vDate").value = isoDate(new Date());

    $("#vSave")?.addEventListener("click", () => {
      const list = loadVitals();
      const entry = {
        date: $("#vDate")?.value || isoDate(new Date()),
        weight: Number($("#vWeight")?.value || 0) || null,
        waist: Number($("#vWaist")?.value || 0) || null,
        sys: Number($("#vSys")?.value || 0) || null,
        dia: Number($("#vDia")?.value || 0) || null,
        pulse: Number($("#vPulse")?.value || 0) || null,
        note: ($("#vNote")?.value || "").trim()
      };
      list.push(entry);
      list.sort((a,b)=> a.date < b.date ? 1 : -1);
      saveVitals(list);
      renderHealth();
      document.dispatchEvent(new CustomEvent("iq:rerender"));
      alert("Vitals gespeichert ✅");
    });

    $("#vClear")?.addEventListener("click", () => {
      ["vWeight","vWaist","vSys","vDia","vPulse","vNote"].forEach(id => { const el=$(id); if(el) el.value=""; });
    });

    $("#vResetAll")?.addEventListener("click", () => {
      if (!confirm("Wirklich alle Vitals löschen?")) return;
      localStorage.removeItem(KEY_VITALS);
      renderHealth();
    });

    $("#vExport")?.addEventListener("click", () => {
      const data = JSON.stringify(loadVitals(), null, 2);
      const blob = new Blob([data], { type:"application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ironquest_vitals.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
    });
  }
}

function recompositionIndex(list){
  // Simple: wenn Waist ↓ und Gewicht ↔/↓ => positiv
  const last7 = list.slice(0, 7).reverse();
  if (last7.length < 2) return null;

  const w0 = last7[0];
  const w1 = last7[last7.length-1];

  const dWaist = (w1.waist ?? w0.waist) - (w0.waist ?? w1.waist);
  const dWeight = (w1.weight ?? w0.weight) - (w0.weight ?? w1.weight);

  // normalize rough
  const score = (-dWaist * 2) + (-dWeight * 1);
  return Math.round(score * 10) / 10;
}

function drawVitalsChart(canvas, list){
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const data = list.slice(0, 14).reverse(); // oldest -> newest
  if (data.length < 2) {
    ctx.globalAlpha = 0.7;
    ctx.font = "24px system-ui";
    ctx.fillText("Noch zu wenige Daten.", 24, 60);
    ctx.globalAlpha = 1;
    return;
  }

  const pad = 24;
  const innerW = W - pad*2;
  const innerH = H - pad*2;

  const weights = data.map(x=>x.weight).filter(v=>typeof v==="number" && v>0);
  const waists  = data.map(x=>x.waist).filter(v=>typeof v==="number" && v>0);

  const minV = Math.min(...weights, ...waists);
  const maxV = Math.max(...weights, ...waists);
  const range = Math.max(1, maxV - minV);

  function pt(i, val){
    const x = pad + (i/(data.length-1))*innerW;
    const y = pad + innerH - ((val-minV)/range)*innerH;
    return {x,y};
  }

  function drawLine(values){
    ctx.beginPath();
    values.forEach((v,i)=>{
      if (!(typeof v==="number" && v>0)) return;
      const p = pt(i, v);
      if (i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    });
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // weight line (default color)
  drawLine(data.map(x=>x.weight));
  // waist line: dashed
  ctx.setLineDash([8,6]);
  drawLine(data.map(x=>x.waist));
  ctx.setLineDash([]);

  ctx.globalAlpha = 0.7;
  ctx.font = "20px system-ui";
  ctx.fillText("Linie: Gewicht | gestrichelt: Waist", 24, H-12);
  ctx.globalAlpha = 1;
}

export function renderHealth(){
  ensureHealthPanel();
  const list = loadVitals();

  const last = list[0];
  if ($("#vLast")) {
    $("#vLast").textContent = last ? `${last.date} • ${last.weight??"—"}kg • ${last.waist??"—"}cm • BP ${last.sys??"—"}/${last.dia??"—"} • Puls ${last.pulse??"—"}` : "—";
  }

  const idx = recompositionIndex(list);
  if ($("#recompIdx")) $("#recompIdx").textContent = (idx == null) ? "—" : String(idx);

  const ul = $("#vList");
  if (ul){
    ul.innerHTML = list.length ? "" : "<li>—</li>";
    list.slice(0, 10).forEach(v=>{
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="entryRow">
          <div style="min-width:0;">
            <div><b>${safeText(v.date)}</b> • Gewicht: ${v.weight??"—"}kg • Waist: ${v.waist??"—"}cm</div>
            <div class="hint">BP: ${v.sys??"—"}/${v.dia??"—"} • Puls: ${v.pulse??"—"} • ${safeText(v.note||"")}</div>
          </div>
          <span class="badge">HP</span>
        </div>
      `;
      ul.appendChild(li);
    });
  }

  drawVitalsChart($("#vChart"), list);
}
