(() => {
  "use strict";

  function pace(minutes, km){
    const m=Math.max(0,Number(minutes||0));
    const d=Math.max(0,Number(km||0));
    if (d<=0) return null;
    const p=m/d;
    const mm=Math.floor(p);
    const ss=Math.round((p-mm)*60);
    return `${mm}:${String(ss).padStart(2,"0")} min/km`;
  }

  async function renderRunning(el){
    const today = window.Utils.isoDate(new Date());
    const runs = await window.DB.getAll("runs");
    runs.sort((a,b)=> (a.date<b.date?1:-1));

    el.innerHTML = `
      <div class="card">
        <h2>Run</h2>
        <p class="hint">Distanz + Zeit → Pace + XP. (Wird auch ins Log geschrieben.)</p>

        <div class="card">
          <h2>Neuer Lauf</h2>
          <label>Datum</label>
          <input id="rDate" type="date" value="${today}">
          <div class="row2">
            <div>
              <label>Distanz (km)</label>
              <input id="rKm" type="number" step="0.01" placeholder="z. B. 5">
            </div>
            <div>
              <label>Zeit (min)</label>
              <input id="rMin" type="number" step="1" placeholder="z. B. 30">
            </div>
          </div>
          <div class="row2">
            <div class="pill" id="rPace"><b>Pace:</b> —</div>
            <div class="pill" id="rXp"><b>XP:</b> —</div>
          </div>
          <button class="primary" id="rSave">Speichern</button>
        </div>

        <div class="card">
          <h2>Letzte Läufe</h2>
          <ul class="list" id="rList"></ul>
        </div>
      </div>
    `;

    const kmEl=el.querySelector("#rKm");
    const minEl=el.querySelector("#rMin");
    const paceEl=el.querySelector("#rPace");
    const xpEl=el.querySelector("#rXp");

    function recalc(){
      const km=Number(kmEl.value||0);
      const minutes=Number(minEl.value||0);
      const p=pace(minutes,km);
      const xp=window.IronQuestXP.jogXP(km,minutes);
      paceEl.innerHTML=`<b>Pace:</b> ${p||"—"}`;
      xpEl.innerHTML=`<b>XP:</b> ${xp||"—"}`;
      return {km,minutes,xp,p};
    }

    kmEl.oninput=recalc;
    minEl.oninput=recalc;

    el.querySelector("#rSave").onclick = async ()=>{
      const {km,minutes,xp,p} = recalc();
      if (km<=0 || minutes<=0) return;
      const date = el.querySelector("#rDate").value || today;

      const runId = await window.DB.add("runs",{date,km,minutes,xp});

      const week = window.IronQuestProgression.getWeekNumberFor(date);
      await window.IronDB.addEntry({
        date, week,
        // Use Conditioning so Attributes/Stats connect logically to endurance.
        type:"Conditioning",
        exercise:"Jogging",
        detail:`${km} km • ${minutes} min • ${p||""}`,
        xp,
        runId,
        km,
        minutes
      });

      (window.Toast && window.Toast.toast)("Run saved", `+${xp} XP`);
      await renderRunning(el);
    };

    const ul=el.querySelector("#rList");
    if (!runs.length) ul.innerHTML="<li>—</li>";
    else{
      ul.innerHTML="";
      runs.slice(0,20).forEach(r=>{
        const li=document.createElement("li");
        li.innerHTML=`
          <div class="itemTop">
            <div><b>${r.date}</b> • ${r.km} km • ${r.minutes} min • ${pace(r.minutes,r.km)||"—"}</div>
            <span class="badge">${Math.round(r.xp||0)} XP</span>
          </div>
        `;
        ul.appendChild(li);
      });
    }
  }

  window.IronQuestRunning = { renderRunning };
})();
