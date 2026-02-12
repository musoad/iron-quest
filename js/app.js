// js/app.js (MODULE ENTRYPOINT)
// ✅ Fix: ES-Module korrekt laden (import/export)
// ✅ Fix: Tabs funktionieren sicher
// ✅ Fix: Boot/Init stabil + klare Console-Fehler

import { $$ } from "./utils.js";

// Lade alle Module (nur import reicht, damit sie ausführen)
// Wenn ein Modul nicht existiert, siehst du sofort den Fehler in der Konsole.
import "./db.js";
import "./exercises.js";
import "./xpSystem.js";
import "./progression.js";
import "./attributes.js";
import "./skilltree.js";
import "./analytics.js";
import "./health.js";
import "./boss.js";
import "./challenges.js";
import "./backup.js";

// ---------------------------
// Tabs (dein v4 HTML: nav button[data-tab] + section#<id>.tab)
// ---------------------------
function activateTab(tabId) {
  const tabs = $$("main > section.tab");
  tabs.forEach(s => s.classList.remove("active"));

  const navBtns = $$("nav button[data-tab]");
  navBtns.forEach(b => b.classList.remove("active"));

  const target = document.getElementById(tabId);
  if (target) target.classList.add("active");

  const btn = document.querySelector(`nav button[data-tab="${tabId}"]`);
  if (btn) btn.classList.add("active");
}

function bindTabs() {
  const nav = document.querySelector("nav");
  if (!nav) return;

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    const tabId = btn.getAttribute("data-tab");
    if (!tabId) return;
    activateTab(tabId);
  });
}

// ---------------------------
// Placeholder Render (damit du sofort siehst: App läuft)
// Wenn deine Module eigene renderX() Funktionen haben,
// können wir die danach sauber hier verdrahten.
// ---------------------------
function renderPlaceholders() {
  const ids = ["dashboard","log","skills","analytics","health","boss","challenge"];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.innerHTML.trim() !== "") continue;

    el.innerHTML = `
      <div class="card">
        <h2>${id.toUpperCase()}</h2>
        <p class="hint">✅ Module geladen. UI-Render wird als nächstes verdrahtet.</p>
      </div>
    `;
  }
}

// ---------------------------
// Service Worker Update-Flow
// ---------------------------
async function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register("./sw.js");
    console.log("SW registered ✅", reg);

    // Wenn ein neuer SW wartet → sofort aktivieren
    if (reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "installed") {
          // Wenn schon eine alte Version aktiv war → reload, damit neue Assets kommen
          if (navigator.serviceWorker.controller) {
            console.log("New version installed ✅ reloading…");
            window.location.reload();
          }
        }
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("SW controller changed ✅");
    });
  } catch (e) {
    console.warn("SW register failed:", e);
  }
}

// ---------------------------
// Boot
// ---------------------------
async function boot() {
  bindTabs();
  activateTab("dashboard");
  renderPlaceholders();

  await registerSW();

  console.log("IRON QUEST v4 PRO booted ✅");
}

boot().catch((e) => {
  console.error("BOOT ERROR:", e);
  alert("Fehler beim Start (siehe Konsole).");
});
