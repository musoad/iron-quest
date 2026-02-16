(() => {
  "use strict";

  const TRAINING_PLAN = {
    days: {
      1: { name: "Lower Body + Core" },
      2: { name: "Push" },
      3: { name: "Pull" },
      4: { name: "Core + Conditioning" },
      5: { name: "Full Body Komplex" }
    }
  };

  const EXERCISES = [

    /* ================= LOWER ================= */
    {
      name: "Goblet Squat",
      day: 1,
      type: "Mehrgelenkig",
      recSets: 4,
      recReps: 8,
      description: "Kurzhantel vor der Brust halten, aufrecht tief beugen, Knie nach außen drücken."
    },
    {
      name: "Rumänisches Kreuzheben (DB)",
      day: 1,
      type: "Mehrgelenkig",
      recSets: 4,
      recReps: 8,
      description: "Hüfte nach hinten schieben, Rücken neutral, Dehnung in den Hamstrings."
    },
    {
      name: "Bulgarian Split Squat",
      day: 1,
      type: "Unilateral",
      recSets: 3,
      recReps: 10,
      description: "Hinteres Bein erhöht, kontrollierte Abwärtsbewegung."
    },
    {
      name: "Plank",
      day: 1,
      type: "Core",
      recSets: 3,
      recReps: 45,
      description: "Körper gerade Linie, Spannung im Bauch halten."
    },

    /* ================= PUSH ================= */
    {
      name: "DB Floor Press",
      day: 2,
      type: "Mehrgelenkig",
      recSets: 4,
      recReps: 8,
      description: "Am Boden drücken, Ellbogen 45°."
    },
    {
      name: "DB Shoulder Press",
      day: 2,
      type: "Mehrgelenkig",
      recSets: 4,
      recReps: 8,
      description: "Überkopf drücken, Core stabil."
    },
    {
      name: "DB Lateral Raise",
      day: 2,
      type: "Unilateral",
      recSets: 3,
      recReps: 12,
      description: "Seitlich heben, leichte Gewichte, Kontrolle."
    },
    {
      name: "Push Ups",
      day: 2,
      type: "Mehrgelenkig",
      recSets: 3,
      recReps: 12,
      description: "Körper stabil, Brust bis knapp Boden."
    },

    /* ================= PULL ================= */
    {
      name: "DB Bent Over Row",
      day: 3,
      type: "Mehrgelenkig",
      recSets: 4,
      recReps: 8,
      description: "Vorgebeugt rudern, Schulterblätter zusammenziehen."
    },
    {
      name: "DB Reverse Fly",
      day: 3,
      type: "Unilateral",
      recSets: 3,
      recReps: 12,
      description: "Leichtes Gewicht, hintere Schulter aktivieren."
    },
    {
      name: "DB Hammer Curl",
      day: 3,
      type: "Unilateral",
      recSets: 3,
      recReps: 10,
      description: "Neutraler Griff, kontrollierte Bewegung."
    },
    {
      name: "Dead Bug",
      day: 3,
      type: "Core",
      recSets: 3,
      recReps: 10,
      description: "Gegengleiche Arm/Bein Bewegung, Core Spannung."
    },

    /* ================= CORE + CONDITIONING ================= */
    {
      name: "DB Thrusters",
      day: 4,
      type: "Komplexe",
      recSets: 4,
      recReps: 10,
      description: "Squat + Press in einer Bewegung."
    },
    {
      name: "Mountain Climbers",
      day: 4,
      type: "Conditioning",
      recSets: 3,
      recReps: 40,
      description: "Schnelle Beinbewegung, Core stabil."
    },
    {
      name: "Russian Twists",
      day: 4,
      type: "Core",
      recSets: 3,
      recReps: 20,
      description: "Rotation aus dem Oberkörper."
    },

    /* ================= FULL BODY ================= */
    {
      name: "DB Clean + Press",
      day: 5,
      type: "Komplexe",
      recSets: 5,
      recReps: 5,
      description: "Explosiv hochziehen, über Kopf drücken."
    },
    {
      name: "DB Front Squat",
      day: 5,
      type: "Mehrgelenkig",
      recSets: 4,
      recReps: 8,
      description: "Kurzhanteln vor Schulter halten."
    },
    {
      name: "DB Renegade Row",
      day: 5,
      type: "Komplexe",
      recSets: 3,
      recReps: 8,
      description: "Plank + Rudern, Core extrem stabilisieren."
    }
  ];

  window.IronQuestExercises = {
    TRAINING_PLAN,
    EXERCISES
  };

})();
