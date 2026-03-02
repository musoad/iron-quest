(() => {
  "use strict";

  // Types: Mehrgelenkig, Unilateral, Core, Conditioning, Komplexe, NEAT
  const EXERCISES = [
    { name:"Goblet Squat", type:"Mehrgelenkig", group:"Legs", recSets:4, recReps:8,
      description:"Setup: Kurzhantel vor die Brust, Füße schulterbreit.\n\nAusführung: Tief beugen, Knie stabil nach außen, Brust stolz.\n\nFokus: Kontrolle + volle ROM."},
    { name:"Rumänisches Kreuzheben (DB)", type:"Mehrgelenkig", group:"Legs", recSets:4, recReps:8,
      description:"Setup: DBs vor den Oberschenkeln, Rücken neutral.\n\nAusführung: Hüfte nach hinten, leichte Kniebeuge, bis Hamstrings spannen.\n\nFokus: Hüfte/Posterior Chain."},
    { name:"DB Floor Press", type:"Mehrgelenkig", group:"Push", recSets:4, recReps:8,
      description:"Setup: Rücken am Boden, DBs auf Brusthöhe.\n\nAusführung: Drücken, Ellbogen ~45°, Schulterblätter stabil.\n\nFokus: Brust/Trizeps, sauberer Lockout."},
    { name:"DB Bent Over Row", type:"Mehrgelenkig", group:"Pull", recSets:4, recReps:8,
      description:"Setup: Vorbeugen, Rücken neutral, DBs hängen.\n\nAusführung: Zur Hüfte rudern, Ellbogen nah, kurz halten.\n\nFokus: Lat + Rückenmitte."},

    { name:"Bulgarian Split Squat", type:"Unilateral", group:"Legs", recSets:3, recReps:10,
      description:"Setup: Hinteres Bein erhöht, Oberkörper aufrecht.\n\nAusführung: Langsam runter, aus der Ferse hoch.\n\nFokus: Beine/Glutes, Balance."},
    { name:"1-Arm DB Row", type:"Unilateral", group:"Pull", recSets:4, recReps:10,
      description:"Setup: Eine Hand stützt, Rücken gerade.\n\nAusführung: Ellbogen zur Hüfte, Lat spüren.\n\nFokus: Einseitige Stärke."},
    { name:"DB Shoulder Press", type:"Mehrgelenkig", group:"Push", recSets:4, recReps:8,
      description:"Setup: DBs auf Schulterhöhe, Core fest.\n\nAusführung: Überkopf drücken ohne Überstrecken.\n\nFokus: Schulterkraft + Stabilität."},
    { name:"DB Lateral Raise", type:"Unilateral", group:"Push", recSets:3, recReps:12,
      description:"Setup: Leichte DBs seitlich.\n\nAusführung: Bis Schulterhöhe, kein Schwung.\n\nFokus: Seitliche Schulter."},

    { name:"Plank", type:"Core", group:"Core", recSets:3, recReps:45,
      description:"Setup: Unterarme am Boden, Körper wie Brett.\n\nAusführung: Spannung halten, ruhig atmen.\n\nFokus: Anti-Extension Core."},
    { name:"Hollow Hold", type:"Core", group:"Core", recSets:3, recReps:30,
      description:"Setup: Rücken am Boden, Rippen runter.\n\nAusführung: Beine/Schultern heben, LWS bleibt am Boden.\n\nFokus: Core Spannung."},
    { name:"Side Plank", type:"Core", group:"Core", recSets:3, recReps:30,
      description:"Setup: Seitstütz, Schulter über Ellbogen.\n\nAusführung: Hüfte hoch, Linie halten.\n\nFokus: Schräge Bauchmuskeln."},

    { name:"DB Thrusters", type:"Komplexe", group:"Full", recSets:4, recReps:10,
      description:"Setup: DBs auf Schulterhöhe.\n\nAusführung: Squat → explosiv Press, fließend.\n\nFokus: Full Body + Conditioning."},
    { name:"DB Clean + Press", type:"Komplexe", group:"Full", recSets:5, recReps:5,
      description:"Setup: DBs am Boden oder hängend.\n\nAusführung: Explosiv hochziehen → Press.\n\nFokus: Power + Technik."},
    { name:"Renegade Row", type:"Komplexe", group:"Full", recSets:3, recReps:8,
      description:"Setup: Plank auf DBs.\n\nAusführung: Rudern ohne Hüfte zu drehen.\n\nFokus: Core + Rücken."},

    { name:"Burpees", type:"Conditioning", group:"End", recSets:5, recReps:10,
      description:"Setup: Stand.\n\nAusführung: Runter → Brust zum Boden → explosiv hoch.\n\nFokus: Puls + Ganzkörper."},
    { name:"Mountain Climbers", type:"Conditioning", group:"End", recSets:3, recReps:40,
      description:"Setup: Hohe Plank.\n\nAusführung: Knie schnell zur Brust, Core stabil.\n\nFokus: Ausdauer + Core."},

    { name:"Walking (Min)", type:"NEAT", group:"End", recSets:1, recReps:30,
      description:"Setup: Timer.\n\nAusführung: Zügig gehen.\n\nFokus: Alltag aktiv halten."}
  ];

  const TYPES = ["Mehrgelenkig","Unilateral","Core","Conditioning","Komplexe","NEAT"];

  window.IronQuestExercises = { EXERCISES, TYPES };
})();
