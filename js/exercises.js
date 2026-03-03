(() => {
  "use strict";

  // difficulty: 1 (leicht) … 5 (sehr schwer)
  // baseXP: Basis XP pro Satz (vor Reps/Volumen/Streak/Skills/Class/Periodization/Equipment)
  const EXERCISES = [
    // ===================== BEINE — QUADS =====================
    { name:"Goblet Squat", type:"Mehrgelenkig", muscleGroup:"Beine", subGroup:"Quadrizeps", equipment:"Kurzhanteln", difficulty:4, baseXP:220, recSets:4, recReps:8,
      description:"Setup: Eine Kurzhantel vor der Brust (Goblet).\n\nAusführung: Knie nach außen, Rücken neutral, tief beugen.\n\nFokus: Quads/Glutes, saubere Tiefe." },
    { name:"Bulgarian Split Squat", type:"Unilateral", muscleGroup:"Beine", subGroup:"Quadrizeps", equipment:"Kurzhanteln", difficulty:5, baseXP:260, recSets:3, recReps:8,
      description:"Setup: Hinterer Fuß erhöht (Stuhl/Sofa), Kurzhanteln seitlich.\n\nAusführung: Kontrolliert absenken, vorderes Knie stabil, aufwärts drücken.\n\nFokus: Quads/Glutes, Balance & Kontrolle." },
    { name:"Split Squat (Bodyweight)", type:"Unilateral", muscleGroup:"Beine", subGroup:"Quadrizeps", equipment:"Ohne", difficulty:3, baseXP:170, recSets:3, recReps:10,
      description:"Setup: Ausfallschritt-Stand.\n\nAusführung: Senken bis beide Knie ~90°, aufrichten.\n\nFokus: Quads/Glutes, sauberes Knie." },
    { name:"Step-Up (Chair)", type:"Unilateral", muscleGroup:"Beine", subGroup:"Quadrizeps", equipment:"Kurzhanteln", difficulty:4, baseXP:210, recSets:3, recReps:10,
      description:"Setup: Stabiler Stuhl/Box, optional Kurzhanteln.\n\nAusführung: Ganz aufsteigen, kontrolliert absteigen.\n\nFokus: Quads/Glutes, keine Schwungbewegung." },
    { name:"Wall Sit", type:"Core", muscleGroup:"Beine", subGroup:"Quadrizeps", equipment:"Ohne", difficulty:2, baseXP:120, recSets:3, recReps:45,
      description:"Setup: Rücken an die Wand, Knie ~90°.\n\nAusführung: Halten, gleichmäßig atmen.\n\nFokus: Quads-Ausdauer." },

    // ===================== BEINE — HAMSTRINGS =====================
    { name:"DB Romanian Deadlift", type:"Mehrgelenkig", muscleGroup:"Beine", subGroup:"Beinbeuger", equipment:"Kurzhanteln", difficulty:4, baseXP:230, recSets:4, recReps:10,
      description:"Setup: Zwei Kurzhanteln seitlich.\n\nAusführung: Hüfte nach hinten, Rücken neutral, kontrolliert absenken.\n\nFokus: Hamstrings/Glutes, langsame Exzentrik." },
    { name:"Single-Leg RDL", type:"Unilateral", muscleGroup:"Beine", subGroup:"Beinbeuger", equipment:"Kurzhanteln", difficulty:5, baseXP:260, recSets:3, recReps:8,
      description:"Setup: Stand auf einem Bein, Kurzhanteln.\n\nAusführung: Hüfte zurück, Rücken neutral, wieder aufrichten.\n\nFokus: Hamstrings/Glutes, Balance." },
    { name:"Hamstring Walkout (Bridge)", type:"Core", muscleGroup:"Beine", subGroup:"Beinbeuger", equipment:"Ohne", difficulty:4, baseXP:210, recSets:3, recReps:10,
      description:"Setup: Rückenlage, Hüfte hoch (Bridge).\n\nAusführung: Fersen schrittweise nach vorn, dann zurück.\n\nFokus: Hamstrings, kontrolliert." },

    // ===================== BEINE — GLUTES =====================
    { name:"DB Hip Thrust (Floor)", type:"Mehrgelenkig", muscleGroup:"Beine", subGroup:"Gesäß", equipment:"Kurzhanteln", difficulty:3, baseXP:190, recSets:4, recReps:12,
      description:"Setup: Rücken am Boden, Hantel quer auf Hüfte.\n\nAusführung: Hüfte hoch bis volle Streckung, 1s Pause oben.\n\nFokus: Glutes, Druck über Fersen." },
    { name:"Glute Bridge", type:"Core", muscleGroup:"Beine", subGroup:"Gesäß", equipment:"Ohne", difficulty:2, baseXP:120, recSets:3, recReps:15,
      description:"Setup: Rückenlage, Füße nah am Po.\n\nAusführung: Hüfte hoch, oben kurz halten.\n\nFokus: Glutes, keine Überstreckung." },
    { name:"Frog Pumps", type:"Core", muscleGroup:"Beine", subGroup:"Gesäß", equipment:"Ohne", difficulty:2, baseXP:120, recSets:3, recReps:20,
      description:"Setup: Fußsohlen zusammen, Knie nach außen.\n\nAusführung: Kleine, kontrollierte Hüftstöße.\n\nFokus: Glute-Pump." },

    // ===================== BEINE — WADEN =====================
    { name:"Standing Calf Raise", type:"Unilateral", muscleGroup:"Beine", subGroup:"Waden", equipment:"Ohne", difficulty:2, baseXP:110, recSets:4, recReps:12,
      description:"Setup: Aufrecht stehen, optional anlehnen.\n\nAusführung: Fersen hoch, oben kurz halten.\n\nFokus: Waden, volle ROM." },
    { name:"DB Calf Raise", type:"Unilateral", muscleGroup:"Beine", subGroup:"Waden", equipment:"Kurzhanteln", difficulty:3, baseXP:140, recSets:4, recReps:10,
      description:"Setup: Kurzhanteln seitlich.\n\nAusführung: Hochdrücken, oben 1s halten.\n\nFokus: Waden, langsam absenken." },

    // ===================== RÜCKEN — OBERER RÜCKEN / RHOMBOIDS =====================
    { name:"DB Bent Over Row", type:"Mehrgelenkig", muscleGroup:"Rücken", subGroup:"Oberer Rücken", equipment:"Kurzhanteln", difficulty:4, baseXP:230, recSets:4, recReps:8,
      description:"Setup: Hüftknick, Rücken neutral.\n\nAusführung: Ellbogen nach hinten ziehen, Schulterblätter zusammen.\n\nFokus: Oberer Rücken, keine Schwungbewegung." },
    { name:"DB Reverse Fly", type:"Unilateral", muscleGroup:"Rücken", subGroup:"Oberer Rücken", equipment:"Kurzhanteln", difficulty:3, baseXP:160, recSets:3, recReps:12,
      description:"Setup: Leicht vorgebeugt, leichte Hanteln.\n\nAusführung: Arme seitlich öffnen, Schulterblätter führen.\n\nFokus: Rear Delts/Upper Back." },
    { name:"Superman Hold", type:"Core", muscleGroup:"Rücken", subGroup:"Unterer Rücken", equipment:"Ohne", difficulty:2, baseXP:120, recSets:3, recReps:30,
      description:"Setup: Bauchlage.\n\nAusführung: Arme & Beine anheben, halten.\n\nFokus: Rückenstrecker, Core." },

    // ===================== RÜCKEN — LAT =====================
    { name:"DB One-Arm Row", type:"Mehrgelenkig", muscleGroup:"Rücken", subGroup:"Lat", equipment:"Kurzhanteln", difficulty:4, baseXP:230, recSets:4, recReps:10,
      description:"Setup: Eine Hand abgestützt.\n\nAusführung: Ellbogen zur Hüfte, Schulterblatt zurück.\n\nFokus: Lat, voller Zug." },
    { name:"Inverted Row (Table)", type:"Mehrgelenkig", muscleGroup:"Rücken", subGroup:"Lat", equipment:"Ohne", difficulty:4, baseXP:240, recSets:3, recReps:8,
      description:"Setup: Stabiler Tisch/Leiste (nur wenn sicher!).\n\nAusführung: Brust zur Kante ziehen, Körper gerade.\n\nFokus: Rücken/Lat, saubere Linie." },
    { name:"Towel Lat Pulldown (Isometric)", type:"Core", muscleGroup:"Rücken", subGroup:"Lat", equipment:"Ohne", difficulty:3, baseXP:150, recSets:3, recReps:30,
      description:"Setup: Handtuch über Tür/Anker (nur sicher!).\n\nAusführung: Ziehen & 20–30s halten.\n\nFokus: Lat-Spannung." },

    // ===================== BRUST =====================
    { name:"DB Floor Press", type:"Mehrgelenkig", muscleGroup:"Brust", subGroup:"Brust", equipment:"Kurzhanteln", difficulty:4, baseXP:230, recSets:4, recReps:8,
      description:"Setup: Rücken am Boden, Hanteln auf Brusthöhe.\n\nAusführung: Drücken bis fast gestreckt, kontrolliert ablassen.\n\nFokus: Brust/Trizeps, Schulterblätter stabil." },
    { name:"Push-Up", type:"Mehrgelenkig", muscleGroup:"Brust", subGroup:"Brust", equipment:"Ohne", difficulty:3, baseXP:190, recSets:3, recReps:12,
      description:"Setup: Hände unter Schultern.\n\nAusführung: Körperspannung, Brust zum Boden.\n\nFokus: Brust/Trizeps/Core." },
    { name:"Incline Push-Up", type:"Mehrgelenkig", muscleGroup:"Brust", subGroup:"Brust", equipment:"Ohne", difficulty:2, baseXP:150, recSets:3, recReps:15,
      description:"Setup: Hände erhöht (Sofa/Tisch).\n\nAusführung: Sauber absenken/hochdrücken.\n\nFokus: Technik & Volumen." },
    { name:"DB Fly (Floor)", type:"Unilateral", muscleGroup:"Brust", subGroup:"Brust", equipment:"Kurzhanteln", difficulty:3, baseXP:170, recSets:3, recReps:12,
      description:"Setup: Rückenlage, leichte Hanteln.\n\nAusführung: Arme weit öffnen, Brust spannen, wieder schließen.\n\nFokus: Brust-Dehnung kontrolliert." },

    // ===================== SCHULTERN =====================
    { name:"DB Shoulder Press", type:"Mehrgelenkig", muscleGroup:"Schultern", subGroup:"Front/Side", equipment:"Kurzhanteln", difficulty:4, baseXP:240, recSets:3, recReps:8,
      description:"Setup: Sitz/Stand, Hanteln Schulterhöhe.\n\nAusführung: Über Kopf drücken, Rippen unten.\n\nFokus: Schultern/Trizeps." },
    { name:"DB Lateral Raise", type:"Unilateral", muscleGroup:"Schultern", subGroup:"Side", equipment:"Kurzhanteln", difficulty:3, baseXP:160, recSets:3, recReps:12,
      description:"Setup: Leichte Hanteln.\n\nAusführung: Arme seitlich bis Schulterhöhe.\n\nFokus: Side Delts, kontrolliert." },
    { name:"Pike Push-Up", type:"Mehrgelenkig", muscleGroup:"Schultern", subGroup:"Front", equipment:"Ohne", difficulty:5, baseXP:270, recSets:3, recReps:6,
      description:"Setup: Hüfte hoch (V-Form).\n\nAusführung: Kopf Richtung Boden, hochdrücken.\n\nFokus: Schultern, starke Körperspannung." },
    { name:"Rear Delt Row", type:"Unilateral", muscleGroup:"Schultern", subGroup:"Rear", equipment:"Kurzhanteln", difficulty:3, baseXP:160, recSets:3, recReps:12,
      description:"Setup: Vorbeuge.\n\nAusführung: Ellbogen hoch/außen ziehen.\n\nFokus: Rear Delts/Upper Back." },

    // ===================== ARME — BIZEPS =====================
    { name:"DB Biceps Curl", type:"Unilateral", muscleGroup:"Arme", subGroup:"Bizeps", equipment:"Kurzhanteln", difficulty:3, baseXP:150, recSets:3, recReps:12,
      description:"Setup: Aufrecht, Ellbogen nah am Körper.\n\nAusführung: Curl ohne Schwung, langsam ablassen.\n\nFokus: Bizeps, volle ROM." },
    { name:"Hammer Curl", type:"Unilateral", muscleGroup:"Arme", subGroup:"Bizeps", equipment:"Kurzhanteln", difficulty:3, baseXP:150, recSets:3, recReps:10,
      description:"Setup: Neutralgriff.\n\nAusführung: Curl, oben kurz halten.\n\nFokus: Brachialis/Unterarm." },
    { name:"Isometric Curl Hold", type:"Core", muscleGroup:"Arme", subGroup:"Bizeps", equipment:"Kurzhanteln", difficulty:2, baseXP:120, recSets:3, recReps:25,
      description:"Setup: Curl-Position bei 90°.\n\nAusführung: Halten.\n\nFokus: Spannung, Mind-Muscle." },

    // ===================== ARME — TRIZEPS =====================
    { name:"DB Overhead Triceps Extension", type:"Unilateral", muscleGroup:"Arme", subGroup:"Trizeps", equipment:"Kurzhanteln", difficulty:3, baseXP:160, recSets:3, recReps:10,
      description:"Setup: Hantel über Kopf.\n\nAusführung: Unterarme absenken, wieder strecken.\n\nFokus: Trizeps, Ellbogen stabil." },
    { name:"Close-Grip Push-Up", type:"Mehrgelenkig", muscleGroup:"Arme", subGroup:"Trizeps", equipment:"Ohne", difficulty:4, baseXP:230, recSets:3, recReps:8,
      description:"Setup: Hände enger.\n\nAusführung: Körperspannung, sauber drücken.\n\nFokus: Trizeps." },
    { name:"Triceps Kickback", type:"Unilateral", muscleGroup:"Arme", subGroup:"Trizeps", equipment:"Kurzhanteln", difficulty:2, baseXP:130, recSets:3, recReps:12,
      description:"Setup: Vorbeuge, Oberarm fix.\n\nAusführung: Unterarm strecken.\n\nFokus: Trizeps, langsam." },

    // ===================== CORE — ABS =====================
    { name:"Plank", type:"Core", muscleGroup:"Core", subGroup:"Bauch", equipment:"Ohne", difficulty:3, baseXP:150, recSets:3, recReps:45,
      description:"Setup: Unterarme am Boden.\n\nAusführung: Linie halten, atmen.\n\nFokus: Core, kein Durchhängen." },
    { name:"Dead Bug", type:"Core", muscleGroup:"Core", subGroup:"Bauch", equipment:"Ohne", difficulty:2, baseXP:120, recSets:3, recReps:10,
      description:"Setup: Rückenlage, Arme/Beine hoch.\n\nAusführung: Gegengleich strecken, Rücken flach.\n\nFokus: Core-Kontrolle." },
    { name:"Hollow Hold", type:"Core", muscleGroup:"Core", subGroup:"Bauch", equipment:"Ohne", difficulty:4, baseXP:190, recSets:3, recReps:25,
      description:"Setup: Rückenlage.\n\nAusführung: Schulterblätter anheben, Rücken flach.\n\nFokus: Bauchspannung." },
    { name:"DB Russian Twist", type:"Core", muscleGroup:"Core", subGroup:"Obliques", equipment:"Kurzhanteln", difficulty:3, baseXP:150, recSets:3, recReps:16,
      description:"Setup: Sitz, Oberkörper leicht zurück.\n\nAusführung: Von Seite zu Seite drehen.\n\nFokus: Rotationskraft." },
    { name:"Side Plank", type:"Core", muscleGroup:"Core", subGroup:"Obliques", equipment:"Ohne", difficulty:3, baseXP:150, recSets:3, recReps:30,
      description:"Setup: Seitstütz.\n\nAusführung: Hüfte hoch halten.\n\nFokus: Obliques/Glute Med." },

    // ===================== CONDITIONING =====================
    { name:"Burpees", type:"Conditioning", muscleGroup:"Conditioning", subGroup:"Ganzkörper", equipment:"Ohne", difficulty:5, baseXP:280, recSets:3, recReps:12,
      description:"Setup: Stand.\n\nAusführung: Squat → Plank → Push-Up → Jump.\n\nFokus: Power & Ausdauer." },
    { name:"Mountain Climbers", type:"Conditioning", muscleGroup:"Conditioning", subGroup:"Ganzkörper", equipment:"Ohne", difficulty:3, baseXP:180, recSets:3, recReps:40,
      description:"Setup: Plank.\n\nAusführung: Knie abwechselnd zur Brust.\n\nFokus: Conditioning + Core." },
    { name:"DB Thruster", type:"Komplexe", muscleGroup:"Conditioning", subGroup:"Ganzkörper", equipment:"Kurzhanteln", difficulty:5, baseXP:300, recSets:3, recReps:10,
      description:"Setup: Hanteln Schulterhöhe.\n\nAusführung: Squat → explosiv drücken.\n\nFokus: Full Body Power." },
    { name:"DB Clean & Press", type:"Komplexe", muscleGroup:"Conditioning", subGroup:"Ganzkörper", equipment:"Kurzhanteln", difficulty:5, baseXP:320, recSets:3, recReps:8,
      description:"Setup: Hanteln am Boden.\n\nAusführung: Clean → Press, kontrolliert.\n\nFokus: Technik & Power." },
    { name:"Farmer Carry (in place)", type:"NEAT", muscleGroup:"Conditioning", subGroup:"NEAT", equipment:"Kurzhanteln", difficulty:3, baseXP:160, recSets:4, recReps:40,
      description:"Setup: Hanteln schwer greifen.\n\nAusführung: Gehen am Platz oder Zimmer.\n\nFokus: Grip/Core/NEAT." },

    // ===================== MOBILITY / RECOVERY =====================
    { name:"Cat-Cow", type:"NEAT", muscleGroup:"Mobility", subGroup:"Spine", equipment:"Ohne", difficulty:1, baseXP:80, recSets:2, recReps:10,
      description:"Setup: Vierfüßler.\n\nAusführung: Wirbelsäule runden/strekken.\n\nFokus: Mobilität & Warm-up." },
    { name:"Hip Flexor Stretch", type:"NEAT", muscleGroup:"Mobility", subGroup:"Hips", equipment:"Ohne", difficulty:1, baseXP:80, recSets:2, recReps:30,
      description:"Setup: Halbkniestand.\n\nAusführung: Hüfte nach vorn schieben, halten.\n\nFokus: Hüfte, Recovery." }
  ];

  // Derived lists for dropdowns
  const MUSCLE_GROUPS = Array.from(new Set(EXERCISES.map(e => e.muscleGroup))).sort();
  const SUB_GROUPS = Array.from(new Set(EXERCISES.map(e => `${e.muscleGroup}|||${e.subGroup}`))).sort();

  function byGroup(){
    const map = {};
    for(const e of EXERCISES){
      const k = `${e.muscleGroup}|||${e.subGroup}`;
      map[k] = map[k] || [];
      map[k].push(e);
    }
    // Sort within subgroup by name
    for(const k of Object.keys(map)){
      map[k].sort((a,b)=>a.name.localeCompare(b.name));
    }
    return map;
  }

  function findByName(name){
    return EXERCISES.find(e => e.name === name) || null;
  }

  window.IronQuestExercises = {
    EXERCISES,
    MUSCLE_GROUPS,
    SUB_GROUPS,
    byGroup,
    findByName
  };
})();
