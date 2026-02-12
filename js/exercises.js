export const EXERCISE_TYPES = {
  Mehrgelenkig: { baseXP: 180, attr: "STR" },
  Unilateral:   { baseXP: 200, attr: "STA" },
  Core:         { baseXP: 140, attr: "MOB" },
  Conditioning: { baseXP: 240, attr: "END" },
  Komplexe:     { baseXP: 260, attr: "ALL" },
  NEAT:         { baseXP: 0,   attr: "END" },
  Rest:         { baseXP: 0,   attr: "MOB" },
};

export const EXERCISES = [
  // PUSH
  { name:"DB Floor Press (neutral)", type:"Mehrgelenkig", group:"Push", desc:"Brust/Trizeps, stabiler Druck auf dem Boden, schont Schulter.", rec:{ sets:"4–5", reps:"8–12" } },
  { name:"DB Bench Press", type:"Mehrgelenkig", group:"Push", desc:"Kurzhantel Bankdrücken (oder Boden), Fokus Brust + Trizeps.", rec:{ sets:"4–5", reps:"8–12" } },
  { name:"Arnold Press", type:"Mehrgelenkig", group:"Push", desc:"Schulterdrücken mit Rotation, vordere/seitliche Schulter.", rec:{ sets:"3–4", reps:"8–12" } },
  { name:"DB Overhead Press", type:"Mehrgelenkig", group:"Push", desc:"Schulterdrücken stehend/sitzend, Core stabil.", rec:{ sets:"3–5", reps:"6–10" } },
  { name:"Deficit Push-Ups", type:"Mehrgelenkig", group:"Push", desc:"Liegestütze auf Griffen/Büchern für mehr ROM.", rec:{ sets:"3–5", reps:"AMRAP 8–20" } },
  { name:"Close-Grip Push-Ups", type:"Mehrgelenkig", group:"Push", desc:"Enger Griff, mehr Trizeps-Fokus.", rec:{ sets:"3–4", reps:"AMRAP 8–20" } },
  { name:"Overhead Trizeps Extension", type:"Mehrgelenkig", group:"Push", desc:"Trizeps langes Kopf-Stretch, langsam ablassen.", rec:{ sets:"3–4", reps:"10–15" } },
  { name:"DB Skull Crushers (Floor)", type:"Mehrgelenkig", group:"Push", desc:"Trizeps-Isolationspress, Ellbogen stabil.", rec:{ sets:"3–4", reps:"10–15" } },
  { name:"DB Lateral Raises", type:"Mehrgelenkig", group:"Push", desc:"Seitheben, kontrolliert, oben kurz halten.", rec:{ sets:"3–4", reps:"12–20" } },

  // PULL
  { name:"1-Arm DB Row (Pause oben)", type:"Unilateral", group:"Pull", desc:"Einarmiges Rudern, oben 1s Pause → Rücken/Lat.", rec:{ sets:"4", reps:"8–12/Seite" } },
  { name:"Renegade Rows", type:"Unilateral", group:"Pull", desc:"Plank-Rudern, Core + Rücken, langsam ohne Hüftrotation.", rec:{ sets:"3–4", reps:"6–10/Seite" } },
  { name:"Reverse Flys (langsam)", type:"Mehrgelenkig", group:"Pull", desc:"Hintere Schulter, 2–3s exzentrisch.", rec:{ sets:"3–4", reps:"12–20" } },
  { name:"DB Pullover", type:"Mehrgelenkig", group:"Pull", desc:"Lat/Brustkorb Dehnung, Schulter stabil.", rec:{ sets:"3–4", reps:"10–15" } },
  { name:"Cross-Body Hammer Curl", type:"Mehrgelenkig", group:"Pull", desc:"Bizeps/Brachialis, neutraler Griff.", rec:{ sets:"3–4", reps:"10–14" } },
  { name:"DB Supinated Curl", type:"Mehrgelenkig", group:"Pull", desc:"Klassischer Curl, langsam ablassen.", rec:{ sets:"3–4", reps:"8–12" } },
  { name:"Farmer’s Carry (DB)", type:"Unilateral", group:"Pull", desc:"Carry, Griff/Traps/Core, aufrecht gehen.", rec:{ sets:"2–3", reps:"30–60s" } },

  // LEGS + CORE
  { name:"Bulgarian Split Squats", type:"Unilateral", group:"Legs", desc:"Split Squat, Quads/Glute, volle Kontrolle.", rec:{ sets:"4", reps:"8–12/Seite" } },
  { name:"DB Romanian Deadlift", type:"Mehrgelenkig", group:"Legs", desc:"Hip Hinge, Hamstrings/Glute, Rücken neutral.", rec:{ sets:"4–5", reps:"6–10" } },
  { name:"Goblet Squat", type:"Mehrgelenkig", group:"Legs", desc:"Squat mit DB vor Brust, Knie sauber tracken.", rec:{ sets:"4–5", reps:"8–12" } },
  { name:"Cossack Squats", type:"Unilateral", group:"Legs", desc:"Seitliche Kniebeuge, Adduktoren/Hüfte Mobilität.", rec:{ sets:"3", reps:"6–10/Seite" } },
  { name:"Hip Thrust (Floor)", type:"Mehrgelenkig", group:"Legs", desc:"Glute Fokus, oben 1s halten.", rec:{ sets:"4", reps:"10–15" } },
  { name:"Side Plank + Leg Raise", type:"Core", group:"Core", desc:"Laterale Kette + Glute Med.", rec:{ sets:"3–4", reps:"30–45s/Seite" } },
  { name:"Dead Bug", type:"Core", group:"Core", desc:"Rumpfspannung, LWS neutral.", rec:{ sets:"3–4", reps:"8–12/Seite" } },
  { name:"Hamstring Walkouts", type:"Core", group:"Core", desc:"Posterior Chain, kontrolliert raus/ rein.", rec:{ sets:"3", reps:"8–12" } },

  // COMPLEX / FULLBODY
  { name:"Komplex: Deadlift", type:"Komplexe", group:"Complex", desc:"Komplex-Teil: Hip Hinge, Technik > Tempo.", rec:{ sets:"5–6 Runden", reps:"6" } },
  { name:"Komplex: Clean", type:"Komplexe", group:"Complex", desc:"Komplex-Teil: explosiv, stabiler Catch.", rec:{ sets:"5–6 Runden", reps:"6" } },
  { name:"Komplex: Front Squat", type:"Komplexe", group:"Complex", desc:"Komplex-Teil: Front-Rack, Brust aufrecht.", rec:{ sets:"5–6 Runden", reps:"6" } },
  { name:"Komplex: Push Press", type:"Komplexe", group:"Complex", desc:"Komplex-Teil: Dip-Drive, kontrolliert.", rec:{ sets:"5–6 Runden", reps:"6" } },
  { name:"DB Thrusters", type:"Komplexe", group:"Complex", desc:"Squat to Press, hochintensiv.", rec:{ sets:"4–6", reps:"8–12" } },
  { name:"Plank Shoulder Taps", type:"Core", group:"Core", desc:"Anti-Rotation, langsam tippen.", rec:{ sets:"3–4", reps:"20–40" } },

  // CONDITIONING
  { name:"Burpees", type:"Conditioning", group:"Conditioning", desc:"Ganzkörper, Pace konstant halten.", rec:{ sets:"5–6 Runden", reps:"30–45s" } },
  { name:"Mountain Climbers", type:"Conditioning", group:"Conditioning", desc:"Core + Puls, Hüfte ruhig.", rec:{ sets:"5–6 Runden", reps:"30–45s" } },
  { name:"High Knees", type:"Conditioning", group:"Conditioning", desc:"Knie hoch, auf Vorfuß, schnell.", rec:{ sets:"5–6 Runden", reps:"30–45s" } },
  { name:"Jumping Jacks", type:"Conditioning", group:"Conditioning", desc:"Einfacher Cardio-Booster.", rec:{ sets:"5–6 Runden", reps:"30–45s" } },
  { name:"Russian Twists (DB)", type:"Core", group:"Core", desc:"Rotation kontrolliert, LWS stabil.", rec:{ sets:"3–4", reps:"20–40" } },
  { name:"Hollow Body Hold", type:"Core", group:"Core", desc:"Rumpfspannung, Rücken flach.", rec:{ sets:"3–4", reps:"30–60s" } },

  // NEAT
  { name:"Walking (NEAT)", type:"NEAT", group:"NEAT", desc:"Spaziergang/Desk Walking. Minuten zählen.", rec:{ sets:"—", reps:"30–90 Min" } },

  // REST
  { name:"Recovery + Mobility", type:"Rest", group:"Rest", desc:"10–20 Min Mobility + optional Spaziergang.", rec:{ sets:"—", reps:"10–20 Min" } },
];

export function getExercise(name) {
  return EXERCISES.find(e => e.name === name) || null;
}

export function listExerciseNames() {
  return EXERCISES.map(e => e.name);
}
