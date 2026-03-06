(() => {
  "use strict";

  function drawBars(canvas, labels, values){
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    const pad=28, gap=10;
    const innerW=W-pad*2, innerH=H-pad*2;
    const maxV=Math.max(1,...values);
    const bw=Math.max(18,Math.floor((innerW-gap*(values.length-1))/Math.max(1,values.length)));
    ctx.globalAlpha=.25;
    ctx.fillRect(pad,H-pad,innerW,2);
    ctx.globalAlpha=1;
    values.forEach((raw,i)=>{
      const v=Number(raw||0);
      const h=Math.round((v/maxV)*(innerH-22));
      const x=pad+i*(bw+gap);
      const y=pad+(innerH-h);
      ctx.fillRect(x,y,bw,h);
      ctx.globalAlpha=.85;
      ctx.font="14px system-ui";
      ctx.fillText(labels[i]||"",x,H-8);
      ctx.globalAlpha=1;
    });
  }

  function weekStart(d){
    const x=new Date(d+"T00:00:00");
    const day=x.getDay()||7;
    x.setDate(x.getDate()-(day-1));
    return x;
  }
  function iso(d){ return window.Utils?.isoDate?.(d) || new Date(d).toISOString().slice(0,10); }

  async function render(container){
    const entries = await window.IronDB.getAllEntries();
    const runs = await window.IronDB.getAllRuns();
    const snap = await window.IronQuestState.getSnapshot();
    const summary = window.IronQuestCoach.weeklySummary(entries);
    const cls = window.IronQuestClasses?.meta?.(window.IronQuestClasses.get?.()) || { name:"Unassigned", perks:[] };

    const today = iso(new Date());
    const start = weekStart(today);
    const startKey = iso(start);
    const end = new Date(start.getTime() + 6*86400000);
    const endKey = iso(end);

    const weekEntries = entries.filter(e => {
      const d = String(e.date||"").slice(0,10);
      return d >= startKey && d <= endKey;
    });
    const weekRuns = runs.filter(r => {
      const d = String(r.date||"").slice(0,10);
      return d >= startKey && d <= endKey;
    });

    const byExercise = {};
    weekEntries.forEach(e=>{
      const key = String(e.exercise||e.type||"Unknown");
      byExercise[key] = (byExercise[key]||0) + Number(e.xp||0);
    });
    const bestExercise = Object.entries(byExercise).sort((a,b)=>b[1]-a[1])[0] || ["—",0];

    const byWeek = {};
    entries.forEach(e=>{
      const w = Number(e.week||0);
      if(!w) return;
      byWeek[w] = (byWeek[w]||0) + Number(e.xp||0);
    });
    const cur = window.IronQuestProgression.getWeekNumber();
    const weeks=[]; for(let w=Math.max(1,cur-7); w<=cur; w++) weeks.push(w);

    const reportLines = [
      `Workouts: ${snap.week.daysLogged} training days`,
      `Runs: ${weekRuns.length}`,
      `XP gained: ${Math.round(snap.totals.weekXp)}`,
      `Best exercise: ${bestExercise[0]} (+${Math.round(bestExercise[1])} XP)`,
      `Consistency: ${snap.streak} day streak`,
      `Class: ${cls.name}`
    ];

    container.innerHTML = `
      <div class="card iqPanel">
        <div class="slHeader">
          <div>
            <div class="slEyebrow">Weekly Hunter Report</div>
            <h2>Progress Review</h2>
          </div>
          <div class="pill">Week ${summary.week}</div>
        </div>
        <div class="hq-mini reviewGrid">
          <div class="hq-miniCard"><div class="hq-miniT">Hunter</div><div class="hq-miniV">Lv ${snap.progression.level} • Rank ${snap.rank}</div><div class="hq-miniS">${cls.name}</div></div>
          <div class="hq-miniCard"><div class="hq-miniT">Week XP</div><div class="hq-miniV">${Math.round(snap.totals.weekXp)}</div><div class="hq-miniS">Goal ${snap.week.xpGoal}</div></div>
          <div class="hq-miniCard"><div class="hq-miniT">Training Days</div><div class="hq-miniV">${snap.week.daysLogged}/${snap.week.workoutGoal}</div><div class="hq-miniS">Runs ${weekRuns.length}</div></div>
          <div class="hq-miniCard"><div class="hq-miniT">Best Exercise</div><div class="hq-miniV">${bestExercise[0]}</div><div class="hq-miniS">+${Math.round(bestExercise[1])} XP</div></div>
        </div>
      </div>

      <div class="card soft">
        <h2>Hunter Report</h2>
        <div class="systemBox">
          <div class="sysTitle">[ WEEKLY HUNTER REPORT ]</div>
          <div class="sysBody">${reportLines.join("\n")}</div>
        </div>
      </div>

      <div class="card soft">
        <h2>Weekly XP Trend</h2>
        <canvas id="wChart" width="900" height="260"></canvas>
      </div>

      <div class="card soft">
        <h2>Coach Report</h2>
        <div class="systemBox">
          <div class="sysTitle">[ ANALYSIS ]</div>
          <div class="sysBody" id="coachBody"></div>
        </div>
      </div>
    `;

    drawBars(container.querySelector("#wChart"), weeks.map(w=>"W"+w), weeks.map(w=>byWeek[w]||0));

    const lines=[];
    lines.push(`Week XP: ${summary.weekXp} • Days: ${summary.days} • ⭐⭐⭐ Days: ${summary.threeStar}`);
    lines.push("");
    lines.push("Balance:");
    if(summary.imbalance.length) summary.imbalance.forEach(x=>lines.push("- "+x));
    else lines.push("- Balanced week.");
    lines.push("");
    lines.push("Recovery:");
    lines.push("- "+summary.fatigue);
    lines.push("");
    lines.push("Next actions:");
    lines.push(`- Weekly goal progress: ${Math.round(snap.week.workoutPct*100)}%`);
    lines.push(`- XP goal progress: ${Math.round(snap.week.xpPct*100)}%`);
    lines.push(`- Keep ${cls.name} perks active by staying consistent.`);
    container.querySelector("#coachBody").textContent = lines.join("\n");
  }

  window.IronQuestReview = { render };
})();
