(() => {
  "use strict";

  const EXERCISES = [
    { name:"Jumping Jacks", type:"NEAT", muscleGroup:"Warm-up", subGroup:"Ganzkörper", equipment:"Ohne", difficulty:1, baseXP:6, recSets:1, recReps:20,
      description:"Warm-up: 20 Jumping Jacks zum Aktivieren von Kreislauf und Ganzkörper." },
    { name:"Air Squats", type:"NEAT", muscleGroup:"Warm-up", subGroup:"Unterkörper", equipment:"Ohne", difficulty:1, baseXP:6, recSets:1, recReps:10,
      description:"Warm-up: 10 Air Squats zur Aktivierung von Quadrizeps und Glutes." },
    { name:"Hip Hinges", type:"NEAT", muscleGroup:"Warm-up", subGroup:"Unterkörper", equipment:"Ohne", difficulty:1, baseXP:6, recSets:1, recReps:10,
      description:"Warm-up: 10 Hip Hinges für Hüfte und hintere Kette." },
    { name:"Armkreisen", type:"NEAT", muscleGroup:"Warm-up", subGroup:"Oberkörper", equipment:"Ohne", difficulty:1, baseXP:5, recSets:1, recReps:10,
      description:"Warm-up: 10 Armkreisen pro Richtung für Schulterbeweglichkeit." },
    { name:"Ausfallschritte", type:"NEAT", muscleGroup:"Warm-up", subGroup:"Unterkörper", equipment:"Ohne", difficulty:1, baseXP:6, recSets:1, recReps:10,
      description:"Warm-up: 10 Ausfallschritte für Stabilität, Balance und Hüftöffnung." },

    { name:"Bulgarian Split Squat", type:"Unilateral", muscleGroup:"Unterkörper", subGroup:"Quadrizeps / Glutes", equipment:"Kurzhanteln", difficulty:5, baseXP:24, recSets:4, recReps:10,
      description:"Montag Unterkörper A: 4×8–10. Kontrolliert absenken, stabil hochdrücken." },
    { name:"Romanian Deadlift", type:"Mehrgelenkig", muscleGroup:"Unterkörper", subGroup:"Hamstrings / Glutes", equipment:"Kurzhanteln", difficulty:4, baseXP:26, recSets:4, recReps:10,
      description:"Montag Unterkörper A: 4×8–10. Hüfte weit nach hinten, Rücken neutral." },
    { name:"Goblet Squat", type:"Mehrgelenkig", muscleGroup:"Unterkörper", subGroup:"Quadrizeps", equipment:"Kurzhanteln", difficulty:4, baseXP:24, recSets:4, recReps:10,
      description:"Unterkörper A/B: 3–4×8–12. Hantel vor der Brust, tiefe saubere Kniebeuge." },
    { name:"Hip Thrust", type:"Mehrgelenkig", muscleGroup:"Unterkörper", subGroup:"Glutes", equipment:"Kurzhanteln", difficulty:3, baseXP:22, recSets:3, recReps:12,
      description:"Unterkörper A/B: 3×10–12. Oben kurz halten, Glutes aktiv anspannen." },
    { name:"Plank", type:"Core", muscleGroup:"Core", subGroup:"Anterior Core", equipment:"Ohne", difficulty:3, baseXP:16, recSets:3, recReps:60,
      description:"Montag Finish: 3×45–60 s. Gerade Linie halten, Bauch fest." },

    { name:"Dumbbell Row", type:"Mehrgelenkig", muscleGroup:"Oberkörper", subGroup:"Rücken", equipment:"Kurzhanteln", difficulty:4, baseXP:24, recSets:4, recReps:12,
      description:"Dienstag Oberkörper A: 4×8–12. Schulterblatt kontrolliert nach hinten ziehen." },
    { name:"Push-ups", type:"Mehrgelenkig", muscleGroup:"Oberkörper", subGroup:"Brust", equipment:"Ohne", difficulty:3, baseXP:20, recSets:4, recReps:12,
      description:"Oberkörper A/B: 3–4 Sätze nahe Muskelversagen mit sauberer Körperspannung." },
    { name:"Shoulder Press", type:"Mehrgelenkig", muscleGroup:"Oberkörper", subGroup:"Schultern", equipment:"Kurzhanteln", difficulty:4, baseXP:22, recSets:3, recReps:10,
      description:"Oberkörper A/B: 3×8–10. Überkopf drücken ohne Hohlkreuz." },
    { name:"Renegade Row", type:"Komplexe", muscleGroup:"Oberkörper", subGroup:"Rücken / Core", equipment:"Kurzhanteln", difficulty:5, baseXP:26, recSets:4, recReps:10,
      description:"Oberkörper A/B: 3–4×8–10. Rudern aus der Plank mit ruhiger Hüfte." },
    { name:"Side Plank", type:"Core", muscleGroup:"Core", subGroup:"Obliques", equipment:"Ohne", difficulty:3, baseXP:16, recSets:3, recReps:40,
      description:"Dienstag Oberkörper A: 3×30–40 s Seitstütz sauber halten." },
    { name:"Seitheben", type:"Unilateral", muscleGroup:"Oberkörper", subGroup:"Schultern", equipment:"Kurzhanteln", difficulty:2, baseXP:14, recSets:3, recReps:15,
      description:"Optional Oberkörper A: 3×12–15 für seitliche Schulter." },

    { name:"Single-Leg Romanian Deadlift", type:"Unilateral", muscleGroup:"Unterkörper", subGroup:"Hamstrings / Glutes", equipment:"Kurzhanteln", difficulty:5, baseXP:23, recSets:3, recReps:10,
      description:"Donnerstag Unterkörper B: 3×10. Balance halten, Hüfte sauber nach hinten." },
    { name:"Reverse Lunge", type:"Unilateral", muscleGroup:"Unterkörper", subGroup:"Quadrizeps / Glutes", equipment:"Kurzhanteln", difficulty:4, baseXP:22, recSets:3, recReps:10,
      description:"Donnerstag Unterkörper B: 3×10 je Seite. Kontrolliert zurück und hoch." },
    { name:"Hollow Hold", type:"Core", muscleGroup:"Core", subGroup:"Anterior Core", equipment:"Ohne", difficulty:4, baseXP:18, recSets:3, recReps:40,
      description:"Donnerstag Unterkörper B: 3×30–40 s. Rücken flach am Boden halten." },
    { name:"Calf Raises", type:"Unilateral", muscleGroup:"Unterkörper", subGroup:"Waden", equipment:"Ohne", difficulty:2, baseXP:12, recSets:3, recReps:20,
      description:"Optional Unterkörper B: 3×15–20 mit voller Bewegungsamplitude." },

    { name:"Floor Press (Kurzhantel)", type:"Mehrgelenkig", muscleGroup:"Oberkörper", subGroup:"Brust", equipment:"Kurzhanteln", difficulty:4, baseXP:24, recSets:4, recReps:10,
      description:"Freitag Oberkörper B: 4×8–10. Kräftiger Brust-/Trizeps-Press vom Boden." },
    { name:"Russian Twist", type:"Core", muscleGroup:"Core", subGroup:"Rotation", equipment:"Ohne", difficulty:3, baseXP:15, recSets:3, recReps:20,
      description:"Freitag Oberkörper B: 3×20. Kontrollierte Rotation mit Spannung im Bauch." },
    { name:"Farmer Carry", type:"Conditioning", muscleGroup:"Oberkörper", subGroup:"Grip / Core", equipment:"Kurzhanteln", difficulty:3, baseXP:18, recSets:3, recReps:40,
      description:"Optional Oberkörper B: 3×30–40 s schwer tragen, Rumpf fest." },

    { name:"Joggen Intervall 4×4", type:"Conditioning", muscleGroup:"Laufen", subGroup:"Intervall", equipment:"Ohne", difficulty:4, baseXP:24, recSets:4, recReps:4,
      description:"Montag VO₂max: 10 Minuten einlaufen, 4×4 Minuten schnell mit 2 Minuten locker, 5 Minuten auslaufen." },
    { name:"Joggen locker Zone 2", type:"Conditioning", muscleGroup:"Laufen", subGroup:"Locker", equipment:"Ohne", difficulty:2, baseXP:20, recSets:1, recReps:40,
      description:"Mittwoch: 30–45 Minuten locker. Du kannst noch sprechen ohne außer Atem zu sein." },
    { name:"Lockerer Lauf", type:"Conditioning", muscleGroup:"Laufen", subGroup:"Optional", equipment:"Ohne", difficulty:1, baseXP:14, recSets:1, recReps:25,
      description:"Samstag optional: 20–30 Minuten lockeres Joggen zur aktiven Regeneration." },
    { name:"Mobility / Dehnen", type:"NEAT", muscleGroup:"Recovery", subGroup:"Mobility", equipment:"Ohne", difficulty:1, baseXP:8, recSets:1, recReps:20,
      description:"Samstag optional: Mobility oder Dehnen für Recovery und Beweglichkeit." }
  ];

  const MUSCLE_GROUPS = Array.from(new Set(EXERCISES.map(e => e.muscleGroup))).sort();
  const SUB_GROUPS = Array.from(new Set(EXERCISES.map(e => `${e.muscleGroup}|||${e.subGroup}`))).sort();

  function byGroup(){
    const map = {};
    for(const e of EXERCISES){
      const k = `${e.muscleGroup}|||${e.subGroup}`;
      map[k] = map[k] || [];
      map[k].push(e);
    }
    for(const k of Object.keys(map)) map[k].sort((a,b)=>a.name.localeCompare(b.name));
    return map;
  }

  function list(){ return EXERCISES.slice(); }
  function findByName(name){ return EXERCISES.find(e => e.name === name) || null; }

  window.IronQuestExercises = {
    EXERCISES,
    TYPES:["Mehrgelenkig","Unilateral","Core","Conditioning","Komplexe","NEAT"],
    MUSCLE_GROUPS,
    SUB_GROUPS,
    byGroup,
    list,
    findByName
  };
})();
