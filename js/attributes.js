/* =========================
   IRON QUEST v4 PRO – attributes.js
   - Berechnet STR/STA/END/MOB aus Entries
   - Rendert eine kleine Attribute-Box (optional)
   ========================= */

(function () {
  const ATTR_KEYS = ["STR", "STA", "END", "MOB"];

  function zeroAttr() {
    return { STR: 0, STA: 0, END: 0, MOB: 0 };
  }

  // Mapping: type -> Attribute Verteilung
  function attrFromEntry(entry) {
    const out = zeroAttr();
    const xp = Number(entry?.xp || 0);
    const t = String(entry?.type || "");

    // Du kannst diese Logik jederzeit tunen
    if (t === "Mehrgelenkig") out.STR += xp;
    else if (t === "Unilateral") out.STA += xp;
    else if (t === "Conditioning") out.END += xp;
    else if (t === "Core") out.MOB += xp;
    else if (t === "Komplexe") {
      out.STR += xp * 0.4;
      out.STA += xp * 0.2;
      out.END += xp * 0.2;
      out.MOB += xp * 0.2;
    }
    else if (t === "NEAT") {
      out.END += xp * 0.7;
      out.MOB += xp * 0.3;
    }
    else if (t === "Boss-Workout") {
      out.STR += xp * 0.25;
      out.STA += xp * 0.25;
      out.END += xp * 0.25;
      out.MOB += xp * 0.25;
    }
    // Quests/Achievements/Boss etc. zählen nicht in Attribute (optional)
    return out;
  }

  function sumAttributes(entries) {
    const sum = zeroAttr();
    (entries || []).forEach(e => {
      const a = attrFromEntry(e);
      ATTR_KEYS.forEach(k => sum[k] += a[k]);
    });
    // runden
    ATTR_KEYS.forEach(k => sum[k] = Math.round(sum[k]));
    return sum;
  }

  // Levelkurve für Attribute
  function reqForLevel(level) {
    const l = Math.max(1, level);
    return 900 + (l - 1) * 150;
  }

  function levelFromXp(totalXp) {
    let lvl = 1;
    let xp = Math.max(0, Math.round(totalXp || 0));
    while (true) {
      const req = reqForLevel(lvl);
      if (xp >= req) { xp -= req; lvl += 1; }
      else break;
      if (lvl > 999) break;
    }
    return { lvl, into: xp, need: reqForLevel(lvl) };
  }

  function render(containerEl, entries) {
    if (!containerEl) return;
    const attr = sumAttributes(entries);

    const rows = ATTR_KEYS.map(k => {
      const info = levelFromXp(attr[k]);
      const pct = Math.max(0, Math.min(100, Math.round((info.into / info.need) * 100)));
      return `
        <div class="card">
          <h3>${k} <span class="hint">Lv ${info.lvl}</span></h3>
          <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
          <div class="hint">${attr[k]} XP • ${Math.max(0, info.need - info.into)} bis nächstes Lv</div>
        </div>
      `;
    }).join("");

    containerEl.innerHTML = `
      <section class="panelBlock">
        <h2>Attribute</h2>
        <div class="grid2">${rows}</div>
      </section>
    `;
  }

  // Public API
  window.IronQuestAttributes = {
    sumAttributes,
    levelFromXp,
    render
  };
})();
