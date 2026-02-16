(() => {
  "use strict";

  // Minimal solide Basis (du kannst hier später deine volle DB einsetzen)
  const EXERCISES = [
    { name:"Kniebeuge", type:"Mehrgelenkig", group:"Lower", desc:"Grundübung Beine" },
    { name:"Bankdrücken", type:"Mehrgelenkig", group:"Upper", desc:"Grundübung Brust" },
    { name:"Rudern", type:"Mehrgelenkig", group:"Upper", desc:"Rücken Fokus" },
    { name:"Split Squat", type:"Unilateral", group:"Lower", desc:"Unilateral Beine" },
    { name:"Plank", type:"Core", group:"Core", desc:"Core Stabilität" },
    { name:"Conditioning", type:"Conditioning", group:"Conditioning", desc:"Cardio/MetCon" },
    { name:"Komplex", type:"Komplexe", group:"Komplex", desc:"Komplexe Ausführung" },
    { name:"Jogging", type:"Joggen", group:"Jogging", desc:"Distanz + Zeit tracken" }
  ];

  window.IronQuestExercises = { EXERCISES };
})();
