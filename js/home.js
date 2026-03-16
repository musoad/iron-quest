(() => {
  "use strict";

  function esc(s){ return String(s||"").replace(/[&<>\"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m])); }
  function safe(v, fb){ return String(v ?? '').trim() || fb; }
  function avatarPath(gender){ return `assets/avatars/unassigned_${String(gender||'male').toLowerCase()==='female'?'female':'male'}.png`; }
  function statSubLabel(k){ return ({STR:'Power',END:'Stamina',AGI:'Speed',INT:'Focus',PER:'Awareness',LCK:'Fortune'})[k] || ''; }

  function getProfile(){
    return {
      name: safe(window.IronQuestProfile?.getName?.(), 'Hunter'),
      gender: window.IronQuestProfile?.getGender?.() || 'male',
      startDate: window.IronQuestProgression?.getStartDate?.() || window.IronQuestProfile?.getStartDate?.() || window.Utils?.isoDate?.(new Date()) || ''
    };
  }

  function getStats(){
    const hs = window.IronQuestHunterStats?.getSnapshot?.();
    if(hs && hs.stats) return hs.order.map(k=>({ k, v: hs.stats[k].level }));
    return [
      { k:'STR', v:1 },{ k:'END', v:1 },{ k:'AGI', v:1 },{ k:'INT', v:1 },{ k:'PER', v:1 },{ k:'LCK', v:1 }
    ];
  }

  async function getTodaySummary(){
    const today = window.Utils?.isoDate?.(new Date()) || String(new Date()).slice(0,10);
    const entries = await window.IronDB.getAllEntries();
    const todayEntries = entries.filter(e => String(e.date||'').slice(0,10) === today);
    const xp = todayEntries.reduce((s,e)=> s + Number(e.xp||0), 0);
    return { count: todayEntries.length, xp };
  }

  function getWeeklySchedule(){
    return [
      { day:'Montag', title:'Intervalllauf + Unterkörper A', detail:'4×4 Intervalle + Bulgarian Split Squat, Romanian Deadlift, Goblet Squat, Hip Thrust, Plank' },
      { day:'Dienstag', title:'Oberkörper A', detail:'Dumbbell Row, Push-ups, Shoulder Press, Renegade Row, Side Plank, optional Lateral Raise' },
      { day:'Mittwoch', title:'Lockerer Dauerlauf', detail:'30–45 Minuten Zone 2' },
      { day:'Donnerstag', title:'Unterkörper B', detail:'Goblet Squat, Single-Leg Romanian Deadlift, Reverse Lunge, Hip Thrust, Hollow Hold, optional Calf Raises' },
      { day:'Freitag', title:'Oberkörper B', detail:'Renegade Row, Floor Press, Shoulder Press, Push-ups, Russian Twist, optional Farmer Carry' },
      { day:'Samstag', title:'Optional', detail:'20–30 Minuten locker laufen oder Mobility' },
      { day:'Sonntag', title:'Ruhe', detail:'Vollständige Regeneration' }
    ];
  }

  async function render(root){
    if(!root) root = document.getElementById('home');
    if(!root) return;

    const p = getProfile();
    const snap = await window.IronQuestState.getSnapshot();
    const stats = getStats();
    const today = await getTodaySummary();
    const planState = window.IronQuestPlans?.getState?.();
    const currentPlan = planState?.plans?.find(x=>x.id===planState.activeId) || planState?.plans?.[0];
    const dayKey = window.IronQuestPlans?.dayKeyForDate?.(new Date()) || 'mon';
    const todayPlanNames = (currentPlan?.week?.[dayKey] || []);
    const todayPlan = todayPlanNames.map(name=> ({ name, item:(currentPlan?.items||[]).find(x=>x.name===name) })).filter(x=>x.name);

    root.innerHTML = `
      <div class="hq-wrap">
        <div class="hq-card slCard">
          <div class="slScan"></div>
          <div class="hq-top">
            <div class="hq-avatar"><img alt="Avatar" src="${avatarPath(p.gender)}"><div class="hq-aura"></div></div>
            <div class="hq-identity">
              <div class="slEyebrow">Training Dashboard</div>
              <div class="hq-name">${esc(p.name)}</div>
              <div class="hq-sub">
                <span class="pill">Level ${esc(String(snap.progression.level))}</span>
                <span class="pill">Rank ${esc(String(snap.rank))}</span>
                <span class="pill">Start ${esc(p.startDate)}</span>
              </div>
              <div class="hq-xp">
                <div class="hq-xp-row"><span class="muted">XP</span><span class="muted">${snap.progression.xp} / ${snap.progression.nextNeed}</span></div>
                <div class="hq-xpbar"><div class="hq-xpfill" style="width:${Math.round((snap.progression.xp / Math.max(1, snap.progression.nextNeed)) * 100)}%"></div></div>
              </div>
              <div class="home-stats-grid">
                ${stats.map(s=>`<div class="home-stat-card"><span class="home-stat-label">${esc(s.k)}</span><span class="home-stat-value">${esc(String(s.v))}</span><span class="home-stat-sub">${esc(statSubLabel(s.k))}</span></div>`).join('')}
              </div>
            </div>
          </div>

          <div class="hq-actions">
            <button class="hq-act primary" id="hqGoLog">➕ Training loggen</button>
            <button class="hq-act" id="hqGoPlans">🧾 Plan A/B</button>
            <button class="hq-act" id="hqGoRun">🏃 Lauf loggen</button>
            <button class="hq-act" id="hqGoHistory">🗓️ History</button>
            <button class="hq-act" id="hqGoHealth">❤️ Health</button>
          </div>

          <div class="hq-mini">
            <div class="hq-miniCard"><div class="hq-miniT">Heute</div><div class="hq-miniV">${today.count} Einträge • +${today.xp} XP</div><div class="hq-miniS">Streak ${snap.streak} Tage</div></div>
            <div class="hq-miniCard"><div class="hq-miniT">Woche</div><div class="hq-miniV">${snap.week.daysLogged}/${snap.week.workoutGoal} Sessions</div><div class="miniBar"><div class="miniFill" style="width:${Math.round(snap.week.workoutPct*100)}%"></div></div></div>
            <div class="hq-miniCard"><div class="hq-miniT">Wochen-XP</div><div class="hq-miniV">${Math.round(snap.totals.weekXp)} / ${snap.week.xpGoal}</div><div class="miniBar"><div class="miniFill" style="width:${Math.round(snap.week.xpPct*100)}%"></div></div></div>
            <div class="hq-miniCard"><div class="hq-miniT">Läufe</div><div class="hq-miniV">${snap.week.runs}</div><div class="hq-miniS">Intervall + Zone 2 + optional</div></div>
          </div>

          <div class="hq-grid">
            <div class="hq-section">
              <div class="hq-section-title">Heute geplanter Block</div>
              ${todayPlan.length ? `<div class="hq-planList">${todayPlan.map(x=>`<div class="hq-planRow"><div class="hq-planName"><b>${esc(x.name)}</b> ${(x.item?.sets || x.item?.reps) ? `<span class="pill small">${esc(x.item?.sets||'')} ${esc(x.item?.reps||'')}</span>` : ''}</div><div class="hq-planBtns"><button class="btn small" data-planlog="${esc(x.name)}">Log</button></div></div>`).join('')}</div>` : `<div class="hint">Heute ist kein Kraftblock im aktiven Plan hinterlegt. Im Plans-Tab kannst du das anpassen.</div>`}
            </div>
            <div class="hq-section">
              <div class="hq-section-title">Wochenstruktur</div>
              <div class="list">${getWeeklySchedule().map(x=>`<div class="list-item"><strong>${esc(x.day)} — ${esc(x.title)}</strong><div class="hint">${esc(x.detail)}</div></div>`).join('')}</div>
            </div>
          </div>

          <div class="hq-grid">
            <div class="hq-section">
              <div class="hq-section-title">Profil</div>
              <label class="hq-field"><span>Name</span><input id="hqNameInput" type="text" maxlength="24" value="${esc(p.name)}"></label>
              <div class="hq-row">
                <label class="hq-field"><span>Gender</span><select id="hqGender"><option value="male" ${p.gender==='male'?'selected':''}>Male</option><option value="female" ${p.gender==='female'?'selected':''}>Female</option></select></label>
                <label class="hq-field"><span>Start date</span><input id="hqStart" type="date" value="${esc(p.startDate)}"></label>
              </div>
              <div class="hint">Home bleibt dein zentraler Überblick für Plan, XP, Stats und Wochenfortschritt.</div>
            </div>
            <div class="hq-section">
              <div class="hq-section-title">Trainingslogik</div>
              <div class="hint">4 Krafttage, 2 Lauftage, 1 Ruhetag. Muskelgruppen werden 2× pro Woche trainiert, Joggen ist so platziert, dass Kraft und Hypertrophie möglichst wenig gestört werden.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    root.querySelector('#hqGoLog')?.addEventListener('click', ()=> window.IronQuestNav?.go?.('log'));
    root.querySelector('#hqGoPlans')?.addEventListener('click', ()=> window.IronQuestNav?.go?.('plans'));
    root.querySelector('#hqGoRun')?.addEventListener('click', ()=> window.IronQuestNav?.go?.('run'));
    root.querySelector('#hqGoHistory')?.addEventListener('click', ()=> window.IronQuestNav?.go?.('history'));
    root.querySelector('#hqGoHealth')?.addEventListener('click', ()=> window.IronQuestNav?.go?.('health'));
    root.querySelectorAll('[data-planlog]').forEach(btn=> btn.addEventListener('click', ()=>{
      const name = btn.getAttribute('data-planlog') || '';
      const item = (currentPlan?.items||[]).find(x=>x.name===name);
      window.IronQuestIntent = window.IronQuestIntent || {};
      window.IronQuestIntent.log = { date: window.Utils?.isoDate?.(new Date()) || '', exercise:name, sets:item?.sets||'', reps:item?.reps||'' };
      window.IronQuestNav?.go?.('log');
    }));

    const nameInput = root.querySelector('#hqNameInput');
    const genderSel = root.querySelector('#hqGender');
    const startInput = root.querySelector('#hqStart');
    nameInput?.addEventListener('input', ()=> window.IronQuestProfile?.setName?.(safe(nameInput.value, 'Hunter')));
    genderSel?.addEventListener('change', ()=>{ window.IronQuestProfile?.setGender?.(genderSel.value); render(root); });
    startInput?.addEventListener('change', ()=>{ window.IronQuestProgression?.setStartDate?.(startInput.value); window.IronQuestProfile?.setStartDate?.(startInput.value); });
  }

  window.IronQuestHome = { render };
})();
