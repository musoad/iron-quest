/* =========================
   IRON QUEST v4 PRO — exercises.js
   ✅ Alle Übungen + Kurzbeschreibung
   ✅ Typ / Gruppe / Kategorie
   ✅ Empfohlene Sets/Reps (Basis)
   ========================= */

(function () {
  window.IQ = window.IQ || {};

  // Übungstypen: "Mehrgelenkig" | "Unilateral" | "Core" | "Conditioning" | "Komplexe" | "NEAT" | "Rest"
  const EXERCISES = [
    // ========= PUSH =========
    {
      id: "db_floor_press_neutral",
      name: "DB Floor Press (neutral)",
      type: "Mehrgelenkig",
      group: "Tag 1 – Push",
      cat: "Brust/Trizeps",
      desc: "Kurzhantel-Bankdrücken am Boden. Stabil, schulterfreundlich, Fokus Brust/Trizeps.",
      rec: { sets: 4, reps: 10 }
    },
    {
      id: "db_bench_press_floor_alt",
      name: "DB Bench Press (Floor alt)",
      type: "Mehrgelenkig",
      group: "Tag 1 – Push",
      cat: "Brust/Trizeps",
      desc: "Variante vom Press am Boden. Saubere ROM, kontrollierte Exzentrik.",
      rec: { sets: 4, reps: 10 }
    },
    {
      id: "arnold_press",
      name: "Arnold Press",
      type: "Mehrgelenkig",
      group: "Tag 1 – Push",
      cat: "Schulter",
      desc: "Rotationsdrücken. Sehr gut für vordere/seitliche Schulter, langsam kontrollieren.",
      rec: { sets: 4, reps: 10 }
    },
    {
      id: "db_overhead_press",
      name: "DB Overhead Press",
      type: "Mehrgelenkig",
      group: "Tag 1 – Push",
      cat: "Schulter",
      desc: "Überkopfdrücken. Core fest, Rippen unten, kein Hohlkreuz.",
      rec: { sets: 4, reps: 8 }
    },
    {
      id: "deficit_pushups",
      name: "Deficit Push-Ups",
      type: "Mehrgelenkig",
      group: "Tag 1 – Push",
      cat: "Brust",
      desc: "Liegestütz mit erhöhter ROM. Brust-Dehnung, langsam runter.",
      rec: { sets: 3, reps: 12 }
    },
    {
      id: "closegrip_pushups",
      name: "Close-Grip Push-Ups",
      type: "Mehrgelenkig",
      group: "Tag 1 – Push",
      cat: "Trizeps",
      desc: "Enger Griff. Trizeps-Fokus. Ellbogen nah am Körper.",
      rec: { sets: 3, reps: 10 }
    },
    {
      id: "oh_triceps_ext",
      name: "Overhead Trizeps Extension",
      type: "Mehrgelenkig",
      group: "Tag 1 – Push",
      cat: "Trizeps",
      desc: "Überkopf-Extension. Langsam ablassen, Ellbogen stabil.",
      rec: { sets: 3, reps: 12 }
    },
    {
      id: "db_skull_crushers",
      name: "DB Skull Crushers (Floor)",
      type: "Mehrgelenkig",
      group: "Tag 1 – Push",
      cat: "Trizeps",
      desc: "Trizepsstrecken liegend am Boden. Saubere Technik, kein Schulterstress.",
      rec: { sets: 3, reps: 12 }
    },
    {
      id: "db_lateral_raises",
      name: "DB Lateral Raises",
      type: "Mehrgelenkig",
      group: "Tag 1 – Push",
      cat: "Schulter",
      desc: "Seitheben. Leicht nach vorne leanen, hoch kontrolliert, langsam runter.",
      rec: { sets: 3, reps: 15 }
    },

    // ========= PULL =========
    {
      id: "1arm_db_row_pause",
      name: "1-Arm DB Row (Pause oben)",
      type: "Unilateral",
      group: "Tag 2 – Pull",
      cat: "Rücken",
      desc: "Einarmiges Rudern. Oben 1s Pause, Schulterblatt zurück.",
      rec: { sets: 4, reps: 10 }
    },
    {
      id: "1arm_db_row_elbow_close",
      name: "1-Arm DB Row (Elbow close)",
      type: "Unilateral",
      group: "Tag 2 – Pull",
      cat: "Lat",
      desc: "Ellbogen nah am Körper. Fokus Lat. Hüfte stabil halten.",
      rec: { sets: 4, reps: 10 }
    },
    {
      id: "renegade_rows",
      name: "Renegade Rows",
      type: "Unilateral",
      group: "Tag 2 – Pull",
      cat: "Rücken/Core",
      desc: "Plank-Rudern. Anti-Rotation. Langsam, kein Hüftkippen.",
      rec: { sets: 3, reps: 8 }
    },
    {
      id: "reverse_flys_slow",
      name: "Reverse Flys (langsam)",
      type: "Mehrgelenkig",
      group: "Tag 2 – Pull",
      cat: "Rear Delt",
      desc: "Hintere Schulter. Slow tempo, Schulterblätter leicht zusammen.",
      rec: { sets: 3, reps: 15 }
    },
    {
      id: "db_pullover_floor",
      name: "DB Pullover (Floor)",
      type: "Mehrgelenkig",
      group: "Tag 2 – Pull",
      cat: "Lat/Brustkorb",
      desc: "Pullover am Boden. Brustkorb/Lat. Arme leicht gebeugt, kontrolliert.",
      rec: { sets: 3, reps: 12 }
    },
    {
      id: "crossbody_hammer_curl",
      name: "Cross-Body Hammer Curl",
      type: "Mehrgelenkig",
      group: "Tag 2 – Pull",
      cat: "Bizeps",
      desc: "Hammer Curl diagonal. Brachialis/Unterarm, saubere Ellbogenposition.",
      rec: { sets: 3, reps: 12 }
    },
    {
      id: "db_supinated_curl",
      name: "DB Supinated Curl",
      type: "Mehrgelenkig",
      group: "Tag 2 – Pull",
      cat: "Bizeps",
      desc: "Supinierte Curls. Volle ROM, oben kurz halten.",
      rec: { sets: 3, reps: 12 }
    },
    {
      id: "farmers_carry_db",
      name: "Farmer’s Carry (DB)",
      type: "Unilateral",
      group: "Tag 2 – Pull",
      cat: "Grip/Traps",
      desc: "Tragen mit Kurzhanteln. Aufrecht, Core fest, gleichmäßige Schritte.",
      rec: { sets: 3, reps: 40 } // reps hier = Sekunden
    },

    // ========= LEGS + CORE =========
    {
      id: "bulgarian_split_squat",
      name: "Bulgarian Split Squats",
      type: "Unilateral",
      group: "Tag 3 – Beine & Core",
      cat: "Quads/Glute",
      desc: "Split Squat. Knie über Fuß, Oberkörper stabil, sauber tief.",
      rec: { sets: 4, reps: 8 }
    },
    {
      id: "db_rdl",
      name: "DB Romanian Deadlift",
      type: "Mehrgelenkig",
      group: "Tag 3 – Beine & Core",
      cat: "Hamstrings/Glute",
      desc: "Hinge. Hüfte zurück, Rücken neutral, Dehnung in Hamstrings.",
      rec: { sets: 4, reps: 10 }
    },
    {
      id: "goblet_squat",
      name: "Goblet Squat",
      type: "Mehrgelenkig",
      group: "Tag 3 – Beine & Core",
      cat: "Quads",
      desc: "Squat mit DB vorm Brustkorb. Knie raus, Rücken aufrecht.",
      rec: { sets: 4, reps: 10 }
    },
    {
      id: "cossack_squats",
      name: "Cossack Squats",
      type: "Unilateral",
      group: "Tag 3 – Beine & Core",
      cat: "Adduktoren/Hip",
      desc: "Seitliche Squats. Mobility + Adduktoren. Langsam, kontrolliert.",
      rec: { sets: 3, reps: 8 }
    },
    {
      id: "hip_thrust_floor",
      name: "Hip Thrust (Floor)",
      type: "Mehrgelenkig",
      group: "Tag 3 – Beine & Core",
      cat: "Glute",
      desc: "Glute Drive. Oben 1s squeeze, Becken neutral.",
      rec: { sets: 4, reps: 12 }
    },
    {
      id: "side_plank_leg_raise",
      name: "Side Plank + Leg Raise",
      type: "Core",
      group: "Tag 3 – Beine & Core",
      cat: "Core",
      desc: "Seitstütz + Abduktion. Anti-Lateral-Flexion, Glute Med.",
      rec: { sets: 3, reps: 30 } // reps = Sekunden
    },
    {
      id: "dead_bug",
      name: "Dead Bug",
      type: "Core",
      group: "Tag 3 – Beine & Core",
      cat: "Core",
      desc: "Anti-Extension. LWS am Boden, langsam gegenläufig.",
      rec: { sets: 3, reps: 10 }
    },
    {
      id: "hamstring_walkouts",
      name: "Hamstring Walkouts",
      type: "Core",
      group: "Tag 3 – Beine & Core",
      cat: "Posterior/Knieflex",
      desc: "Hamstrings/Glute. Hüfte hoch, Füße langsam raus/rein.",
      rec: { sets: 3, reps: 10 }
    },
    {
      id: "standing_calf_raises",
      name: "Standing DB Calf Raises",
      type: "Core",
      group: "Tag 3 – Beine & Core",
      cat: "Calves",
      desc: "Wadenheben. Oben 1s halten, volle Streckung unten.",
      rec: { sets: 4, reps: 20 }
    },

    // ========= FULL BODY / COMPLEX =========
    {
      id: "complex_deadlift",
      name: "Komplex: Deadlift",
      type: "Komplexe",
      group: "Tag 4 – Ganzkörper",
      cat: "Complex",
      desc: "Teil eines Komplexes. Saubere Hinge-Technik, keine Rundung.",
      rec: { sets: 5, reps: 6 }
    },
    {
      id: "complex_clean",
      name: "Komplex: Clean",
      type: "Komplexe",
      group: "Tag 4 – Ganzkörper",
      cat: "Complex",
      desc: "Explosiv. Hips snap, Hanteln nah am Körper.",
      rec: { sets: 5, reps: 6 }
    },
    {
      id: "complex_front_squat",
      name: "Komplex: Front Squat",
      type: "Komplexe",
      group: "Tag 4 – Ganzkörper",
      cat: "Complex",
      desc: "Front-loaded Squat. Core tight, Ellbogen hoch.",
      rec: { sets: 5, reps: 6 }
    },
    {
      id: "complex_push_press",
      name: "Komplex: Push Press",
      type: "Komplexe",
      group: "Tag 4 – Ganzkörper",
      cat: "Complex",
      desc: "Dip + Drive. Power aus Beinen, sauber lockout.",
      rec: { sets: 5, reps: 6 }
    },
    {
      id: "db_thrusters",
      name: "DB Thrusters",
      type: "Komplexe",
      group: "Tag 4 – Ganzkörper",
      cat: "Fullbody",
      desc: "Squat → Press. Conditioning + Power. Rhythmus sauber.",
      rec: { sets: 4, reps: 10 }
    },
    {
      id: "goblet_squat_hold",
      name: "Goblet Squat Hold",
      type: "Core",
      group: "Tag 4 – Ganzkörper",
      cat: "Core/Bracing",
      desc: "Isometrisches Halten. Atmung kontrollieren, bracing.",
      rec: { sets: 3, reps: 40 } // Sekunden
    },
    {
      id: "plank_shoulder_taps",
      name: "Plank Shoulder Taps",
      type: "Core",
      group: "Tag 4 – Ganzkörper",
      cat: "Core",
      desc: "Anti-Rotation. Hüfte stabil, taps langsam.",
      rec: { sets: 3, reps: 20 }
    },

    // ========= CONDITIONING =========
    {
      id: "burpees",
      name: "Burpees",
      type: "Conditioning",
      group: "Tag 5 – Conditioning & Core",
      cat: "Metcon",
      desc: "Ganzkörper. Pace stabil halten. Qualität vor Chaos.",
      rec: { sets: 5, reps: 40 } // Sekunden Arbeit (oder reps)
    },
    {
      id: "mountain_climbers",
      name: "Mountain Climbers",
      type: "Conditioning",
      group: "Tag 5 – Conditioning & Core",
      cat: "Metcon",
      desc: "Core + Puls. Rücken stabil, Knie schnell aber sauber.",
      rec: { sets: 5, reps: 40 }
    },
    {
      id: "high_knees",
      name: "High Knees",
      type: "Conditioning",
      group: "Tag 5 – Conditioning & Core",
      cat: "Metcon",
      desc: "Knie hoch, Arme aktiv, aufrecht bleiben.",
      rec: { sets: 5, reps: 40 }
    },
    {
      id: "jumping_jacks",
      name: "Jumping Jacks",
      type: "Conditioning",
      group: "Tag 5 – Conditioning & Core",
      cat: "Metcon",
      desc: "Low impact optional. Konstante Atemfrequenz.",
      rec: { sets: 5, reps: 40 }
    },
    {
      id: "russian_twists_db",
      name: "Russian Twists (DB)",
      type: "Core",
      group: "Tag 5 – Conditioning & Core",
      cat: "Core",
      desc: "Rotation. Brust hoch, nicht in den Rücken fallen.",
      rec: { sets: 3, reps: 20 }
    },
    {
      id: "hollow_hold",
      name: "Hollow Body Hold",
      type: "Core",
      group: "Tag 5 – Conditioning & Core",
      cat: "Core",
      desc: "Core Isometrie. LWS am Boden, Atmung ruhig.",
      rec: { sets: 3, reps: 40 }
    },

    // ========= NEAT =========
    {
      id: "walking_desk",
      name: "Walking Desk (Laufband 3 km/h)",
      type: "NEAT",
      group: "NEAT / Alltag",
      cat: "NEAT",
      desc: "Locker gehen. Ideal für Regeneration + Kalorienumsatz.",
      rec: { sets: 1, reps: 60 } // reps = Minuten
    },

    // ========= REST =========
    {
      id: "rest_day",
      name: "Ruhetag (Recovery + Mobility)",
      type: "Rest",
      group: "Ruhetag",
      cat: "Recovery",
      desc: "10–20 Min Mobility + Spaziergang. Optional leichtes NEAT.",
      rec: { sets: 0, reps: 0 }
    }
  ];

  function findExercise(name) {
    return EXERCISES.find(e => e.name === name) || null;
  }

  function listExercisesByGroup(group) {
    return EXERCISES.filter(e => e.group === group);
  }

  window.IQ.EXERCISES = EXERCISES;
  window.IQ.findExercise = findExercise;
  window.IQ.listExercisesByGroup = listExercisesByGroup;

})();
