(() => {
  "use strict";

  const TRAINING_PLAN = {
    days: {
      1: { name: "Lower Body + Core" },
      2: { name: "Push (Brust/Schulter/Trizeps)" },
      3: { name: "Pull (Rücken/Bizeps)" },
      4: { name: "Core + Conditioning" },
      5: { name: "Full Body Komplex" }
    }
  };

  // Hinweis:
  // - recReps bedeutet bei Plank/Isos "Sekunden"
  // - Conditioning: recReps = Sekunden oder Wiederholungen, je nach Übung (ist ok fürs XP, weil du sowieso "Did Sets x Reps" trackst)

  const EXERCISES = [

    /* ===================== DAY 1: LOWER + CORE ===================== */
    { name:"Goblet Squat", day:1, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Kurzhantel vor Brust, tief beugen, Knie nach außen, Brust stolz." },

    { name:"DB Front Squat", day:1, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"2 DB an Schulter/Front-Rack, aufrecht bleiben, kontrolliert." },

    { name:"Rumänisches Kreuzheben (DB)", day:1, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Hüfte nach hinten, Rücken neutral, Dehnung Hamstrings, dann hoch." },

    { name:"DB Hip Thrust / Glute Bridge", day:1, type:"Mehrgelenkig", recSets:4, recReps:10,
      description:"Schulter auf Matte, DB auf Hüfte, Po anspannen oben kurz halten." },

    { name:"Bulgarian Split Squat", day:1, type:"Unilateral", recSets:3, recReps:10,
      description:"Hinteres Bein erhöht, langsam runter, vorderer Fuß fest, aufrecht." },

    { name:"Reverse Lunge (DB)", day:1, type:"Unilateral", recSets:3, recReps:10,
      description:"Schritt nach hinten, vorderes Knie stabil, aus der Ferse hochdrücken." },

    { name:"Calf Raises (DB)", day:1, type:"Unilateral", recSets:3, recReps:15,
      description:"Wadenheben langsam, oben 1s halten, volle ROM." },

    { name:"Plank", day:1, type:"Core", recSets:3, recReps:45,
      description:"Gerade Linie, Bauch fest, Po angespannt, nicht durchhängen." },

    { name:"Side Plank", day:1, type:"Core", recSets:3, recReps:30,
      description:"Seitstütz, Hüfte hoch, Körper in Linie, Schulter stabil." },

    { name:"Dead Bug", day:1, type:"Core", recSets:3, recReps:10,
      description:"LWS am Boden, gegengleich Arm/Bein strecken, Spannung halten." },


    /* ===================== DAY 2: PUSH ===================== */
    { name:"DB Floor Press", day:2, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Am Boden drücken, Ellbogen ca. 45°, Schulterblätter stabil." },

    { name:"Push Ups", day:2, type:"Mehrgelenkig", recSets:3, recReps:12,
      description:"Körper wie Brett, Brust knapp Boden, sauber hochdrücken." },

    { name:"DB Shoulder Press", day:2, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Überkopf drücken, Rippen runter, Core fest." },

    { name:"Arnold Press (DB)", day:2, type:"Komplexe", recSets:3, recReps:10,
      description:"Rotation von innen nach außen beim Drücken, kontrolliert." },

    { name:"DB Incline Press (am Boden, Hüfte erhöht)", day:2, type:"Mehrgelenkig", recSets:3, recReps:10,
      description:"Hüfte leicht hoch (Brücke), simuliert schräges Drücken." },

    { name:"DB Lateral Raise", day:2, type:"Unilateral", recSets:3, recReps:12,
      description:"Seitlich heben bis Schulterhöhe, Kontrolle, kein Schwung." },

    { name:"DB Front Raise", day:2, type:"Unilateral", recSets:2, recReps:12,
      description:"Frontheben, leichte DB, langsam, Schulter nicht hochziehen." },

    { name:"Diamond Push Ups (Trizeps)", day:2, type:"Mehrgelenkig", recSets:2, recReps:10,
      description:"Hände eng, Ellbogen nah am Körper, Trizeps Fokus." },

    { name:"Overhead Triceps Extension (DB)", day:2, type:"Unilateral", recSets:3, recReps:12,
      description:"DB über Kopf, Ellbogen stabil, nur Unterarm bewegen." },


    /* ===================== DAY 3: PULL ===================== */
    { name:"DB Bent Over Row", day:3, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Vorgebeugt, Rücken neutral, zur Hüfte rudern, Schulterblätter zusammen." },

    { name:"1-Arm DB Row", day:3, type:"Unilateral", recSets:4, recReps:10,
      description:"Einarmig rudern, Brust stabil, Ellbogen zur Hüfte." },

    { name:"DB Reverse Fly", day:3, type:"Unilateral", recSets:3, recReps:12,
      description:"Leichtes Gewicht, Arme leicht gebeugt, hintere Schulter spüren." },

    { name:"DB Shrugs", day:3, type:"Unilateral", recSets:3, recReps:12,
      description:"Schultern hoch zu Ohren, oben 1s halten, nicht rollen." },

    { name:"DB Hammer Curl", day:3, type:"Unilateral", recSets:3, recReps:10,
      description:"Neutraler Griff, kontrolliert hoch/runter, Ellbogen nah." },

    { name:"DB Supinated Curl", day:3, type:"Unilateral", recSets:3, recReps:10,
      description:"Handfläche oben, saubere Curls, kein Schwung." },

    { name:"DB Pullover (am Boden)", day:3, type:"Komplexe", recSets:3, recReps:10,
      description:"Arme über Kopf führen, Lat/Brust Dehnung, Core stabil." },

    { name:"Hollow Hold", day:3, type:"Core", recSets:3, recReps:30,
      description:"LWS am Boden, Beine/Schultern leicht oben, Spannung halten." },


    /* ===================== DAY 4: CORE + CONDITIONING ===================== */
    { name:"DB Thrusters", day:4, type:"Komplexe", recSets:4, recReps:10,
      description:"Squat → explosiv Press, flüssige Bewegung, sauberer Core." },

    { name:"DB Snatch (alternierend)", day:4, type:"Komplexe", recSets:4, recReps:8,
      description:"DB explosiv über Kopf, Hüfte treibt, kontrolliert absetzen." },

    { name:"Mountain Climbers", day:4, type:"Conditioning", recSets:3, recReps:40,
      description:"Schnell, Core stabil, Schultern über Händen." },

    { name:"Burpees", day:4, type:"Conditioning", recSets:5, recReps:10,
      description:"Brust zum Boden, explosiv hoch, Rhythmus halten." },

    { name:"High Knees", day:4, type:"Conditioning", recSets:4, recReps:30,
      description:"Knie hoch, Arme aktiv, schnell, auf dem Vorderfuß." },

    { name:"Russian Twists (DB optional)", day:4, type:"Core", recSets:3, recReps:20,
      description:"Rotation aus dem Oberkörper, kontrolliert, nicht nur Arme." },

    { name:"Leg Raises", day:4, type:"Core", recSets:3, recReps:12,
      description:"Beine gestreckt heben, LWS am Boden, langsam ablassen." },

    { name:"Plank Shoulder Taps", day:4, type:"Core", recSets:3, recReps:20,
      description:"Im Plank Schulter antippen, Hüfte stabil, kein Wackeln." },


    /* ===================== DAY 5: FULL BODY KOMPLEX ===================== */
    { name:"DB Clean + Press", day:5, type:"Komplexe", recSets:5, recReps:5,
      description:"Explosiv hochziehen → über Kopf drücken, technisch sauber." },

    { name:"DB Renegade Row", day:5, type:"Komplexe", recSets:3, recReps:8,
      description:"Plank + Rudern, Hüfte stabil, kein Kippen." },

    { name:"DB Squat to Row", day:5, type:"Komplexe", recSets:4, recReps:10,
      description:"Squat → beim Hochkommen rudern, flüssig aber kontrolliert." },

    { name:"DB Deadlift + High Pull", day:5, type:"Komplexe", recSets:4, recReps:8,
      description:"Deadlift → explosiver High Pull, Ellbogen hoch, Rücken neutral." },

    { name:"DB Farmer Carry (on the spot)", day:5, type:"Conditioning", recSets:4, recReps:40,
      description:"DB halten, Core fest, aufrecht, 40s stehen/gehen." },

    { name:"Push Up to Plank", day:5, type:"Komplexe", recSets:3, recReps:10,
      description:"Liegestütz → Unterarmstütz → zurück, sauberer Core." },

    { name:"Suitcase Deadlift (1 DB)", day:5, type:"Unilateral", recSets:3, recReps:10,
      description:"1 DB seitlich, deadlift, Anti-tilt Core, Hüfte stabil." },
  ];

  window.IronQuestExercises = { TRAINING_PLAN, EXERCISES };
})();
