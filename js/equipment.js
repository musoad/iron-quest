(() => {
  "use strict";

  const EXERCISES = [
    { name:"Goblet Squat", type:"Mehrgelenkig", group:"Legs", recSets:4, recReps:8, description:"Setup: Eine Kurzhantel vor der Brust (Goblet).\n\nAusf\u00fchrung: Knie nach au\u00dfen, R\u00fccken neutral, tief beugen.\n\nFokus: Quads/Glutes, saubere Tiefe." },
    { name:"DB Romanian Deadlift", type:"Mehrgelenkig", group:"Legs", recSets:4, recReps:10, description:"Setup: Zwei Kurzhanteln seitlich.\n\nAusf\u00fchrung: H\u00fcfte nach hinten schieben, leichte Kniebeugung, R\u00fccken neutral.\n\nFokus: Hamstrings/Glutes, kontrollierte Exzentrik." },
    { name:"DB Floor Press", type:"Mehrgelenkig", group:"Push", recSets:4, recReps:8, description:"Setup: R\u00fccken am Boden, Hanteln auf Brusth\u00f6he.\n\nAusf\u00fchrung: Dr\u00fccken bis Arme fast gestreckt, Schulterbl\u00e4tter stabil.\n\nFokus: Brust/Trizeps, kontrolliert ablassen." },
    { name:"DB One-Arm Row", type:"Mehrgelenkig", group:"Pull", recSets:4, recReps:10, description:"Setup: Eine Hand am Oberschenkel oder Sofa abgest\u00fctzt.\n\nAusf\u00fchrung: Ellbogen zur H\u00fcfte ziehen, Schulterblatt zur\u00fcck.\n\nFokus: Lat/oberer R\u00fccken." },
    { name:"DB Shoulder Press", type:"Mehrgelenkig", group:"Push", recSets:3, recReps:8, description:"Setup: Sitz oder Stand, Hanteln auf Schulterh\u00f6he.\n\nAusf\u00fchrung: \u00dcber Kopf dr\u00fccken, Rippen unten halten.\n\nFokus: Schultern/Trizeps." },
    { name:"DB Hip Thrust (Floor)", type:"Mehrgelenkig", group:"Legs", recSets:4, recReps:12, description:"Setup: R\u00fccken am Boden, Hantel quer auf H\u00fcfte.\n\nAusf\u00fchrung: H\u00fcfte hoch bis volle Streckung, Kinn leicht eingezogen.\n\nFokus: Glutes, Pause oben." },
    { name:"Push-Up", type:"Mehrgelenkig", group:"Push", recSets:3, recReps:12, description:"Setup: H\u00e4nde unter Schultern.\n\nAusf\u00fchrung: K\u00f6rperspannung, Brust zum Boden.\n\nFokus: Brust/Trizeps/CORE." },
    { name:"Inverted Row (Table)", type:"Mehrgelenkig", group:"Pull", recSets:3, recReps:8, description:"Setup: Stabiler Tisch/gel\u00e4nder (nur wenn sicher!).\n\nAusf\u00fchrung: Brust zur Kante ziehen, K\u00f6rper gerade.\n\nFokus: R\u00fccken, sauberer Zug." },
    { name:"DB Bent Over Row", type:"Mehrgelenkig", group:"Pull", recSets:4, recReps:8, description:"Setup: H\u00fcftknick, R\u00fccken neutral.\n\nAusf\u00fchrung: Beide Ellbogen nach hinten ziehen.\n\nFokus: R\u00fccken-Dichte." },
    { name:"DB Deadlift", type:"Mehrgelenkig", group:"Legs", recSets:3, recReps:8, description:"Setup: Hanteln vor den Schienbeinen.\n\nAusf\u00fchrung: H\u00fcfte/Beine strecken, R\u00fccken neutral.\n\nFokus: Ganzk\u00f6rper Kraft." },
    { name:"Bulgarian Split Squat", type:"Unilateral", group:"Legs", recSets:3, recReps:10, description:"Setup: Hinterer Fu\u00df erh\u00f6ht (Sofa/Stuhl).\n\nAusf\u00fchrung: Kontrolliert runter, vorne \u00fcber Mittelfu\u00df.\n\nFokus: Quads/Glutes, Balance." },
    { name:"Reverse Lunge", type:"Unilateral", group:"Legs", recSets:3, recReps:12, description:"Setup: Stand, Schritt nach hinten.\n\nAusf\u00fchrung: Hinteres Knie Richtung Boden, aufrichten.\n\nFokus: Beine/Glutes, stabiler Core." },
    { name:"Step-Up", type:"Unilateral", group:"Legs", recSets:3, recReps:10, description:"Setup: Stabiler Hocker/Step.\n\nAusf\u00fchrung: Hochdr\u00fccken \u00fcber vorderes Bein.\n\nFokus: Glutes/Quads." },
    { name:"Single-Leg RDL", type:"Unilateral", group:"Legs", recSets:3, recReps:10, description:"Setup: Eine Hantel, Standbein leicht gebeugt.\n\nAusf\u00fchrung: H\u00fcfte nach hinten, freie H\u00fcfte bleibt gerade.\n\nFokus: Hamstrings/Balance." },
    { name:"1-Arm DB Floor Press", type:"Unilateral", group:"Push", recSets:3, recReps:10, description:"Setup: Floor Press, eine Hantel.\n\nAusf\u00fchrung: Dr\u00fccken ohne Rotation.\n\nFokus: Brust + Anti-Rotation Core." },
    { name:"1-Arm DB Shoulder Press", type:"Unilateral", group:"Push", recSets:3, recReps:10, description:"Setup: Stand, eine Hantel.\n\nAusf\u00fchrung: Gerade nach oben, Rumpf stabil.\n\nFokus: Schulter + Core." },
    { name:"DB Lateral Raise", type:"Unilateral", group:"Push", recSets:3, recReps:12, description:"Setup: Leichte Hanteln.\n\nAusf\u00fchrung: Arme seitlich bis Schulterh\u00f6he.\n\nFokus: Side Delts, sauber." },
    { name:"DB Curl", type:"Unilateral", group:"Pull", recSets:3, recReps:12, description:"Setup: Ellenbogen nah am K\u00f6rper.\n\nAusf\u00fchrung: Hochcurlen ohne Schwung.\n\nFokus: Bizeps." },
    { name:"DB Hammer Curl", type:"Unilateral", group:"Pull", recSets:3, recReps:12, description:"Setup: Neutralgriff.\n\nAusf\u00fchrung: Kontrolliert hoch.\n\nFokus: Brachialis/Unterarm." },
    { name:"1-Arm DB Triceps Extension", type:"Unilateral", group:"Push", recSets:3, recReps:12, description:"Setup: Hantel \u00fcber Kopf.\n\nAusf\u00fchrung: Ellenbogen eng, strecken.\n\nFokus: Trizeps." },
    { name:"Plank", type:"Core", group:"Core", recSets:3, recReps:45, description:"Setup: Unterarme am Boden.\n\nAusf\u00fchrung: Ganzk\u00f6rper Spannung, neutral.\n\nFokus: Core Stabilit\u00e4t." },
    { name:"Side Plank", type:"Core", group:"Core", recSets:3, recReps:30, description:"Setup: Seitst\u00fctz.\n\nAusf\u00fchrung: H\u00fcfte hoch, gerade Linie.\n\nFokus: Obliques." },
    { name:"Dead Bug", type:"Core", group:"Core", recSets:3, recReps:10, description:"Setup: R\u00fcckenlage, Beine 90\u00b0.\n\nAusf\u00fchrung: Gegengleich Arm/Bein strecken.\n\nFokus: Anti-Extension." },
    { name:"Hollow Hold", type:"Core", group:"Core", recSets:3, recReps:25, description:"Setup: R\u00fcckenlage.\n\nAusf\u00fchrung: R\u00fccken flach, Beine/Arme gestreckt.\n\nFokus: Core/Frontline." },
    { name:"Glute Bridge March", type:"Core", group:"Core", recSets:3, recReps:12, description:"Setup: Bridge Position.\n\nAusf\u00fchrung: Abwechselnd Knie anheben, H\u00fcfte stabil.\n\nFokus: Core + Glutes." },
    { name:"DB Russian Twist", type:"Core", group:"Core", recSets:3, recReps:20, description:"Setup: Sitz, leichter Lean.\n\nAusf\u00fchrung: Rotieren ohne Rundr\u00fccken.\n\nFokus: Rotation control." },
    { name:"Bird Dog", type:"Core", group:"Core", recSets:3, recReps:10, description:"Setup: Vierf\u00fc\u00dfler.\n\nAusf\u00fchrung: Gegengleich strecken, stabil.\n\nFokus: Anti-Rotation." },
    { name:"DB Thruster", type:"Conditioning", group:"Full", recSets:4, recReps:10, description:"Setup: Goblet/2 DB.\n\nAusf\u00fchrung: Kniebeuge \u2192 direkt Press.\n\nFokus: Ganzk\u00f6rper + Puls." },
    { name:"Burpees", type:"Conditioning", group:"Full", recSets:3, recReps:12, description:"Setup: Stand.\n\nAusf\u00fchrung: Squat \u2192 Plank \u2192 zur\u00fcck \u2192 Sprung.\n\nFokus: Kondition." },
    { name:"Mountain Climbers", type:"Conditioning", group:"Core", recSets:3, recReps:40, description:"Setup: Plank.\n\nAusf\u00fchrung: Knie schnell zur Brust.\n\nFokus: Core + Cardio." },
    { name:"Jumping Jacks", type:"Conditioning", group:"End", recSets:3, recReps:60, description:"Setup: Stand.\n\nAusf\u00fchrung: Springen, Arme/Beine.\n\nFokus: Puls hoch." },
    { name:"Shadow Boxing", type:"Conditioning", group:"End", recSets:5, recReps:60, description:"Setup: Timer.\n\nAusf\u00fchrung: Locker bewegen, Kombinationen.\n\nFokus: Cardio + Koordination." },
    { name:"High Knees", type:"Conditioning", group:"End", recSets:4, recReps:30, description:"Setup: Stand.\n\nAusf\u00fchrung: Knie hoch, schnell.\n\nFokus: Herz-Kreislauf." },
    { name:"Bear Crawl", type:"Conditioning", group:"Full", recSets:3, recReps:20, description:"Setup: Vierf\u00fc\u00dfler, Knie leicht off.\n\nAusf\u00fchrung: Vorw\u00e4rts krabbeln.\n\nFokus: Schulter/Core." },
    { name:"DB Complex A (RDL→Row→Clean→Press)", type:"Komplexe", group:"Full", recSets:3, recReps:6, description:"Setup: Leichte DB.\n\nAusf\u00fchrung: 1 Runde ohne Absetzen (RDL/Row/Clean/Press).\n\nFokus: Technik + Conditioning." },
    { name:"DB Complex B (Squat→Press→Lunge)", type:"Komplexe", group:"Full", recSets:3, recReps:6, description:"Setup: Moderate DB.\n\nAusf\u00fchrung: Squat, Press, Lunge L/R.\n\nFokus: Ganzk\u00f6rper." },
    { name:"Farmer Carry (In Place)", type:"Komplexe", group:"Full", recSets:4, recReps:45, description:"Setup: Zwei DB.\n\nAusf\u00fchrung: Auf der Stelle marschieren, Rumpf stabil.\n\nFokus: Grip + Core." },
    { name:"Walking (minutes)", type:"NEAT", group:"End", recSets:1, recReps:30, description:"Setup: Timer.\n\nAusf\u00fchrung: Z\u00fcgig gehen.\n\nFokus: Alltag aktiv halten." },
    { name:"Mobility Flow", type:"NEAT", group:"Full", recSets:1, recReps:12, description:"Setup: Matte.\n\nAusf\u00fchrung: H\u00fcfte/Brustwirbels\u00e4ule/Schulter mobilisieren.\n\nFokus: Beweglichkeit & Recovery." },
    { name:"Stretching (lower body)", type:"NEAT", group:"Legs", recSets:1, recReps:10, description:"Setup: Matte.\n\nAusf\u00fchrung: Hamstrings/Hip Flexors/Glutes.\n\nFokus: Recovery." }
  ];

  const TYPES = ["Mehrgelenkig","Unilateral","Core","Conditioning","Komplexe","NEAT"];

  window.IronQuestExercises = { EXERCISES, TYPES, list: EXERCISES };
})();
