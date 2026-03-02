(() => {
  "use strict";

  function drawBars(canvas, labels, values){
    if(!canvas) return;
    const ctx=canvas.getContext("2d");
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);

    const pad=28;
    const innerW=W-pad*2;
    const innerH=H-pad*2;
    const maxV=Math.max(1,...values);
    const n=Math.max(1,values.length);
    const gap=10;
    const bw=Math.max(8,Math.floor((innerW-gap*(n-1))/n));

    ctx.globalAlpha=.35;
    ctx.fillRect(pad,H-pad,innerW,2);
    ctx.globalAlpha=1;

    for(let i=0;i<values.length;i++){
      const v=Number(values[i]||0);
      const h=Math.round((v/maxV)*(innerH-20));
      const x=pad+i*(bw+gap);
      const y=pad+(innerH-h);
      ctx.fillRect(x,y,bw,h);
      ctx.globalAlpha=.85;
      ctx.font="16px system-ui";
      ctx.fillText(labels[i]||"",x,H-8);
      ctx.globalAlpha=1;
    }
  }

  async function render(container){
    const entries=await window.IronDB.getAllEntries();
    const totalXp=entries.reduce((s,e)=>s+Number(e.xp||0),0);
    const L=window.IronQuestProgression.levelFromTotalXp(totalXp);
    const rank=window.IronQuestHunterRank.compute(L.lvl, totalXp);
    const summary=window.IronQuestCoach.weeklySummary(entries);

    // weekly xp last 8 weeks
    const map={};
    for(const e of entries){
      const w=Number(e.week||0);
      if(!w) continue;
      map[w]=(map[w]||0)+Number(e.xp||0);
    }
    const cur=window.IronQuestProgression.getWeekNumber();
    const weeks=[];
    for(let w=Math.max(1,cur-7); w<=cur; w++) weeks.push(w);
    const vals=weeks.map(w=>map[w]||0);
    const labels=weeks.map(w=>"W"+w);

    container.innerHTML=`
      <div class="card">
        <h2>Weekly Review</h2>
        <p class="hint">Smart Fitness RPG: Balance, Fatigue, Recommendations.</p>
        <div class="row2">
          <div class="pill"><b>Rank:</b> ${rank}</div>
          <div class="pill"><b>Lv:</b> ${L.lvl} (${L.title})</div>
        </div>
      </div>

      <div class="card soft">
        <h2>Wochen-XP Trend</h2>
        <canvas id="wChart" width="900" height="260"></canvas>
      </div>

      <div class="card soft">
        <h2>Coach Report (W${summary.week})</h2>
        <div class="systemBox">
          <div class="sysTitle">[ ANALYSIS ]</div>
          <div class="sysBody" id="coachBody"></div>
        </div>
      </div>
    `;

    drawBars(container.querySelector("#wChart"), labels, vals);

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
    lines.push("- Hit 2 Core sessions if Core is low.");
    lines.push("- Keep streak alive for bonus XP.");
    container.querySelector("#coachBody").textContent = lines.join("\n");
  }

  window.IronQuestReview={ render };
})();
