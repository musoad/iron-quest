(() => {
  "use strict";

  function drawBars(canvas, labels, values){
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    const pad=28, gap=10;
    const innerW=W-pad*2, innerH=H-pad*2;
    const maxV=Math.max(1,...values);
    const bw=Math.max(18,Math.floor((innerW-gap*(values.length-1))/Math.max(1,values.length)));
    ctx.globalAlpha=.25; ctx.fillRect(pad,H-pad,innerW,2); ctx.globalAlpha=1;
    values.forEach((raw,i)=>{ const v=Number(raw||0); const h=Math.round((v/maxV)*(innerH-22)); const x=pad+i*(bw+gap); const y=pad+(innerH-h); ctx.fillRect(x,y,bw,h); ctx.globalAlpha=.85; ctx.font='14px system-ui'; ctx.fillText(labels[i]||'',x,H-8); ctx.globalAlpha=1; });
  }
  function weekStart(d){ const x=new Date(d+"T00:00:00"); const day=x.getDay()||7; x.setDate(x.getDate()-(day-1)); return x; }
  function iso(d){ return window.Utils?.isoDate?.(d) || new Date(d).toISOString().slice(0,10); }

  async function render(container){
    const entries = await window.IronDB.getAllEntries();
    const runs = await window.IronDB.getAllRuns();
    const health = await window.IronDB.getAllHealth();
    const snap = await window.IronQuestState.getSnapshot();
    const today = iso(new Date());
    const start = weekStart(today); const startKey=iso(start); const endKey=iso(new Date(start.getTime()+6*86400000));
    const weekEntries = entries.filter(e=>{ const d=String(e.date||'').slice(0,10); return d>=startKey && d<=endKey; });
    const weekRuns = runs.filter(r=>{ const d=String(r.date||'').slice(0,10); return d>=startKey && d<=endKey; });
    const weekKm = weekRuns.reduce((s,r)=> s + Number(r.km||0), 0);
    const weekMin = weekRuns.reduce((s,r)=> s + Number(r.minutes||0), 0);
    const byExercise = {}; weekEntries.forEach(e=>{ const key=String(e.exercise||e.type||'Unknown'); byExercise[key]=(byExercise[key]||0)+Number(e.xp||0); });
    const bestExercise = Object.entries(byExercise).sort((a,b)=>b[1]-a[1])[0] || ['—',0];
    const byWeek={}; entries.forEach(e=>{ const w=Number(e.week||0); if(w) byWeek[w]=(byWeek[w]||0)+Number(e.xp||0); });
    const cur = window.IronQuestProgression.getWeekNumber(); const weeks=[]; for(let w=Math.max(1,cur-7); w<=cur; w++) weeks.push(w);
    const lastHealth = (health||[]).slice().sort((a,b)=> String(b.date||'').localeCompare(String(a.date||'')))[0] || null;

    container.innerHTML = `
      <div class="card iqPanel">
        <div class="slHeader"><div><div class="slEyebrow">Weekly Report</div><h2>Trainingsauswertung</h2></div><div class="pill">Woche ${cur}</div></div>
        <div class="hq-mini reviewGrid">
          <div class="hq-miniCard"><div class="hq-miniT">Level</div><div class="hq-miniV">${snap.progression.level}</div><div class="hq-miniS">Rank ${snap.rank}</div></div>
          <div class="hq-miniCard"><div class="hq-miniT">Week XP</div><div class="hq-miniV">${Math.round(snap.totals.weekXp)}</div><div class="hq-miniS">Goal ${snap.week.xpGoal}</div></div>
          <div class="hq-miniCard"><div class="hq-miniT">Trainingstage</div><div class="hq-miniV">${snap.week.daysLogged}/${snap.week.workoutGoal}</div><div class="hq-miniS">Kraft + Läufe</div></div>
          <div class="hq-miniCard"><div class="hq-miniT">Beste Übung</div><div class="hq-miniV">${bestExercise[0]}</div><div class="hq-miniS">+${Math.round(bestExercise[1])} XP</div></div>
        </div>
      </div>
      <div class="grid-2">
        <div class="card soft"><h2>Laufstatistik</h2><div class="hq-mini reviewGrid"><div class="hq-miniCard"><div class="hq-miniT">Runs</div><div class="hq-miniV">${weekRuns.length}</div><div class="hq-miniS">diese Woche</div></div><div class="hq-miniCard"><div class="hq-miniT">Kilometer</div><div class="hq-miniV">${weekKm.toFixed(1)}</div><div class="hq-miniS">gesamt</div></div><div class="hq-miniCard"><div class="hq-miniT">Minuten</div><div class="hq-miniV">${Math.round(weekMin)}</div><div class="hq-miniS">gesamte Laufzeit</div></div><div class="hq-miniCard"><div class="hq-miniT">Pace-Fokus</div><div class="hq-miniV">Zone 2 + 4×4</div><div class="hq-miniS">Interferenz gering halten</div></div></div></div>
        <div class="card soft"><h2>Health Snapshot</h2>${lastHealth ? `<div class="hq-mini reviewGrid"><div class="hq-miniCard"><div class="hq-miniT">Gewicht</div><div class="hq-miniV">${Number(lastHealth.weight||0).toFixed(1)} kg</div><div class="hq-miniS">letzter Eintrag</div></div><div class="hq-miniCard"><div class="hq-miniT">Taille</div><div class="hq-miniV">${Number(lastHealth.waist||0).toFixed(1)} cm</div><div class="hq-miniS">letzter Eintrag</div></div><div class="hq-miniCard"><div class="hq-miniT">Puls</div><div class="hq-miniV">${Math.round(Number(lastHealth.pulse||0)) || '—'}</div><div class="hq-miniS">Ruhepuls</div></div><div class="hq-miniCard"><div class="hq-miniT">Blutdruck</div><div class="hq-miniV">${lastHealth.sys||'—'}/${lastHealth.dia||'—'}</div><div class="hq-miniS">SYS / DIA</div></div></div>` : `<div class="hint">Noch keine Health-Daten gespeichert.</div>`}</div>
      </div>
      <div class="card soft"><h2>Coach Summary</h2><div class="systemBox"><div class="sysTitle">[ PLAN HINWEIS ]</div><div class="sysBody">4 Krafttage + 2 Lauftage bleiben das Ziel.
Montag Intervall + Unterkörper A, Mittwoch Zone 2, Samstag optional locker oder Mobility.
Wenn du im oberen Wiederholungsbereich bist: Gewicht erhöhen, Wiederholungen steigern oder Exzentrik verlangsamen.</div></div></div>
      <div class="card soft"><h2>Weekly XP Trend</h2><canvas id="wChart" width="900" height="260"></canvas></div>
    `;
    drawBars(container.querySelector('#wChart'), weeks.map(w=>'W'+w), weeks.map(w=>byWeek[w]||0));
  }

  window.IronQuestReview = { render };
})();
