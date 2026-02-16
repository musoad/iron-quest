(() => {
  "use strict";

  function drawLine(canvas, points){
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);

    if (!points.length) return;

    const pad=30;
    const xs = points.map(p=>p.x);
    const ys = points.map(p=>p.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const scaleY = (v)=>{
      if (maxY === minY) return H/2;
      const t = (v - minY) / (maxY - minY);
      return pad + (H - pad*2) * (1 - t);
    };

    const stepX = (W - pad*2) / Math.max(1, points.length-1);

    ctx.globalAlpha = 0.35;
    ctx.fillRect(pad, H-pad, W-pad*2, 2);
    ctx.globalAlpha = 1;

    ctx.beginPath();
    points.forEach((p,i)=>{
      const x = pad + i*stepX;
      const y = scaleY(p.y);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();

    // dots
    points.forEach((p,i)=>{
      const x = pad + i*stepX;
      const y = scaleY(p.y);
      ctx.beginPath();
      ctx.arc(x,y,3.5,0,Math.PI*2);
      ctx.fill();
    });
  }

  function getWeekKey(dateIso){
    const w = window.IronQuestProgression.getWeekNumberFor(dateIso);
    return w;
  }

  function weeklyAgg(rows, field){
    // pro Woche: letztes Messdatum in der Woche
    const byWeek = {};
    rows.forEach(r=>{
      const w = getWeekKey(r.date);
      if (!byWeek[w] || byWeek[w].date < r.date) byWeek[w] = r;
    });

    const weeks = Object.keys(byWeek).map(Number).sort((a,b)=>a-b);
    const points = weeks.slice(-8).map(w=>({ x:w, y:Number(byWeek[w][field]||0), label:`W${w}` }));
    return points;
  }

  async function renderHealth(el){
    const rows = await window.DB.getAll("health");
    rows.sort((a,b)=> (a.date<b.date ? 1 : -1));

    const today = window.Utils.isoDate(new Date());

    el.innerHTML = `
      <div class="card">
        <h2>Health</h2>
        <p class="hint">Blutdruck, Puls, Gewicht usw. – alles lokal.</p>

        <div class="card">
          <h2>Neuer Eintrag</h2>
          <label>Datum</label>
          <input id="hDate" type="date" value="${today}">

          <div class="row2">
            <div>
              <label>SYS</label>
              <input id="hSys" type="number" placeholder="120">
            </div>
            <div>
              <label>DIA</label>
              <input id="hDia" type="number" placeholder="80">
            </div>
          </div>

          <label>Puls</label>
          <input id="hPulse" type="number" placeholder="60">

          <div class="row2">
            <div>
              <label>Gewicht (kg)</label>
              <input id="hWeight" type="number" step="0.1" placeholder="83.5">
            </div>
            <div>
              <label>Taille (cm)</label>
              <input id="hWaist" type="number" step="0.1" placeholder="88">
            </div>
          </div>

          <label>Hüfte (cm) optional</label>
          <input id="hHip" type="number" step="0.1" placeholder="100">

          <button class="primary" id="hSave">Speichern</button>
        </div>

        <div class="card">
          <h2>Wochenvergleich</h2>
          <label>Metric</label>
          <select id="hMetric">
            <option value="weight">Gewicht</option>
            <option value="waist">Taille</option>
            <option value="pulse">Puls</option>
            <option value="sys">SYS</option>
            <option value="dia">DIA</option>
          </select>
          <canvas id="hChart" width="900" height="240"></canvas>
          <div class="hint">Zeigt pro Woche den letzten Messwert (letzte 8 Wochen).</div>
        </div>

        <div class="card">
          <h2>Historie</h2>
          <ul class="list" id="hList"></ul>
        </div>
      </div>
    `;

    el.querySelector("#hSave").addEventListener("click", async ()=>{
      const date = el.querySelector("#hDate").value || today;
      const sys = Number(el.querySelector("#hSys").value || 0);
      const dia = Number(el.querySelector("#hDia").value || 0);
      const pulse = Number(el.querySelector("#hPulse").value || 0);
      const weight = Number(el.querySelector("#hWeight").value || 0);
      const waist = Number(el.querySelector("#hWaist").value || 0);
      const hip = Number(el.querySelector("#hHip").value || 0);

      await window.DB.add("health", { date, sys, dia, pulse, weight, waist, hip });
      await renderHealth(el);
    });

    function redraw(){
      const metric = el.querySelector("#hMetric").value;
      const points = weeklyAgg([...rows].reverse(), metric).filter(p=>p.y>0);
      drawLine(el.querySelector("#hChart"), points);
    }

    el.querySelector("#hMetric").addEventListener("change", redraw);
    redraw();

    const ul = el.querySelector("#hList");
    if (!rows.length) ul.innerHTML = `<li>—</li>`;
    else {
      ul.innerHTML = "";
      rows.slice(0, 60).forEach(r=>{
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="itemTop">
            <div>
              <b>${r.date}</b>
              <div class="hint">
                BP ${r.sys||"—"}/${r.dia||"—"} • Puls ${r.pulse||"—"} • Gewicht ${r.weight||"—"}kg • Taille ${r.waist||"—"}cm
              </div>
            </div>
          </div>
        `;
        ul.appendChild(li);
      });
    }
  }

  window.IronQuestHealth = { renderHealth };
})();
