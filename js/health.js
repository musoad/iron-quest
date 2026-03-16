(() => {
  "use strict";
  function drawLine(canvas, ys){
    if(!canvas) return;
    const ctx=canvas.getContext("2d");
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);
    if(!ys.length) return;
    const pad=30;
    const minY=Math.min(...ys), maxY=Math.max(...ys);
    const stepX=(W-pad*2)/Math.max(1,ys.length-1);
    const scaleY=(v)=>{
      if(maxY===minY) return H/2;
      const t=(v-minY)/(maxY-minY);
      return pad + (H-pad*2)*(1-t);
    };
    ctx.globalAlpha=.35;
    ctx.fillRect(pad,H-pad,W-pad*2,2);
    ctx.globalAlpha=1;
    ctx.beginPath();
    ys.forEach((v,i)=>{
      const x=pad+i*stepX;
      const y=scaleY(v);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }
  function weeklyLast(rows, field){
    const byWeek={};
    rows.forEach(r=>{
      const w=window.IronQuestProgression.getWeekNumberFor(r.date);
      if(!byWeek[w] || byWeek[w].date < r.date) byWeek[w]=r;
    });
    const weeks=Object.keys(byWeek).map(Number).sort((a,b)=>a-b).slice(-8);
    return weeks.map(w=>Number(byWeek[w][field]||0)).filter(v=>v>0);
  }
  async function render(container){
    const rows=await window.IronDB.getAllHealth();
    rows.sort((a,b)=> (a.date<b.date?1:-1));
    const today=window.Utils.isoDate(new Date());
    const latest = rows[0] || null;
    container.innerHTML=`
      <div class="card">
        <h2>Health</h2>
        <p class="hint">Health-Daten bleiben aktiv. Nutze sie für Gewicht, Taille, Blutdruck und Puls im Verlauf.</p>
        ${latest ? `<div class="hq-mini reviewGrid" style="margin-top:10px;"><div class="hq-miniCard"><div class="hq-miniT">Gewicht</div><div class="hq-miniV">${Number(latest.weight||0).toFixed(1)} kg</div><div class="hq-miniS">${latest.date}</div></div><div class="hq-miniCard"><div class="hq-miniT">Taille</div><div class="hq-miniV">${Number(latest.waist||0).toFixed(1)} cm</div><div class="hq-miniS">${latest.date}</div></div><div class="hq-miniCard"><div class="hq-miniT">Puls</div><div class="hq-miniV">${latest.pulse||'—'}</div><div class="hq-miniS">Ruhepuls</div></div><div class="hq-miniCard"><div class="hq-miniT">Blutdruck</div><div class="hq-miniV">${latest.sys||'—'}/${latest.dia||'—'}</div><div class="hq-miniS">SYS / DIA</div></div></div>` : ''}
      </div>

      <div class="card">
        <h2>Neuer Eintrag</h2>
        <label>Datum</label>
        <input id="hDate" type="date" value="${today}">
        <div class="row2">
          <div><label>SYS</label><input id="hSys" type="number" placeholder="120"></div>
          <div><label>DIA</label><input id="hDia" type="number" placeholder="80"></div>
        </div>
        <label>Puls</label>
        <input id="hPulse" type="number" placeholder="60">
        <div class="row2">
          <div><label>Gewicht (kg)</label><input id="hWeight" type="number" step="0.1" placeholder="83.5"></div>
          <div><label>Taille (cm)</label><input id="hWaist" type="number" step="0.1" placeholder="88"></div>
        </div>
        <button class="primary" id="hSave">Speichern</button>
      </div>

      <div class="card soft">
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
      </div>

      <div class="card">
        <h2>Historie</h2>
        <ul class="list" id="hList"></ul>
      </div>
    `;
    container.querySelector("#hSave").onclick=async()=>{
      const h={
        date: container.querySelector("#hDate").value || today,
        sys: Number(container.querySelector("#hSys").value||0),
        dia: Number(container.querySelector("#hDia").value||0),
        pulse: Number(container.querySelector("#hPulse").value||0),
        weight: Number(container.querySelector("#hWeight").value||0),
        waist: Number(container.querySelector("#hWaist").value||0),
      };
      await window.IronDB.addHealth(h);
      (window.Toast && window.Toast.toast)("Health saved", h.date);
      await render(container);
    };

    const metric=container.querySelector("#hMetric");
    const redraw=()=>{
      const ys=weeklyLast([...rows].reverse(), metric.value);
      drawLine(container.querySelector("#hChart"), ys);
    };
    metric.onchange=redraw;
    redraw();

    const ul=container.querySelector("#hList");
    ul.innerHTML="";
    if(!rows.length) ul.innerHTML="<li>—</li>";
    else{
      rows.slice(0,60).forEach(r=>{
        const li=document.createElement("li");
        li.innerHTML=`
          <div class="itemTop">
            <div>
              <b>${r.date}</b>
              <div class="hint">BP ${r.sys||"—"}/${r.dia||"—"} • Puls ${r.pulse||"—"} • Gewicht ${r.weight||"—"}kg • Taille ${r.waist||"—"}cm</div>
            </div>
          </div>
        `;
        ul.appendChild(li);
      });
    }
  }
  window.IronQuestHealth={ render };
})();
