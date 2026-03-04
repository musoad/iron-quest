(() => {
  "use strict";

  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

  function parseISO(iso){
    // iso: YYYY-MM-DD
    const p = String(iso||"").split("-");
    if(p.length !== 3) return new Date();
    return new Date(Number(p[0]), Number(p[1])-1, Number(p[2]));
  }
  function isoDate(d){
    if(window.Utils && window.Utils.isoDate) return window.Utils.isoDate(d);
    const pad=n=>String(n).padStart(2,"0");
    return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
  }

  function groupByDay(entries){
    const map = {};
    for(let i=0;i<(entries||[]).length;i++){
      const e=entries[i]||{};
      const day = e.date || isoDate(new Date());
      map[day] = (map[day]||0) + Number(e.xp||0);
    }
    return map;
  }

  function lastNDaysSeries(dayMap, n){
    const labels = [];
    const values = [];
    const now = new Date();
    for(let i=n-1;i>=0;i--){
      const d = new Date(now.getTime() - i*86400000);
      const k = isoDate(d);
      labels.push(k.slice(5)); // MM-DD
      values.push(Math.round(dayMap[k]||0));
    }
    return { labels: labels, values: values };
  }

  function drawLine(canvas, labels, values){
    const ctx = canvas.getContext("2d");
    // HiDPI
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 160;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(w*dpr);
    canvas.height = Math.floor(h*dpr);
    ctx.scale(dpr,dpr);

    ctx.clearRect(0,0,w,h);

    const padL=34, padR=12, padT=10, padB=24;
    const iw = w - padL - padR;
    const ih = h - padT - padB;

    const maxV = Math.max(10, ...values);
    const minV = 0;

    // grid
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    for(let i=0;i<=4;i++){
      const y = padT + (ih*(i/4));
      ctx.beginPath();
      ctx.moveTo(padL,y);
      ctx.lineTo(padL+iw,y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // axes labels (y)
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
    for(let i=0;i<=4;i++){
      const v = Math.round(maxV*(1 - i/4));
      const y = padT + (ih*(i/4));
      ctx.fillText(String(v), 6, y+4);
    }

    // line
    ctx.strokeStyle = "rgba(76,255,155,.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i=0;i<values.length;i++){
      const x = padL + (iw*(i/(values.length-1 || 1)));
      const y = padT + ih * (1 - ((values[i]-minV)/(maxV-minV || 1)));
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // points
    ctx.fillStyle = "rgba(76,255,155,.95)";
    for(let i=0;i<values.length;i+=Math.ceil(values.length/10)){
      const x = padL + (iw*(i/(values.length-1 || 1)));
      const y = padT + ih * (1 - ((values[i]-minV)/(maxV-minV || 1)));
      ctx.beginPath();
      ctx.arc(x,y,2.6,0,Math.PI*2);
      ctx.fill();
    }

    // x labels (every ~7)
    ctx.fillStyle = "rgba(255,255,255,.55)";
    const step = Math.max(1, Math.floor(values.length/5));
    for(let i=0;i<labels.length;i+=step){
      const x = padL + (iw*(i/(labels.length-1 || 1)));
      ctx.fillText(labels[i], x-14, padT+ih+18);
    }
  }

  function drawBars(canvas, labels, values){
    const ctx = canvas.getContext("2d");
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 160;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(w*dpr);
    canvas.height = Math.floor(h*dpr);
    ctx.scale(dpr,dpr);

    ctx.clearRect(0,0,w,h);
    const padL=34, padR=12, padT=10, padB=24;
    const iw = w - padL - padR;
    const ih = h - padT - padB;

    const maxV = Math.max(10, ...values);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    for(let i=0;i<=4;i++){
      const y = padT + (ih*(i/4));
      ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(padL+iw,y); ctx.stroke();
    }

    // y labels
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
    for(let i=0;i<=4;i++){
      const v = Math.round(maxV*(1 - i/4));
      const y = padT + (ih*(i/4));
      ctx.fillText(String(v), 6, y+4);
    }

    const n = values.length;
    const bw = iw / (n || 1);
    for(let i=0;i<n;i++){
      const v = values[i]||0;
      const bh = ih * (v/(maxV||1));
      const x = padL + i*bw + bw*0.18;
      const y = padT + ih - bh;
      ctx.fillStyle = "rgba(255,212,106,.75)";
      ctx.fillRect(x, y, bw*0.64, bh);
    }

    // x labels
    ctx.fillStyle = "rgba(255,255,255,.55)";
    const step = Math.max(1, Math.floor(n/5));
    for(let i=0;i<labels.length;i+=step){
      const x = padL + i*bw + bw*0.18;
      ctx.fillText(labels[i], x-6, padT+ih+18);
    }
  }

  function weeklyTotals(entries, weeks){
    // relative to configured start date
    const startISO = (window.IronQuestProgression && window.IronQuestProgression.getStartDate) ? window.IronQuestProgression.getStartDate() : (window.Utils && window.Utils.isoDate ? window.Utils.isoDate(new Date()) : isoDate(new Date()));
    const start = parseISO(startISO);
    const totals = new Array(weeks).fill(0);
    for(let i=0;i<(entries||[]).length;i++){
      const e=entries[i]||{};
      const d=parseISO(e.date||startISO);
      const diffDays = Math.floor((d - start)/86400000);
      const w = diffDays<0 ? 0 : Math.floor(diffDays/7);
      if(w>=0 && w<weeks) totals[w]+=Number(e.xp||0);
    }
    const labels = [];
    for(let i=0;i<weeks;i++) labels.push("W"+(i+1));
    return { labels: labels, values: totals.map(v=>Math.round(v)) };
  }

  function runSeries(runs, n){
    // last n runs: distance km
    const sorted = (runs||[]).slice().sort(function(a,b){ return Number(a.id||0) - Number(b.id||0); });
    const slice = sorted.slice(Math.max(0, sorted.length-n));
    const labels = [];
    const values = [];
    for(let i=0;i<slice.length;i++){
      const r=slice[i]||{};
      labels.push((r.date||"Run").slice(5));
      values.push(Number(r.km||r.distance||0));
    }
    return { labels: labels, values: values };
  }

  function weightSeries(health, n){
    const sorted = (health||[]).slice().sort(function(a,b){ return Number(a.id||0) - Number(b.id||0); });
    const slice = sorted.slice(Math.max(0, sorted.length-n));
    const labels = [];
    const values = [];
    for(let i=0;i<slice.length;i++){
      const h=slice[i]||{};
      labels.push((h.date||"").slice(5));
      values.push(Number(h.weight||0));
    }
    return { labels: labels, values: values };
  }

  async function renderAnalytics(el){
    const entries = window.IronDB ? await window.IronDB.getAllEntries() : [];
    const runs = window.IronDB ? await window.IronDB.getAllRuns() : [];
    const health = window.IronDB ? await window.IronDB.getAllHealth() : [];

    const total = (entries||[]).reduce(function(s,e){ return s+Number((e&&e.xp)||0); }, 0);

    const dayMap = groupByDay(entries);
    const xp30 = lastNDaysSeries(dayMap, 30);
    const wk12 = weeklyTotals(entries, 12);
    const run10 = runSeries(runs, 10);
    const wgt12 = weightSeries(health, 12);

    el.innerHTML = `
      <div class="card">
        <h2>Analytics</h2>
        <div class="row"><div>Total XP</div><div class="pill">${Math.round(total)}</div></div>
      </div>

      <div class="card chartCard">
        <h2>XP (letzte 30 Tage)</h2>
        <canvas id="c_xp30"></canvas>
        <div class="chartLegend">
          <div class="pill">Peak: ${Math.max.apply(null, xp30.values)}</div>
          <div class="pill">Ø: ${Math.round(xp30.values.reduce(function(a,b){ return a+b; },0)/(xp30.values.length||1))}</div>
        </div>
      </div>

      <div class="card chartCard">
        <h2>Weekly XP (W1–W12)</h2>
        <canvas id="c_wk12"></canvas>
      </div>

      <div class="card chartCard">
        <h2>Runs (letzte 10)</h2>
        <canvas id="c_run10"></canvas>
      </div>

      <div class="card chartCard">
        <h2>Gewicht (letzte 12)</h2>
        <canvas id="c_wgt12"></canvas>
      </div>
    `;

    // draw after DOM update
    setTimeout(function(){
      const c1=document.getElementById("c_xp30");
      const c2=document.getElementById("c_wk12");
      const c3=document.getElementById("c_run10");
      const c4=document.getElementById("c_wgt12");
      if(c1) drawLine(c1, xp30.labels, xp30.values);
      if(c2) drawBars(c2, wk12.labels, wk12.values);
      if(c3) drawLine(c3, run10.labels, run10.values.map(function(v){ return Math.round(v*10)/10; }));
      if(c4) drawLine(c4, wgt12.labels, wgt12.values.map(function(v){ return Math.round(v*10)/10; }));
    }, 40);
  }

  window.IronQuestAnalytics = { renderAnalytics: renderAnalytics };
})();
