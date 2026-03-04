(() => {
  "use strict";

  // Hunter Card (mobile-first)

  const CLASSES = [
    { key: "unassigned", label: "Unassigned" },
    { key: "berserker", label: "Berserker" },
    { key: "assassin", label: "Assassin" },
    { key: "guardian", label: "Guardian" },
    { key: "ranger", label: "Ranger" },
    { key: "monarch", label: "Monarch" },
  ];

  const GENDERS = [
    { key: "male", label: "Male" },
    { key: "female", label: "Female" },
  ];

  function safe(v, fallback) {
    return (v === undefined || v === null || v === "") ? fallback : v;
  }

  function avatarPath(clsKey, genderKey) {
    // files live at assets/avatars/<class>_<gender>.png
    const c = (clsKey || "unassigned").toLowerCase();
    const g = (genderKey || "male").toLowerCase();
    return `assets/avatars/${c}_${g}.png`;
  }

  function getProfile() {
    const name = window.IronQuestProfile?.getName?.() || "Hunter";
    const cls = window.IronQuestProfile?.getClass?.() || "unassigned";
    const startDate = window.IronQuestProfile?.getStartDate?.() || window.Utils?.isoDate?.(new Date()) || "";
    const gender = window.IronQuestProfile?.getGender?.() || "male";
    return { name, cls, startDate, gender };
  }

  async function getTotals() {
    try {
      const entries = await window.IronDB.getAllEntries();
      const totalXp = entries.reduce((s, e) => s + Number(e.xp || 0), 0);
      const lvlObj = window.IronQuestProgression?.levelFromTotalXp?.(totalXp) || { lvl: 1, next: 100, into: totalXp };
      const lvl = Number(lvlObj.lvl || 1);
      const rank = window.IronQuestHunterRank?.compute?.(lvl, totalXp) || "E";
      const next = Number(lvlObj.next || 100);
      const into = Number(lvlObj.into || 0);
      const pct = Math.max(0, Math.min(100, Math.round((into / Math.max(1, next)) * 100)));
      return { totalXp, lvl, rank, next, into, pct };
    } catch {
      return { totalXp: 0, lvl: 1, rank: "E", next: 100, into: 0, pct: 0 };
    }
  }

  function getStats() {
    const st = window.IronQuestAttributes?.getState?.();
    const base = { STR: 0, END: 0, AGI: 0, INT: 0, PER: 0, LCK: 0 };
    const s = Object.assign({}, base, st || {});
    return [
      { k: "STR", label: "Strength" },
      { k: "END", label: "Endurance" },
      { k: "AGI", label: "Agility" },
      { k: "INT", label: "Intellect" },
      { k: "PER", label: "Perception" },
      { k: "LCK", label: "Luck" },
    ].map(x => ({ ...x, v: Number(s[x.k] || 0) }));
  }

  function classAura(clsKey) {
    switch ((clsKey || "unassigned").toLowerCase()) {
      case "berserker": return "rgba(255,90,30,.40)";
      case "assassin": return "rgba(165,90,255,.40)";
      case "guardian": return "rgba(90,150,255,.40)";
      case "ranger": return "rgba(90,255,150,.35)";
      case "monarch": return "rgba(80,220,255,.35)";
      default: return "rgba(140,160,170,.30)";
    }
  }

  function htmlEscape(str) {
    return String(str).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  }

  async function render(root) {
    const p = getProfile();
    const totals = await getTotals();
    const stats = getStats();

    const clsLabel = (CLASSES.find(c => c.key === p.cls)?.label) || "Unassigned";

    root.innerHTML = `
      <div class="hq-wrap">
        <div class="hq-card" style="--aura:${classAura(p.cls)}">
          <div class="hq-top">
            <div class="hq-avatar">
              <img id="hqAvatarImg" alt="Avatar" src="${avatarPath(p.cls, p.gender)}" />
              <div class="hq-aura"></div>
            </div>
            <div class="hq-identity">
              <div class="hq-name" id="hqName">${htmlEscape(p.name)}</div>
              <div class="hq-sub">
                <span class="pill">${htmlEscape(clsLabel)}</span>
                <span class="pill">Rank ${htmlEscape(String(totals.rank))}</span>
                <span class="pill">Lvl ${htmlEscape(String(totals.lvl))}</span>
              </div>
              <div class="hq-xp">
                <div class="hq-xp-row">
                  <span class="muted">XP</span>
                  <span class="muted">${totals.into} / ${totals.next} (${totals.pct}%)</span>
                </div>
                <div class="hq-xpbar"><div class="hq-xpfill" style="width:${totals.pct}%"></div></div>
              </div>
            </div>
          </div>

          <div class="hq-grid">
            <div class="hq-section">
              <div class="hq-section-title">Profile</div>
              <label class="hq-field">
                <span>Name</span>
                <input id="hqNameInput" type="text" maxlength="24" value="${htmlEscape(p.name)}" placeholder="Your name" />
              </label>
              <div class="hq-row">
                <label class="hq-field">
                  <span>Gender</span>
                  <select id="hqGender">
                    ${GENDERS.map(g => `<option value="${g.key}" ${g.key === p.gender ? "selected" : ""}>${g.label}</option>`).join("")}
                  </select>
                </label>
                <label class="hq-field">
                  <span>Class</span>
                  <select id="hqClass">
                    ${CLASSES.map(c => `<option value="${c.key}" ${c.key === p.cls ? "selected" : ""}>${c.label}</option>`).join("")}
                  </select>
                </label>
              </div>
              <label class="hq-field">
                <span>Start date</span>
                <input id="hqStart" type="date" value="${htmlEscape(p.startDate)}" />
              </label>
              <div class="hint">Tip: You can set start date retroactively.</div>
            </div>

            <div class="hq-section">
              <div class="hq-section-title">Stats</div>
              <div class="hq-stats">
                ${stats.map(s => `
                  <div class="hq-stat">
                    <div class="hq-stat-k">${s.k}</div>
                    <div class="hq-stat-v">${s.v}</div>
                    <div class="hq-stat-l">${htmlEscape(s.label)}</div>
                  </div>
                `).join("")}
              </div>
              <div class="hint">Stats are earned through your Logs and Skills.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const nameInput = root.querySelector("#hqNameInput");
    const genderSel = root.querySelector("#hqGender");
    const classSel = root.querySelector("#hqClass");
    const startInput = root.querySelector("#hqStart");
    const avatarImg = root.querySelector("#hqAvatarImg");
    const nameLabel = root.querySelector("#hqName");

    const applyAvatar = () => {
      const cls = classSel?.value || "unassigned";
      const gender = genderSel?.value || "male";
      if (avatarImg) avatarImg.src = avatarPath(cls, gender);
      const card = root.querySelector('.hq-card');
      if (card) card.style.setProperty('--aura', classAura(cls));
    };

    if (nameInput) {
      nameInput.addEventListener("input", () => {
        const v = safe(nameInput.value.trim(), "Hunter");
        window.IronQuestProfile?.setName?.(v);
        if (nameLabel) nameLabel.textContent = v;
      });
    }
    if (genderSel) {
      genderSel.addEventListener("change", () => {
        window.IronQuestProfile?.setGender?.(genderSel.value);
        applyAvatar();
      });
    }
    if (classSel) {
      classSel.addEventListener("change", () => {
        window.IronQuestProfile?.setClass?.(classSel.value);
        applyAvatar();
      });
    }
    if (startInput) {
      startInput.addEventListener("change", () => {
        if (window.IronQuestProfile?.setStartDate) window.IronQuestProfile.setStartDate(startInput.value);
      });
    }
  }

  window.IronQuestHome = { render };
})();
