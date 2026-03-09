(() => {
  "use strict";

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function showTab(tabId) {
    qsa("[data-tab], .tab-pane, .screen, section[id]").forEach(el => {
      if (!el.id) return;
      if (el.id === tabId) {
        el.style.display = "";
        el.classList.add("active");
      } else {
        el.style.display = "none";
        el.classList.remove("active");
      }
    });

    qsa("[data-nav]").forEach(btn => {
      const t = btn.getAttribute("data-nav");
      btn.classList.toggle("active", t === tabId);
    });

    if (tabId === "home") window.IronQuestHome?.render?.(qs("#home"));
    if (tabId === "log") window.IronQuestLog?.render?.(qs("#log"));
    if (tabId === "run") window.IronQuestJogging?.render?.(qs("#run"));
    if (tabId === "stats") window.IronQuestStats?.render?.(qs("#stats"));
    if (tabId === "quests") window.IronQuestQuests?.render?.(qs("#quests"));
    if (tabId === "gates") window.IronQuestGates?.render?.(qs("#gates"));
    if (tabId === "boss") window.IronQuestBossArena?.render?.(qs("#boss"));
    if (tabId === "skills") window.IronQuestSkills?.render?.(qs("#skills"));
    if (tabId === "review") window.IronQuestReview?.render?.(qs("#review"));
    if (tabId === "health") window.IronQuestHealth?.render?.(qs("#health"));
    if (tabId === "backup") window.IronQuestBackup?.render?.(qs("#backup"));
    if (tabId === "history") window.IronQuestHistory?.render?.(qs("#history"));
    if (tabId === "plans") window.IronQuestPlansView?.render?.(qs("#plans"));
    if (tabId === "equipment") window.IronQuestEquipment?.render?.(qs("#equipment"));
    if (tabId === "diagnostics") window.renderDiagnostics?.();
    if (tabId === "balance") window.IronQuestBalance?.render?.(qs("#balance"));
  }

  function openMore() {
    const sheet = qs("#moreSheet");
    const backdrop = qs("#moreBackdrop");

    if (sheet) {
      sheet.style.display = "block";
      sheet.classList.add("open");
      sheet.setAttribute("aria-hidden", "false");
    }

    if (backdrop) {
      backdrop.style.display = "block";
      backdrop.classList.add("open");
      backdrop.setAttribute("aria-hidden", "false");
    }

    document.body.classList.add("more-open");
  }

  function closeMore() {
    const sheet = qs("#moreSheet");
    const backdrop = qs("#moreBackdrop");

    if (sheet) {
      sheet.classList.remove("open");
      sheet.style.display = "none";
      sheet.setAttribute("aria-hidden", "true");
    }

    if (backdrop) {
      backdrop.classList.remove("open");
      backdrop.style.display = "none";
      backdrop.setAttribute("aria-hidden", "true");
    }

    document.body.classList.remove("more-open");
  }

  function bindMore() {
    const moreBtn = qs('[data-nav="more"]') || qs("#moreBtn");
    const closeBtn = qs("#moreClose") || qs("[data-more-close]");
    const backdrop = qs("#moreBackdrop");
    const sheet = qs("#moreSheet");

    moreBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      openMore();
    });

    closeBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMore();
    });

    backdrop?.addEventListener("click", () => closeMore());

    sheet?.addEventListener("click", (e) => {
      const navTarget = e.target.closest("[data-more-nav]");
      if (navTarget) {
        const target = navTarget.getAttribute("data-more-nav");
        closeMore();
        showTab(target);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMore();
    });
  }

  function bindBottomNav() {
    qsa("[data-nav]").forEach(btn => {
      const target = btn.getAttribute("data-nav");
      if (!target || target === "more") return;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        closeMore();
        showTab(target);
      });
    });
  }

  async function boot() {
    try {
      await window.IronDB?.open?.();
    } catch (_) {}

    window.IronQuestNav = {
      go(tab) {
        closeMore();
        showTab(tab);
      }
    };

    bindBottomNav();
    bindMore();
    showTab("home");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
