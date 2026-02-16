/* =========================
   IRON QUEST v4 PRO — js/app.js (FULL)
   ✅ Tabs stabil
   ✅ Render-Pipeline stabil
   ✅ Header "playerInfo" wird NICHT mehr als Stats-Leiste benutzt
   ✅ Stats-Leiste wird als schöne Dashboard-Card gerendert
========================= */

const $ = (sel) => document.querySelector(sel);

function setActiveTab(tabId) {
  document.querySelectorAll("nav button").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tabId);
  });
  document.querySelectorAll("main .tab").forEach((sec) => {
    sec.classList.toggle("active", sec.id === tabId);
  });
}

function wireTabs() {
  document.querySelectorAll("nav button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      setActiveTab(tab);
      // optional: hash
      try { location.hash = tab; } catch {}
    });
  });

  // restore via hash
  const initial = (location.hash || "#dashboard").replace("#", "");
  if (document.getElementById(initial)) setActiveTab(initial);
  else setActiveTab("dashboard");
}

function fmt(n) {
  const x = Math.round(Number(n || 0));
  return String(x);
}

function renderDashboardTopBar(dashEl, state) {
  // state: { weekLabel, todayXp, weekXp, totalXp, levelLabel, streakLabel }
  const existing = dashEl.querySelector("#dashTopStats");
  if (existing) existing.remove();

  const card = document.createElement("div");
  card.className = "card";
  card.id = "dashTopStats";
  card.innerHTML = `
    <h2>Übersicht</h2>
    <div class="statRow">
      <div class="pill"><b>${state.weekLabel}</b></div>
      <div class="pill"><b>Heute:</b> ${fmt(state.todayXp)} XP</div>
      <div class="pill"><b>Woche:</b> ${fmt(state.weekXp)} XP</div>
      <div class="pill"><b>Total:</b> ${fmt(state.totalXp)} XP</div>
    </div>
    <div class="statRow">
      <div class="pill"><b>${state.levelLabel}</b></div>
      <div class="pill"><b>${state.streakLabel}</b></div>
    </div>
  `;

  dashEl.prepend(card);
}

async function computeCoreStats() {
  const entries = await window.IronDB.getAllEntries();

  const now = new Date();
  const iso = window.Utils?.isoDate ? window.Utils.isoDate(now) : now.toISOString().slice(0,10);

  const week = window.IronQuestProgression?.getWeekNumber
    ? window.IronQuestProgression.getWeekNumber()
    : 1;

  const todayXp = entries
    .filter(e => e.date === iso)
    .reduce((s,e)=>s + (e.xp||0), 0);

  const weekXp = entries
    .filter(e => (e.week||1) === week)
    .reduce((s,e)=>s + (e.xp||0), 0);

  const totalXp = entries.reduce((s,e)=>s + (e.xp||0), 0);

  const level = window.IronQuestProgression?.levelFromTotalXp
    ? window.IronQuestProgression.levelFromTotalXp(totalXp)
    : { lvl: 1, title: "Anfänger" };

  const streak = window.IronQuestStreak?.getStreakState
    ? window.IronQuestStreak.getStreakState(entries)
    : { streak: 0, best: 0 };

  return {
    week,
    weekLabel: `W${week}`,
    todayXp,
    weekXp,
    totalXp,
    levelLabel: `Lv ${level.lvl} – ${level.title}`,
    streakLabel: `Streak ${streak.streak} (Best ${streak.best})`,
    entries
  };
}

/* =========================
   RENDER SECTIONS
========================= */

async function renderAll() {
  // Header: NICHT mehr voll mit Pills
  const playerInfo = $("#playerInfo");
  if (playerInfo) playerInfo.innerHTML = ""; // keep clean

  // Ensure DB ready
  await window.IronDB.init();

  // Core stats
  const s = await computeCoreStats();

  // Dashboard
  const dashEl = $("#dashboard");
  if (dashEl) {
    // Dashboard Base Render (falls vorhanden)
    if (window.IronQuestAnalytics?.renderDashboard) {
      await window.IronQuestAnalytics.renderDashboard(dashEl);
    } else {
      // Fallback minimal (nur wenn du wirklich gar keinen Dashboard-Renderer hast)
      dashEl.innerHTML = `<div class="card"><h2>Dashboard</h2><p class="hint">OK</p></div>`;
    }
    renderDashboardTopBar(dashEl, s);
  }

  // Log (dein Log kommt aus analytics.js oder skilltree.js? -> wir lassen’s so wie bei dir,
  // aber nur wenn Renderer existiert)
  const logEl = $("#log");
  if (logEl) {
    if (window.IronQuestAnalytics?.renderLog) {
      await window.IronQuestAnalytics.renderLog(logEl);
    } else if (window.IronQuestXP?.renderLog) {
      await window.IronQuestXP.renderLog(logEl);
    } else {
      // fallback: NICHT "OK" überall, sondern klare Meldung
      logEl.innerHTML = `<div class="card"><h2>Log</h2><p class="hint">Log Renderer nicht gefunden.</p></div>`;
    }
  }

  // Joggen
  const jogEl = $("#joggen");
  if (jogEl && window.IronQuestRunning?.renderRunning) {
    await window.IronQuestRunning.renderRunning(jogEl);
  }

  // Skilltree
  const skillEl = $("#skills");
  if (skillEl && window.IronQuestSkilltree?.renderSkilltree) {
    await window.IronQuestSkilltree.renderSkilltree(skillEl);
  }

  // Analytics
  const anEl = $("#analytics");
  if (anEl && window.IronQuestAnalytics?.renderAnalytics) {
    await window.IronQuestAnalytics.renderAnalytics(anEl);
  }

  // Health
  const healthEl = $("#health");
  if (healthEl && window.IronQuestHealth?.renderHealth) {
    await window.IronQuestHealth.renderHealth(healthEl);
  }

  // Boss
  const bossEl = $("#boss");
  if (bossEl && window.IronQuestBoss?.renderBoss) {
    await window.IronQuestBoss.renderBoss(bossEl);
  }

  // Challenge
  const chEl = $("#challenge");
  if (chEl && window.IronQuestChallenges?.renderChallenges) {
    await window.IronQuestChallenges.renderChallenges(chEl);
  }

  // Backup
  const backupEl = $("#backup");
  if (backupEl && window.IronQuestBackup?.renderBackup) {
    await window.IronQuestBackup.renderBackup(backupEl);
  }

  // Status label (optional)
  const header = document.querySelector("header h1");
  const statusLine = document.querySelector("header .statusLine");
  if (!statusLine) {
    const p = document.createElement("div");
    p.className = "statusLine";
    p.textContent = `OK • W${s.week} • ${s.streakLabel}`;
    header?.insertAdjacentElement("afterend", p);
  } else {
    statusLine.textContent = `OK • W${s.week} • ${s.streakLabel}`;
  }
}

/* =========================
   INIT
========================= */
function wireUpdateButton() {
  const btn = document.getElementById("updateBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      }
      location.reload();
    } catch (e) {
      console.warn(e);
      location.reload();
    }
  });
}

async function init() {
  try {
    wireTabs();
    wireUpdateButton();

    // Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js");
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        // Auto reload on update
        location.reload();
      });
    }

    await renderAll();
  } catch (e) {
    console.error("APP INIT ERROR:", e);
    const dash = $("#dashboard");
    if (dash) dash.innerHTML = `<div class="card"><h2>Fehler</h2><p class="hint">${String(e)}</p></div>`;
  }
}

init();
