/* =========================
   IRON QUEST v5 PRO — app.js (STABLE CORE)
   ✅ Single Router
   ✅ No Tab render collisions
   ✅ Central Render Engine
   ✅ DB init once
   ✅ Force SW update + debug
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

  function ensureStatusLine(text) {
    const header = document.querySelector("header h1");
    let statusLine = document.querySelector("header .statusLine");
    if (!statusLine) {
      statusLine = document.createElement("div");
      statusLine.className = "statusLine";
      header?.insertAdjacentElement("afterend", statusLine);
    }
    statusLine.textContent = text;
  }

  async function renderRoute(route) {
    const el = document.getElementById(route);
    if (!el) return;

    await window.IronDB.init();

    const modules = {
      dashboard: async (container) => {
        // Debug: zeigt ob Analytics geladen ist
        const ok = !!(window.IronQuestAnalytics && typeof window.IronQuestAnalytics.renderDashboard === "function");
        ensureStatusLine(ok ? "Modules: OK" : "Modules: MISSING (Analytics)");

        if (ok) await window.IronQuestAnalytics.renderDashboard(container);
        else container.innerHTML = `
          <div class="card">
            <h2>Dashboard</h2>
            <p class="hint">OK</p>
            <div class="hint">⚠️ window.IronQuestAnalytics fehlt. Das ist fast immer ein Service-Worker Cache Problem.</div>
            <div class="hint">Lösung: PWA neu laden oder Cache löschen (siehe Anleitung).</div>
          </div>
        `;

        const stats = await computeCoreStats();
        renderDashboardTopBar(container, stats);
        ensureStatusLine(`OK • ${stats.weekLabel} • ${stats.levelLabel}`);
      },

      log: async (container) => {
        if (window.IronQuestAnalytics?.renderLog) return window.IronQuestAnalytics.renderLog(container);
        container.innerHTML = `<div class="card"><h2>Log</h2><p class="hint">Log Renderer nicht gefunden.</p>
          <div class="hint">Check: window.IronQuestAnalytics in der Konsole.</div></div>`;
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

  async function initServiceWorker() {
    try {
      if (!("serviceWorker" in navigator)) return;

      const reg = await navigator.serviceWorker.register("./sw.js");

      // Force update check
      try { await reg.update(); } catch {}

      // If a new SW is waiting, activate it now
      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        location.reload();
      });

    } catch (e) {
      console.warn("SW error:", e);
    }
  }

  async function init() {
    await initServiceWorker();
    await window.IronDB.init();

    const playerInfo = $("#playerInfo");
    if (playerInfo) playerInfo.innerHTML = "";

    wireTabs();
  }

  init();
})();
