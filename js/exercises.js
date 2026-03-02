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
      description:"DB vor Brust, tief beugen, Knie stabil nach außen, Brust stolz." },
    { name:"DB Front Squat", day:1, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"2 DB vorne an Schultern, aufrecht, kontrolliert." },
    { name:"Rumänisches Kreuzheben (DB)", day:1, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Hüfte nach hinten, Rücken neutral, Dehnung Hamstrings." },
    { name:"DB Hip Thrust / Glute Bridge", day:1, type:"Mehrgelenkig", recSets:4, recReps:10,
      description:"DB auf Hüfte, Po oben hart anspannen, 1s halten." },
    { name:"Bulgarian Split Squat", day:1, type:"Unilateral", recSets:3, recReps:10,
      description:"Hinteres Bein erhöht, langsam runter, aus der Ferse hoch." },
    { name:"Reverse Lunge (DB)", day:1, type:"Unilateral", recSets:3, recReps:10,
      description:"Schritt zurück, vorderes Knie stabil, kontrolliert." },
    { name:"Calf Raises (DB)", day:1, type:"Unilateral", recSets:3, recReps:15,
      description:"Langsam hoch, oben 1s halten, volle ROM." },
    { name:"Plank", day:1, type:"Core", recSets:3, recReps:45,
      description:"Gerade Linie, Bauch fest, Po anspannen (Sekunden)." },
    { name:"Side Plank", day:1, type:"Core", recSets:3, recReps:30,
      description:"Seitstütz, Hüfte hoch, Schulter stabil (Sekunden)." },

    // DAY 2
    { name:"DB Floor Press", day:2, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Am Boden drücken, Ellbogen ~45°, Schulterblätter stabil." },
    { name:"Push Ups", day:2, type:"Mehrgelenkig", recSets:3, recReps:12,
      description:"Körper wie Brett, Brust knapp Boden, sauber drücken." },
    { name:"DB Shoulder Press", day:2, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Überkopf drücken, Core fest, keine Überstreckung." },
    { name:"Arnold Press (DB)", day:2, type:"Komplexe", recSets:3, recReps:10,
      description:"Rotation + Press, kontrolliert." },
    { name:"DB Lateral Raise", day:2, type:"Unilateral", recSets:3, recReps:12,
      description:"Seitlich bis Schulterhöhe, kein Schwung." },
    { name:"Overhead Triceps Extension (DB)", day:2, type:"Unilateral", recSets:3, recReps:12,
      description:"DB über Kopf, Ellbogen stabil, langsam." },

    // DAY 3
    { name:"DB Bent Over Row", day:3, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Vorgebeugt, Rücken neutral, zur Hüfte rudern." },
    { name:"1-Arm DB Row", day:3, type:"Unilateral", recSets:4, recReps:10,
      description:"Einarmig, Ellbogen zur Hüfte, Lat spüren." },
    { name:"DB Reverse Fly", day:3, type:"Unilateral", recSets:3, recReps:12,
      description:"Leicht, hintere Schulter, kontrolliert." },
    { name:"DB Pullover (Boden)", day:3, type:"Komplexe", recSets:3, recReps:10,
      description:"Arme über Kopf, Lat/Brust Dehnung, Core stabil." },
    { name:"DB Hammer Curl", day:3, type:"Unilateral", recSets:3, recReps:10,
      description:"Neutraler Griff, Ellbogen nah." },
    { name:"Hollow Hold", day:3, type:"Core", recSets:3, recReps:30,
      description:"LWS am Boden, Spannung halten (Sekunden)." },

    // DAY 4
    { name:"DB Thrusters", day:4, type:"Komplexe", recSets:4, recReps:10,
      description:"Squat → explosiv Press, flüssig, sauber." },
    { name:"Burpees", day:4, type:"Conditioning", recSets:5, recReps:10,
      description:"Brust zum Boden, explosiv hoch, Rhythmus." },
    { name:"Mountain Climbers", day:4, type:"Conditioning", recSets:3, recReps:40,
      description:"Schnell, Core stabil, Schultern über Händen." },
    { name:"Russian Twists (DB optional)", day:4, type:"Core", recSets:3, recReps:20,
      description:"Rotation aus dem Oberkörper, kontrolliert." },
    { name:"Leg Raises", day:4, type:"Core", recSets:3, recReps:12,
      description:"Beine heben, LWS am Boden, langsam ablassen." },

    // DAY 5
    { name:"DB Clean + Press", day:5, type:"Komplexe", recSets:5, recReps:5,
      description:"Explosiv hochziehen → über Kopf drücken." },
    { name:"DB Renegade Row", day:5, type:"Komplexe", recSets:3, recReps:8,
      description:"Plank + Rudern, Hüfte stabil." },
    { name:"DB Squat to Row", day:5, type:"Komplexe", recSets:4, recReps:10,
      description:"Squat → beim Hochkommen rudern." },
    { name:"Suitcase Deadlift (1 DB)", day:5, type:"Unilateral", recSets:3, recReps:10,
      description:"1 DB seitlich, Anti-Tilt Core, sauberer Deadlift." },
    { name:"Farmer Hold (on the spot)", day:5, type:"Conditioning", recSets:4, recReps:40,
      description:"DB halten, aufrecht, Core fest (Sekunden)." },

    // Special
    { name:"Walking (NEAT)", day:0, type:"NEAT", recSets:1, recReps:30,
      description:"30 Minuten Walken (Reps = Minuten)." },
    { name:"Jogging", day:0, type:"Joggen", recSets:1, recReps:30,
      description:"Nutze den Jogging Tab (Distanz + Zeit)." }
  ];

  window.IronQuestExercises = { TRAINING_PLAN, EXERCISES };
})();
