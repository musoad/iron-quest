(() => {
  "use strict";

  const TRAINING_PLAN = {
    days: {
      1: { name:"Lower + Core (Gate: Iron Legs)" },
      2: { name:"Push (Gate: Crimson Chest)" },
      3: { name:"Pull (Gate: Shadow Back)" },
      4: { name:"Core + Conditioning (Gate: Abyss)" },
      5: { name:"Full Body Komplex (Gate: Monarch Trial)" }
    }
  };

  const EXERCISES = [
    // DAY 1
    { name:"Goblet Squat", day:1, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Setup:\nDB vor der Brust (Goblet), Füße schulterbreit.\n\nAusführung:\nTief beugen, Knie nach außen, Brust stolz.\n\nFokus:\nQuadrizeps, Glutes, Core." },
    { name:"Rumänisches Kreuzheben (DB)", day:1, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Setup:\nDB in den Händen, Hüftbreiter Stand.\n\nAusführung:\nHüfte nach hinten, Rücken neutral, Dehnung Hamstrings.\n\nFokus:\nHamstrings, Glutes, Rückenstrecker." },
    { name:"Bulgarian Split Squat", day:1, type:"Unilateral", recSets:3, recReps:10,
      description:"Setup:\nHinteres Bein erhöht, Oberkörper aufrecht.\n\nAusführung:\nLangsam runter, vorderes Knie stabil, aus der Ferse hoch.\n\nFokus:\nEinbein-Kraft, Stabilität." },
    { name:"Plank", day:1, type:"Core", recSets:3, recReps:45,
      description:"Setup:\nUnterarme am Boden, Körper in Linie.\n\nAusführung:\nBauch fest, Po anspannen, ruhig atmen.\n\nFokus:\nRumpfspannung." },
    { name:"Side Plank", day:1, type:"Core", recSets:3, recReps:30,
      description:"Setup:\nSeitstütz, Ellbogen unter Schulter.\n\nAusführung:\nHüfte hoch, Körper in Linie, nicht kippen.\n\nFokus:\nSeitliche Core-Kette." },

    // DAY 2
    { name:"DB Floor Press", day:2, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Setup:\nRücken am Boden, DB über Brust.\n\nAusführung:\nKontrolliert drücken, Ellbogen ~45°, oben kurz halten.\n\nFokus:\nBrust, Trizeps." },
    { name:"DB Shoulder Press", day:2, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Setup:\nSitzend/stehend, DB auf Schulterhöhe.\n\nAusführung:\nÜberkopf drücken, Core fest, keine Überstreckung.\n\nFokus:\nSchulter, Trizeps." },
    { name:"DB Lateral Raise", day:2, type:"Unilateral", recSets:3, recReps:12,
      description:"Setup:\nLeichte DB, Arme seitlich.\n\nAusführung:\nBis Schulterhöhe heben, Kontrolle, kein Schwung.\n\nFokus:\nSeitliche Schulter." },
    { name:"Push Ups", day:2, type:"Mehrgelenkig", recSets:3, recReps:12,
      description:"Setup:\nHände unter Schulter, Körper wie Brett.\n\nAusführung:\nBrust knapp Boden, sauber hoch.\n\nFokus:\nBrust, Trizeps, Core." },

    // DAY 3
    { name:"DB Bent Over Row", day:3, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Setup:\nHüfte nach hinten, Rücken neutral.\n\nAusführung:\nZur Hüfte rudern, Schulterblätter zusammen.\n\nFokus:\nLat, Rückenmitte." },
    { name:"1-Arm DB Row", day:3, type:"Unilateral", recSets:4, recReps:10,
      description:"Setup:\nEine Hand abstützen, Rücken stabil.\n\nAusführung:\nEllbogen zur Hüfte, Pause oben.\n\nFokus:\nLat, Asymmetrie-Ausgleich." },
    { name:"DB Reverse Fly", day:3, type:"Unilateral", recSets:3, recReps:12,
      description:"Setup:\nLeichtes Gewicht, leichte Beugung.\n\nAusführung:\nArme nach außen, hintere Schulter spüren.\n\nFokus:\nRear Delts, Haltung." },
    { name:"DB Hammer Curl", day:3, type:"Unilateral", recSets:3, recReps:10,
      description:"Setup:\nNeutraler Griff, Ellbogen nah.\n\nAusführung:\nKontrolliert hoch/runter.\n\nFokus:\nBizeps/Brachialis." },

    // DAY 4
    { name:"DB Thrusters", day:4, type:"Komplexe", recSets:4, recReps:10,
      description:"Setup:\nDB an Schultern, stabiler Stand.\n\nAusführung:\nSquat → explosiv Press, Rhythmus halten.\n\nFokus:\nGanzkörper, Leistung." },
    { name:"Mountain Climbers", day:4, type:"Conditioning", recSets:3, recReps:40,
      description:"Setup:\nPlank Position.\n\nAusführung:\nKnie schnell zur Brust, Hüfte stabil.\n\nFokus:\nCardio + Core." },
    { name:"Russian Twists (DB optional)", day:4, type:"Core", recSets:3, recReps:20,
      description:"Setup:\nSitz, Oberkörper leicht zurück.\n\nAusführung:\nRotation kontrolliert, nicht nur Arme.\n\nFokus:\nObliques." },

    // DAY 5
    { name:"DB Clean + Press", day:5, type:"Komplexe", recSets:5, recReps:5,
      description:"Setup:\nDB vor dir, Core fest.\n\nAusführung:\nExplosiv hochziehen → über Kopf drücken.\n\nFokus:\nPower, Skill." },
    { name:"DB Renegade Row", day:5, type:"Komplexe", recSets:3, recReps:8,
      description:"Setup:\nPlank auf DB, Füße breit.\n\nAusführung:\nRudern ohne Hüftkippen.\n\nFokus:\nCore + Rücken." },

    // Special
    { name:"Walking (NEAT)", day:0, type:"NEAT", recSets:1, recReps:30,
      description:"Setup:\nSchuhe an.\n\nAusführung:\nWalk 30 Minuten (Reps = Minuten).\n\nFokus:\nAlltag, Regeneration." },
    { name:"Jogging", day:0, type:"Joggen", recSets:1, recReps:30,
      description:"Nutze den Run Tab.\n\nDistanz + Zeit → Pace + XP." }
  ];

  window.IronQuestExercises = { TRAINING_PLAN, EXERCISES };
})();
