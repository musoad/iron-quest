/* =========================
   IRON QUEST v4 PRO – js/app.js (iOS SAFE)
   ✅ Tabs funktionieren IMMER (auch wenn einzelne Module Fehler werfen)
   ✅ Fehler werden im UI angezeigt (kein Mac/Safari-Konsole nötig)
   ✅ Update Button: SW skipWaiting + hard reload
========================= */

import { $, $$ } from "./utils.js";
import { getPlayer, setPlayer, ensurePlayer } from "./progression.js";
import { getStreak, recomputeStreak } from "./streak.js";
import { computeRecompIndex } from "./attributes.js";

import { renderLogPanel } from "./db.js";
import { renderSkilltreePanel } from "./skilltree.js";
import { renderAnalyticsPanel } from "./analytics.js";
import { renderHealthPanel } from "./health.js";
import { renderBossPanel } from "./boss.js";
import { renderChallengePanel } from "./challenges.js";
import { renderBackupPanel } from "./backup.js";

const APP_VERSION = "v4.0.0";

function setStatus(text, isError = false) {
  const el = $("#playerInfo");
  if (!el) return;
  el.textContent = text;
  el.style.opacity = "0.9";
  el.style.fontSize = "14px";
  el.style.marginTop = "6px";
  el.style.color = isError ? "#ff6b6b" : "#9effa5";
}

function showFatalUI(err) {
  const msg = (err && (err.stack || err.message)) ? (err.stack || err.message) : String(err);
  setStatus("JS ERROR – Details unten", true);

  let box = $("#iqErrorBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "iqErrorBox";
    box.style.cssText =
      "margin:12px 0;padding:12px;border-radius:14px;background:rgba(255,0,0,.10);border:1px solid rgba(255,0,0,.25);color:#ffd0d0;font-size:12px;white-space:pre-wrap;word-break:break-word;";
    const header = document.querySelector("header") || document.body;
    header.appendChild(box);
  }
  box.textContent = `IRON QUEST ${APP_VERSION}\n\n${msg}`;
}

function setActiveTab(tabId) {
  // sections: <section id="dashboard" class="tab ...">
  $$(".tab").forEach(sec => sec.classList.remove("active"));
  const sec = document.getElementById(tabId);
  if (sec) sec.classList.add("active");

  // nav buttons
  $$("nav button").forEach(b => b.classList.remove("active"));
  const btn = document.querySelector(`nav button[data-tab="${tabId}"]`);
  if (btn) btn.classList.add("active");
}

function wireTabs() {
  $$("nav button[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");
      if (tab) setActiveTab(tab);
    });
  });

  // Default tab
  if (!document.querySelector(".tab.active")) {
    setActiveTab("dashboard");
  }
}

async function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register("./sw.js");

    // Wenn ein neuer SW wartet → Update UI aktivieren
    reg.addEventListener("updatefound", () => {
      setStatus(`Update gefunden… (${APP_VERSION})`, false);
    });

    // Optional: wenn SW ready
    await navigator.serviceWorker.ready;
  } catch (e) {
    // SW Fehler darf die App NICHT killen
    console.warn("SW register failed", e);
  }
}

function ensureUpdateButton() {
  let btn = $("#iqUpdateBtn");
  if (btn) return;

  btn = document.createElement("button");
  btn.id = "iqUpdateBtn";
  btn.textContent = "Update";
  btn.style.cssText =
    "margin-top:10px; padding:10px 14px; border-radius:14px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.06); color:#fff; font-weight:700;";

  const header = document.querySelector("header") || document.body;
  header.appendChild(btn);

  btn.addEventListener("click", async () => {
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
      }
    } catch (e) {}
    // Hard reload (iOS-friendly)
    location.reload();
  });
}

function safeCall(name, fn) {
  try {
    fn();
  } catch (e) {
    console.error(`Render error in ${name}`, e);
    showFatalUI(e);
  }
}

async function boot() {
  // Tabs + Update Button sollen IMMER gehen – auch wenn Render crasht
  wireTabs();
  ensureUpdateButton();
  setStatus(`OK • ${APP_VERSION}`, false);

  // Player init
  ensurePlayer();

  // Dashboard render (minimal, damit du IMMER was siehst)
  const dash = document.getElementById("dashboard");
  if (dash) {
    const p = getPlayer();
    const st = getStreak();
    const r = computeRecompIndex();

    dash.innerHTML = `
      <div class="card">
        <h2>Dashboard</h2>
        <div class="grid2">
          <div class="pill"><b>Level:</b> ${p.level} • <b>XP:</b> ${p.xp}</div>
          <div class="pill"><b>Streak:</b> ${st.current} (best ${st.best})</div>
          <div class="pill"><b>Recomp Index:</b> ${r.score}</div>
          <div class="pill"><b>Status:</b> OK</div>
        </div>
        <div class="divider"></div>
        <div class="hint">Wenn Tabs nicht reagieren, steht der Fehler oben rot im Error-Block.</div>
      </div>
    `;
  }

  // Andere Panels (einzeln abgesichert)
  safeCall("Log", () => renderLogPanel(document.getElementById("log")));
  safeCall("Skilltree", () => renderSkilltreePanel(document.getElementById("skills")));
  safeCall("Analytics", () => renderAnalyticsPanel(document.getElementById("analytics")));
  safeCall("Health", () => renderHealthPanel(document.getElementById("health")));
  safeCall("Boss", () => renderBossPanel(document.getElementById("boss")));
  safeCall("Challenge", () => renderChallengePanel(document.getElementById("challenge")));

  // Backup Tab ist optional – falls du ihn im HTML nicht hast → nicht crashen
  const backupEl = document.getElementById("backup");
  if (backupEl) safeCall("Backup", () => renderBackupPanel(backupEl));

  // Streak neu berechnen (safe)
  try { await recomputeStreak(); } catch (e) { console.warn(e); }

  // Starttab
  setActiveTab("dashboard");
}

// Global Error Hooks → iOS zeigt es dann oben an
window.addEventListener("error", (e) => showFatalUI(e.error || e.message));
window.addEventListener("unhandledrejection", (e) => showFatalUI(e.reason));

// Init
(async function init() {
  try {
    await registerSW();
    await boot();
  } catch (e) {
    console.error(e);
    showFatalUI(e);
  }
})();
