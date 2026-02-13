// js/exercises.js ✅
// Übungen (mit Beschreibung) + Typ (für XP/Attribute) + Empfehlungen

(function () {
  const EX = [
    // PUSH
    { name: "DB Floor Press (neutral)", type: "Mehrgelenkig", desc: "Brust/Trizeps. Stabil, sicher am Boden.", rec: { sets: 4, reps: 8 } },
    { name: "DB Bench Press (Floor alt)", type: "Mehrgelenkig", desc: "Brust-Fokus. Alternative zum Floor Press.", rec: { sets: 4, reps: 10 } },
    { name: "Arnold Press", type: "Mehrgelenkig", desc: "Schulter komplett. Kontrolle & ROM.", rec: { sets: 4, reps: 10 } },
    { name: "DB Overhead Press", type: "Mehrgelenkig", desc: "Schulter/Trizeps. Core stabil halten.", rec: { sets: 4, reps: 8 } },
    { name: "Deficit Push-Ups", type: "Mehrgelenkig", desc: "Brust/Trizeps. Mehr ROM durch Erhöhung.", rec: { sets: 3, reps: 12 } },
    { name: "Close-Grip Push-Ups", type: "Mehrgelenkig", desc: "Trizeps-lastig. Ellbogen eng.", rec: { sets: 3, reps: 12 } },
    { name: "Overhead Trizeps Extension", type: "Mehrgelenkig", desc: "Trizeps langer Kopf. Sauberer Stretch.", rec: { sets: 3, reps: 12 } },
    { name: "DB Skull Crushers (Floor)", type: "Mehrgelenkig", desc: "Trizeps. Schulter ruhig, Ellbogen fix.", rec: { sets: 3, reps: 10 } },
    { name: "DB Lateral Raises", type: "Mehrgelenkig", desc: "Seitliche Schulter. Langsam ablassen.", rec: { sets: 3, reps: 15 } },

    // PULL
    { name: "1-Arm DB Row (Pause oben)", type: "Unilateral", desc: "Rücken/Lat. Oben 1s halten.", rec: { sets: 4, reps: 10 } },
    { name: "1-Arm DB Row (Elbow close)", type: "Unilateral", desc: "Lat-Fokus. Ellbogen nah am Körper.", rec: { sets: 4, reps: 12 } },
    { name: "Renegade Rows", type: "Unilateral", desc: "Rücken + Core Anti-Rotation.", rec: { sets: 3, reps: 8 } },
    { name: "Reverse Flys (langsam)", type: "Mehrgelenkig", desc: "Rear Delt/Upper Back. Kontrolle.", rec: { sets: 3, reps: 15 } },
    { name: "DB Pullover (Floor)", type: "Mehrgelenkig", desc: "Lat/Brustkorb. Saubere ROM.", rec: { sets: 3, reps: 12 } },
    { name: "Cross-Body Hammer Curl", type: "Mehrgelenkig", desc: "Bizeps/Brachialis. Neutraler Griff.", rec: { sets: 3, reps: 12 } },
    { name: "DB Supinated Curl", type: "Mehrgelenkig", desc: "Bizeps. Ellbogen ruhig.", rec: { sets: 3, reps: 10 } },
    { name: "Farmer’s Carry (DB)", type: "Unilateral", desc: "Grip/Traps/Core. Aufrecht gehen.", rec: { sets: 3, reps: 40 } }, // reps = Sekunden

    // LEGS + CORE
    { name: "Bulgarian Split Squats", type: "Unilateral", desc: "Quads/Glute. Knie trackt sauber.", rec: { sets: 4, reps: 8 } },
    { name: "DB Romanian Deadlift", type: "Mehrgelenkig", desc: "Hamstrings/Glute. Hüfte nach hinten.", rec: { sets: 4, reps: 10 } },
    { name: "Goblet Squat", type: "Mehrgelenkig", desc: "Quads/Glute. Brust hoch, tief.", rec: { sets: 4, reps: 12 } },
    { name: "Cossack Squats", type: "Unilateral", desc: "Adduktoren/Hip Mobility.", rec: { sets: 3, reps: 8 } },
    { name: "Hip Thrust (Floor)", type: "Mehrgelenkig", desc: "Glute. Oben 1s halten.", rec: { sets: 4, reps: 12 } },
    { name: "Side Plank + Leg Raise", type: "Core", desc: "Core + Glute Med. Stabilität.", rec: { sets: 3, reps: 30 } }, // reps = Sekunden
    { name: "Dead Bug", type: "Core", desc: "Anti-Extension, Rücken flach.", rec: { sets: 3, reps: 12 } },
    { name: "Hamstring Walkouts", type: "Core", desc: "Posterior Chain. Kontrolliert!", rec: { sets: 3, reps: 10 } },
    { name: "Standing DB Calf Raises", type: "Core", desc: "Wade. Oben kurz halten.", rec: { sets: 4, reps: 20 } },

    // FULL BODY / COMPLEX
    { name: "Komplex: Deadlift", type: "Komplexe", desc: "Komplex-Teil. Saubere Technik.", rec: { sets: 5, reps: 6 } },
    { name: "Komplex: Clean", type: "Komplexe", desc: "Explosiv. Kein Rücken rund.", rec: { sets: 5, reps: 6 } },
    { name: "Komplex: Front Squat", type: "Komplexe", desc: "Front Rack. Core hart.", rec: { sets: 5, reps: 6 } },
    { name: "Komplex: Push Press", type: "Komplexe", desc: "Dip/Drive. Lockout stabil.", rec: { sets: 5, reps: 6 } },
    { name: "DB Thrusters", type: "Komplexe", desc: "Fullbody. Atmung managen.", rec: { sets: 5, reps: 10 } },
    { name: "Goblet Squat Hold", type: "Core", desc: "Bracing. Tiefe Position halten.", rec: { sets: 3, reps: 40 } }, // Sekunden
    { name: "Plank Shoulder Taps", type: "Core", desc: "Anti-Rotation. Hüfte ruhig.", rec: { sets: 3, reps: 20 } },

    // CONDITIONING
    { name: "Burpees", type: "Conditioning", desc: "Metcon. Pace konstant.", rec: { sets: 5, reps: 30 } }, // Sekunden Arbeit
    { name: "Mountain Climbers", type: "Conditioning", desc: "Core + Engine. Schnell, sauber.", rec: { sets: 5, reps: 30 } },
    { name: "High Knees", type: "Conditioning", desc: "Herzfrequenz hoch. Haltung.", rec: { sets: 5, reps: 30 } },
    { name: "Jumping Jacks", type: "Conditioning", desc: "Low impact, Rhythmus.", rec: { sets: 5, reps: 45 } },
    { name: "Russian Twists (DB)", type: "Core", desc: "Rotation kontrolliert.", rec: { sets: 3, reps: 20 } },
    { name: "Hollow Body Hold", type: "Core", desc: "Core isometrisch. Rücken flach.", rec: { sets: 3, reps: 30 } },

    // NEAT + REST
    { name: "Walking Desk (Laufband 3 km/h)", type: "NEAT", desc: "NEAT / Schritte. Minuten zählen.", rec: { sets: 0, reps: 60 } }, // reps = Minuten
    { name: "Ruhetag (Recovery + Mobility)", type: "Rest", desc: "Recovery: Mobility + Spaziergang.", rec: { sets: 0, reps: 20 } }
  ];

  window.IronQuestExercises = {
    list: EX,
    getByName(name) { return EX.find(e => e.name === name) || null; },
    types() { return [...new Set(EX.map(e => e.type))]; }
  };
})();
