/* exercises.js – CLASSIC SCRIPT (no export/import)
   Exposes: window.IronQuestExercises
*/

(function () {
  const LIST = [
    { name: "DB Floor Press", type: "Mehrgelenkig", desc: "Brust/Trizeps, neutraler Schulterwinkel", recSets: "3–5", recReps: "8–12" },
    { name: "Arnold Press", type: "Mehrgelenkig", desc: "Schulter/ROM, sauber kontrolliert", recSets: "3–4", recReps: "8–12" },
    { name: "Deficit Push-Ups", type: "Mehrgelenkig", desc: "Brust/Trizeps, größere Range", recSets: "3–4", recReps: "10–15" },
    { name: "1-Arm DB Row", type: "Unilateral", desc: "Lat/Rücken, Pause oben", recSets: "3–4", recReps: "8–12" },
    { name: "Bulgarian Split Squat", type: "Unilateral", desc: "Quads/Glute, unilateral stabil", recSets: "3–4", recReps: "8–12/Seite" },
    { name: "DB Romanian Deadlift", type: "Mehrgelenkig", desc: "Hamstrings/Glute, Hip-Hinge", recSets: "3–4", recReps: "8–12" },
    { name: "Plank", type: "Core", desc: "Anti-Extension, Core Spannung", recSets: "3–4", recReps: "30–60s" },
    { name: "Hollow Hold", type: "Core", desc: "Core, posterior pelvic tilt", recSets: "3–4", recReps: "20–45s" },
    { name: "Burpees", type: "Conditioning", desc: "Ganzkörper, Puls hoch", recSets: "4–6", recReps: "30–45s" },
    { name: "Walking", type: "NEAT", desc: "Alltag/Schritte/Zone2", recSets: "—", recReps: "Minuten" },
  ];

  function typeFor(name) {
    return LIST.find((x) => x.name === name)?.type || "Mehrgelenkig";
  }

  function get(name) {
    return LIST.find((x) => x.name === name) || null;
  }

  function renderExercisePicker(targetSelector, selectedName, onChange) {
    const root = document.querySelector(targetSelector);
    if (!root) return;

    const options = LIST.map((e) => {
      const sel = e.name === selectedName ? "selected" : "";
      return `<option value="${e.name}" ${sel}>${e.name} – ${e.type}</option>`;
    }).join("");

    root.innerHTML = `
      <label>Übung
        <select id="exerciseSelect">${options}</select>
      </label>
      <div class="hint" id="exerciseHint"></div>
    `;

    const sel = root.querySelector("#exerciseSelect");
    const hint = root.querySelector("#exerciseHint");

    function updateHint() {
      const ex = get(sel.value);
      hint.textContent = ex ? `${ex.desc} • Empf: ${ex.recSets} Sätze × ${ex.recReps}` : "";
    }

    sel.addEventListener("change", () => {
      updateHint();
      if (typeof onChange === "function") onChange(sel.value);
    });

    updateHint();
  }

  window.IronQuestExercises = { list: LIST, typeFor, get, renderExercisePicker };
})();
