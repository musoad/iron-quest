(() => {
  "use strict";

  // Empfohlene Sets/Reps + Typ für XP + Stat-Zuordnung
  const EXERCISES = [
    { name:"Kniebeuge", type:"Mehrgelenkig", recSets:4, recReps:6 },
    { name:"Bankdrücken", type:"Mehrgelenkig", recSets:4, recReps:6 },
    { name:"Kreuzheben", type:"Mehrgelenkig", recSets:3, recReps:5 },
    { name:"Schulterdrücken", type:"Mehrgelenkig", recSets:4, recReps:6 },

    { name:"Rudern", type:"Mehrgelenkig", recSets:4, recReps:8 },
    { name:"Klimmzüge", type:"Mehrgelenkig", recSets:4, recReps:6 },

    { name:"Split Squat", type:"Unilateral", recSets:3, recReps:10 },
    { name:"Bulgarian Split Squat", type:"Unilateral", recSets:3, recReps:10 },
    { name:"Einbein RDL", type:"Unilateral", recSets:3, recReps:10 },

    { name:"Plank", type:"Core", recSets:3, recReps:60 },          // Sekunden
    { name:"Hanging Leg Raises", type:"Core", recSets:3, recReps:10 },
    { name:"Ab Wheel", type:"Core", recSets:3, recReps:10 },

    { name:"AirBike", type:"Conditioning", recSets:1, recReps:20 }, // Minuten (Reps = min)
    { name:"Row Erg", type:"Conditioning", recSets:1, recReps:20 },
    { name:"Burpees", type:"Conditioning", recSets:5, recReps:10 },

    { name:"Komplex", type:"Komplexe", recSets:5, recReps:5 },

    { name:"Walking (NEAT)", type:"NEAT", recSets:1, recReps:30 }, // Minuten
    { name:"Jogging", type:"Joggen", recSets:1, recReps:30 }       // Minuten (eigener Tab)
  ];

  window.IronQuestExercises = { EXERCISES };
})();
