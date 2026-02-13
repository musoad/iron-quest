/* =========================
   IRON QUEST v4 PRO – js/app.js
   ========================= */

(() => {
  const $ = (sel) => document.querySelector(sel);

  // -------- Tabs --------
  function wireTabs() {
    const buttons = Array.from(document.querySelectorAll("nav button[data-tab]"));
    const tabs = Array.from(document.querySelectorAll("main section.tab"));

    const show = (id) => {
      tabs.forEach(s => s.classList.toggle("active", s.id === id));
      buttons.forEach(b => b.classList.toggle("active", b.dataset.tab === id));
    };

    buttons.forEach(btn => {
      btn.addEventListener("click", () => show(btn.dataset.tab));
    });

    show("dashboard");
  }

  // -------- Render Dispatcher --------
  async function renderActive() {
    // Dashboard
    if (window.renderDashboard) await window.renderDashboard("#dashboard");
    else $("#dashboard").innerHTML = `<p class="hint">Dashboard wird gerendert…</p>`;

    // Log
    if (window.renderLog) await window.renderLog("#log");
    else $("#log").innerHTML = `<p class="hint">Log wird gerendert…</p>`;

    // Joggen
    if (window.renderRuns) await window.renderRuns("#jogging");
    else $("#jogging").innerHTML = `<p class="hint">Jogging wird gerendert…</p>`;

    // Skills
    if (window.renderSkilltree) await window.renderSkilltree("#skills");
    else $("#skills").innerHTML = `<p class="hint">Skilltree wird gerendert…</p>`;

    // Analytics
    if (window.renderAnalytics) await window.renderAnalytics("#analytics");
    else $("#analytics").innerHTML = `<p class="hint">Analytics wird gerendert…</p>`;

    // Health
    if (window.renderHealth) await window.renderHealth("#health");
    else $("#health").innerHTML = `<p class="hint">Health wird gerendert…</p>`;

    // Boss
    if (window.renderBoss) await window.renderBoss("#boss");
    else $("#boss").innerHTML = `<p class="hint">Boss wird gerendert…</p>`;

    // Challenge
    if (window.renderChallenges) await window.renderChallenges("#challenge");
    else $("#challenge").innerHTML = `<p class="hint">Challenge wird gerendert…</p>`;

    // Backup
    if (window.renderBackup) await window.renderBackup("#backup");
    else $("#backup").innerHTML = `<p class="hint">Backup wird gerendert…</p>`;
  }

  async function init() {
    // Tabs
    wireTabs();

    // DB init + (optional) legacy migration
    try {
      const mig = await window.IronDB?.init?.();
      if (mig?.migrated) {
        console.log("Legacy import ✅", mig);
      }
    } catch (e) {
      console.warn("DB init failed:", e);
    }

    // First render
    await renderActive();
  }

  init();
})();
