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
      description:"Setup: Kurzhantel vor der Brust halten, Füße schulterbreit.\n\nBewegung: Hüfte nach hinten/unten, Knie nach außen, tief beugen.\n\nTipp: Oben vollständig strecken, Core fest – langsame Kontrolle." },
    { name:"DB Front Squat", day:1, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Setup: Zwei Kurzhanteln im Front-Rack an den Schultern.\n\nBewegung: Aufrecht in die Kniebeuge, Fersen am Boden, tief & sauber.\n\nTipp: Ellbogen leicht hoch, Bauch anspannen, kein Rundrücken." },
    { name:"Rumänisches Kreuzheben (DB)", day:1, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Setup: Kurzhanteln vor den Oberschenkeln, Knie leicht gebeugt.\n\nBewegung: Hüfte nach hinten schieben, Rücken neutral, bis Dehnung in den Hamstrings.\n\nTipp: Langsam ablassen, aus der Hüfte hoch – nicht aus dem Rücken ziehen." },
    { name:"DB Hip Thrust / Glute Bridge", day:1, type:"Mehrgelenkig", recSets:4, recReps:10,
      description:"Setup: Rücken/Schultern auf Matte, DB quer auf die Hüfte.\n\nBewegung: Hüfte hochdrücken, oben Po maximal anspannen.\n\nTipp: Oben 1 Sekunde halten, Rippen runter, kein Hohlkreuz." },
    { name:"Bulgarian Split Squat", day:1, type:"Unilateral", recSets:3, recReps:10,
      description:"Setup: Hinteres Bein erhöht (Sofa/Stuhl), vorderer Fuß stabil.\n\nBewegung: Kontrolliert runter, Knie folgt Fuß, dann kraftvoll hoch.\n\nTipp: Oberkörper aufrecht, vorderes Bein arbeitet – volle Range." },
    { name:"Reverse Lunge (DB)", day:1, type:"Unilateral", recSets:3, recReps:10,
      description:"Setup: Aufrecht stehen, DB seitlich, Core fest.\n\nBewegung: Großer Schritt zurück, vorderes Knie stabil, zurück hoch.\n\nTipp: Druck über vordere Ferse, langsam ablassen." },
    { name:"Calf Raises (DB)", day:1, type:"Unilateral", recSets:3, recReps:15,
      description:"Setup: Aufrecht stehen, DB halten, Fußspitzen gerade.\n\nBewegung: Fersen langsam hoch, oben 1 Sekunde halten.\n\nTipp: Voll runter für Stretch, keine Wipp-Bewegung." },
    { name:"Plank", day:1, type:"Core", recSets:3, recReps:45,
      description:"Setup: Unterarme am Boden, Ellbogen unter Schultern.\n\nBewegung: Körper bildet eine Linie – Bauch/Po anspannen.\n\nTipp: Nicht durchhängen, ruhig atmen, Spannung halten." },
    { name:"Side Plank", day:1, type:"Core", recSets:3, recReps:30,
      description:"Setup: Seitstütz auf Unterarm, Füße übereinander/versetzt.\n\nBewegung: Hüfte hoch, Körper bleibt gerade.\n\nTipp: Schulter weg vom Ohr, Bauch seitlich fest." },

    // DAY 2
    { name:"DB Floor Press", day:2, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Setup: Am Boden liegen, DB auf Brusthöhe, Schulterblätter stabil.\n\nBewegung: Drücken bis Arme fast gestreckt, kontrolliert ablassen.\n\nTipp: Ellbogen ca. 45°, Handgelenke neutral." },
    { name:"Push Ups", day:2, type:"Mehrgelenkig", recSets:3, recReps:12,
      description:"Setup: Hände unter Schulter, Körper wie Brett.\n\nBewegung: Brust Richtung Boden, dann sauber hochdrücken.\n\nTipp: Core fest, Ellbogen leicht nach hinten, volle Kontrolle." },
    { name:"DB Shoulder Press", day:2, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Setup: DB auf Schulterhöhe, Rippen runter, Core fest.\n\nBewegung: Über Kopf drücken, kontrolliert zurück.\n\nTipp: Kein Hohlkreuz – Spannung im Bauch halten." },
    { name:"Arnold Press (DB)", day:2, type:"Komplexe", recSets:3, recReps:10,
      description:"Setup: DB vor dem Gesicht, Handflächen zu dir.\n\nBewegung: Beim Hochdrücken rotieren und über Kopf strecken.\n\nTipp: Langsam ablassen, Schulter kontrolliert führen." },
    { name:"DB Lateral Raise", day:2, type:"Unilateral", recSets:3, recReps:12,
      description:"Setup: Leichte DB, Arme leicht gebeugt, Schulter tief.\n\nBewegung: Seitlich bis etwa Schulterhöhe anheben.\n\nTipp: Kein Schwung – langsame negative Phase." },
    { name:"Overhead Triceps Extension (DB)", day:2, type:"Unilateral", recSets:3, recReps:12,
      description:"Setup: Eine DB über Kopf halten, Ellbogen eng.\n\nBewegung: Unterarme absenken, dann strecken.\n\nTipp: Ellbogen bleiben fix, Bewegung nur im Trizeps." },

    // DAY 3
    { name:"DB Bent Over Row", day:3, type:"Mehrgelenkig", recSets:4, recReps:8,
      description:"Setup: Hüfte nach hinten, Rücken neutral, DB hängen.\n\nBewegung: Zur Hüfte rudern, Schulterblätter zusammen.\n\nTipp: Oben kurz halten, kontrolliert ablassen." },
    { name:"1-Arm DB Row", day:3, type:"Unilateral", recSets:4, recReps:10,
      description:"Setup: Abstützen (Knie/Hand), Rücken parallel zum Boden.\n\nBewegung: DB zur Hüfte ziehen, Lat aktiv.\n\nTipp: Nicht drehen, Schulterblatt nach hinten/unten." },
    { name:"DB Reverse Fly", day:3, type:"Unilateral", recSets:3, recReps:12,
      description:"Setup: Leicht vorgebeugt, DB unter Schultern.\n\nBewegung: Arme seitlich öffnen, hintere Schulter spüren.\n\nTipp: Kleine Gewichte, saubere Kontrolle, kein Schwung." },
    { name:"DB Pullover (Boden)", day:3, type:"Komplexe", recSets:3, recReps:10,
      description:"Setup: Am Boden liegen, DB über Brust halten.\n\nBewegung: Arme über Kopf absenken bis Dehnung, zurück.\n\nTipp: Rippen unten halten, Bewegung kontrolliert." },
    { name:"DB Hammer Curl", day:3, type:"Unilateral", recSets:3, recReps:10,
      description:"Setup: Aufrecht stehen, neutraler Griff.\n\nBewegung: Curl hoch, langsam runter.\n\nTipp: Ellbogen am Körper, kein Schwingen." },
    { name:"Hollow Hold", day:3, type:"Core", recSets:3, recReps:30,
      description:"Setup: Rückenlage, LWS am Boden fixieren.\n\nBewegung: Beine & Schulterblätter leicht anheben, halten.\n\nTipp: Wenn nötig Knie anwinkeln, Qualität vor Zeit." },

    // DAY 4
    { name:"DB Thrusters", day:4, type:"Komplexe", recSets:4, recReps:10,
      description:"Setup: DB auf Schulter, Füße stabil.\n\nBewegung: Squat → explosiv hoch → direkt Press.\n\nTipp: Sauberer Rhythmus, Core stabilisieren." },
    { name:"Burpees", day:4, type:"Conditioning", recSets:5, recReps:10,
      description:"Setup: Stand, Hände zum Boden.\n\nBewegung: In Plank springen, Brust runter, zurück, hochspringen.\n\nTipp: Gleichmäßiger Pace, sauber statt chaotisch." },
    { name:"Mountain Climbers", day:4, type:"Conditioning", recSets:3, recReps:40,
      description:"Setup: Hoher Plank, Schultern über Händen.\n\nBewegung: Knie abwechselnd schnell zur Brust.\n\nTipp: Hüfte ruhig halten, Core fest." },
    { name:"Russian Twists (DB optional)", day:4, type:"Core", recSets:3, recReps:20,
      description:"Setup: Sitz, Oberkörper leicht zurück, Core aktiv.\n\nBewegung: Rotation links/rechts, DB optional.\n\nTipp: Drehe aus dem Rumpf, nicht nur aus den Armen." },
    { name:"Leg Raises", day:4, type:"Core", recSets:3, recReps:12,
      description:"Setup: Rückenlage, Hände unter Po optional.\n\nBewegung: Beine hoch, langsam absenken ohne Hohlkreuz.\n\nTipp: Kleine Range ist ok – Spannung im Bauch zählt." },

    // DAY 5
    { name:"DB Clean + Press", day:5, type:"Komplexe", recSets:5, recReps:5,
      description:"Setup: DB vor dir, Hüfte bereit, Rücken neutral.\n\nBewegung: Explosiv clean zur Schulter → direkt Press.\n\nTipp: Technik vor Tempo, kontrolliert ablassen." },
    { name:"DB Renegade Row", day:5, type:"Komplexe", recSets:3, recReps:8,
      description:"Setup: Hoher Plank auf DB, Füße breit.\n\nBewegung: Einarmig rudern, Hüfte stabil, wechseln.\n\nTipp: Langsam, kein Rotieren des Beckens." },
    { name:"DB Squat to Row", day:5, type:"Komplexe", recSets:4, recReps:10,
      description:"Setup: DB in Händen, Stand stabil.\n\nBewegung: Squat → hochkommen → rudern.\n\nTipp: Fließend, aber jede Phase kontrolliert." },
    { name:"Suitcase Deadlift (1 DB)", day:5, type:"Unilateral", recSets:3, recReps:10,
      description:"Setup: Eine DB seitlich, Stand schulterbreit.\n\nBewegung: Deadlift runter/hoch, Körper bleibt gerade.\n\nTipp: Nicht zur DB kippen – Anti-Schräglage im Core." },
    { name:"Farmer Hold (on the spot)", day:5, type:"Conditioning", recSets:4, recReps:40,
      description:"Setup: DB seitlich halten, aufrecht stehen.\n\nBewegung: Halten für die Zeit (Reps = Sekunden).\n\nTipp: Schultern runter, Bauch fest, ruhig atmen." },

    // Special
    { name:"Walking (NEAT)", day:0, type:"NEAT", recSets:1, recReps:30,
      description:"Setup: Bequeme Schuhe, aufrechte Haltung.\n\nBewegung: Zügig gehen (Reps = Minuten).\n\nTipp: Konstanz zählt – ideal an Rest-/Recovery-Tagen." },
    { name:"Jogging", day:0, type:"Joggen", recSets:1, recReps:30,
      description:"Nutze den Run-Tab.\n\nGib Distanz (km) und Zeit (min) ein.\n\nXP wird automatisch aus Distanz + Zeit berechnet." }
  ];

  window.IronQuestExercises = { TRAINING_PLAN, EXERCISES };
})();
