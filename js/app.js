/* =========================
   IRON QUEST v5 PRO — app.js (STABLE CORE)
   ✅ Single Router
   ✅ No Tab render collisions
   ✅ Central Render Engine
   ✅ DB init once
========================= */

(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  function setActiveTab(tabId) {
    document.querySelectorAll("nav button").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === tabId);
    });
    document.querySelectorAll("main .tab").forEach((sec) => {
      sec.classList.toggle("active", sec.id === tabId);
    });
  }

  function fmt(n) {
    const x = Math.round(Number(n || 0));
    return String(x);
  }

  async function computeCoreStats() {
    const entries = await window.IronDB.getAllEntries();
    const now = new Date();
    const iso = window.Utils.isoDate(now);

    const week = window.IronQuestProgression.getWeekNumber(iso);

    const todayXp = entries.filter(e => e.date === iso).reduce((s,e)=>s + (e.xp||0), 0);
    const weekXp  = entries.filter(e => (e.week||1) === week).reduce((s,e)=>s + (e.xp||0), 0);
    const totalXp = entries.reduce((s,e)=>s + (e.xp||0), 0);

    const level = window.IronQuestProgression.levelFromTotalXp(totalXp);

    return {
      week,
      weekLabel: `W${week}`,
      todayXp,
      weekXp,
      totalXp,
      levelLabel: `Lv ${level.lvl} – ${level.title}`
    };
  }

  function renderDashboardTopBar(dashEl, state) {
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
      </div>
    `;
    dashEl.prepend(card);
  }

  // Zentrale Render Engine: nur diese Funktion darf rendern
  async function renderRoute(route) {
    const el = document.getElementById(route);
    if (!el) return;

    // DB sicher einmal ready
    await window.IronDB.init();

    // registry: hier hängen wir die Module stabil ein
    const modules = {
      dashboard: async (container) => {
        if (window.IronQuestAnalytics?.renderDashboard) await window.IronQuestAnalytics.renderDashboard(container);
        else container.innerHTML = `<div class="card"><h2>Dashboard</h2><p class="hint">OK</p></div>`;

        const stats = await computeCoreStats();
        renderDashboardTopBar(container, stats);

        // StatusLine
        const header = document.querySelector("header h1");
        let statusLine = document.querySelector("header .statusLine");
        if (!statusLine) {
          statusLine = document.createElement("div");
          statusLine.className = "statusLine";
          header?.insertAdjacentElement("afterend", statusLine);
        }
        statusLine.textContent = `OK • ${stats.weekLabel} • ${stats.levelLabel}`;
      },

      log: async (container) => {
        if (window.IronQuestAnalytics?.renderLog) return window.IronQuestAnalytics.renderLog(container);
        container.innerHTML = `<div class="card"><h2>Log</h2><p class="hint">Log Renderer nicht gefunden.</p></div>`;
      },

      jogging: async (container) => {
        if (window.IronQuestRunning?.renderRunning) return window.IronQuestRunning.renderRunning(container);
        container.innerHTML = `<div class="card"><h2>Joggen</h2><p class="hint">Renderer fehlt.</p></div>`;
      },

      skills: async (container) => {
        if (window.IronQuestSkilltree?.renderSkilltree) return window.IronQuestSkilltree.renderSkilltree(container);
        container.innerHTML = `<div class="card"><h2>Skilltree</h2><p class="hint">Renderer fehlt.</p></div>`;
      },

      analytics: async (container) => {
        if (window.IronQuestAnalytics?.renderAnalytics) return window.IronQuestAnalytics.renderAnalytics(container);
        container.innerHTML = `<div class="card"><h2>Analytics</h2><p class="hint">Renderer fehlt.</p></div>`;
      },

      health: async (container) => {
        if (window.IronQuestHealth?.renderHealth) return window.IronQuestHealth.renderHealth(container);
        container.innerHTML = `<div class="card"><h2>Health</h2><p class="hint">Renderer fehlt.</p></div>`;
      },

      boss: async (container) => {
        if (window.IronQuestBoss?.renderBoss) return window.IronQuestBoss.renderBoss(container);
        container.innerHTML = `<div class="card"><h2>Boss</h2><p class="hint">Renderer fehlt.</p></div>`;
      },

      challenge: async (container) => {
        if (window.IronQuestChallenges?.renderChallenges) return window.IronQuestChallenges.renderChallenges(container);
        container.innerHTML = `<div class="card"><h2>Challenge</h2><p class="hint">Renderer fehlt.</p></div>`;
      },

      backup: async (container) => {
        if (window.IronQuestBackup?.renderBackup) return window.IronQuestBackup.renderBackup(container);
        container.innerHTML = `<div class="card"><h2>Backup</h2><p class="hint">Renderer fehlt.</p></div>`;
      },
    };

    try {
      const fn = modules[route];
      if (!fn) {
        el.innerHTML = `<div class="card"><h2>${route}</h2><p class="hint">Route nicht registriert.</p></div>`;
        return;
      }
      await fn(el);
    } catch (e) {
      console.error("RENDER ERROR:", route, e);
      el.innerHTML = `<div class="card"><h2>Fehler</h2><p class="hint">${String(e)}</p></div>`;
    }
  }

  function wireTabs() {
    document.querySelectorAll("nav button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const tab = btn.dataset.tab;
        setActiveTab(tab);
        try { location.hash = tab; } catch {}
        await renderRoute(tab);
      });
    });

    const initial = (location.hash || "#dashboard").replace("#", "");
    const tabExists = document.getElementById(initial);
    const startTab = tabExists ? initial : "dashboard";

    setActiveTab(startTab);
    renderRoute(startTab);
  }

  async function init() {
    // SW
    try {
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.register("./sw.js");
        navigator.serviceWorker.addEventListener("controllerchange", () => location.reload());
      }
    } catch (e) {
      console.warn("SW error:", e);
    }

    // DB ready once
    await window.IronDB.init();

    // Header clean
    const playerInfo = $("#playerInfo");
    if (playerInfo) playerInfo.innerHTML = "";

    wireTabs();
  }

  init();
})();
