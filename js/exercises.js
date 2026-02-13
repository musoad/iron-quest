// js/exercises.js
window.Exercises = (function(){
  // helper: kurzer how-to text
  function how(text){ return text; }

  const list = [
    // PUSH
    { name:"DB Floor Press", type:"Mehrgelenkig", group:"Push", muscle:"Brust/Trizeps", desc:"Drücken am Boden – stabil, schulterfreundlich.",
      how: how("Rücken flach, Ellbogen ca. 45°. Hanteln kontrolliert runter bis Trizeps Boden berührt. Explosiv hoch, oben nicht überstrecken.") },

    { name:"DB Bench Press", type:"Mehrgelenkig", group:"Push", muscle:"Brust/Trizeps", desc:"Klassisches Drücken – mehr ROM als Floor Press.",
      how: how("Schulterblätter hinten/unten, leichte Brücke. Hanteln zur Brustlinie, dann hoch. Keine Schulter nach vorn rollen lassen.") },

    { name:"DB Overhead Press", type:"Mehrgelenkig", group:"Push", muscle:"Schulter/Trizeps", desc:"Überkopfdrücken – Core & Schulterkraft.",
      how: how("Rippen runter, Po anspannen. Hanteln über Kopf in Linie Ohr. Kein Hohlkreuz, Kopf leicht nach hinten/unter die Hantel.") },

    { name:"Arnold Press", type:"Mehrgelenkig", group:"Push", muscle:"Schulter", desc:"Rotation beim Drücken – vordere/seitliche Schulter.",
      how: how("Start Handflächen zu dir, beim Hochdrücken rotieren. Langsam ablassen, Schulter unten halten.") },

    { name:"Deficit Push-Ups", type:"Mehrgelenkig", group:"Push", muscle:"Brust/Trizeps", desc:"Liegestütz mit größerer Tiefe (Defizit).",
      how: how("Hände auf Erhöhung, Brust tiefer als Hände. Körper bleibt Brett, Ellbogen 30–45°. Sauberer Druck hoch.") },

    { name:"Close-Grip Push-Ups", type:"Mehrgelenkig", group:"Push", muscle:"Trizeps", desc:"Enger Liegestütz – mehr Trizeps.",
      how: how("Hände enger als Schulterbreit. Ellbogen nah am Körper. Kein Hüfte-Hängen, kontrolliert runter/hoch.") },

    { name:"Overhead Trizeps Extension", type:"Mehrgelenkig", group:"Push", muscle:"Trizeps", desc:"Trizeps über Kopf – langer Kopf Fokus.",
      how: how("Ellbogen eng, Oberarme fix. Hantel hinter Kopf ablassen, dann strecken. Core fest, kein Ausweichen.") },

    { name:"DB Skull Crushers", type:"Mehrgelenkig", group:"Push", muscle:"Trizeps", desc:"Trizepsstrecken – auf Boden/Bank.",
      how: how("Ellbogen zeigen nach oben. Unterarme bewegen, Oberarme bleiben. Langsam runter, explosiv hoch.") },

    { name:"DB Lateral Raises", type:"Mehrgelenkig", group:"Push", muscle:"Seitliche Schulter", desc:"Seitheben für Schulterbreite.",
      how: how("Leicht nach vorn lehnen, Ellbogen soft. Hoch bis Schulterhöhe, oben kurz halten, langsam ab.") },

    // PULL
    { name:"1-Arm DB Row", type:"Unilateral", group:"Pull", muscle:"Rücken/Lat", desc:"Einarmiges Rudern – Lat & Stabilität.",
      how: how("Rücken neutral, Hüfte fix. Zieh Ellbogen zur Hüfte. Oben 1s Pause, Schulter nicht hochziehen.") },

    { name:"Renegade Rows", type:"Unilateral", group:"Pull", muscle:"Rücken/Core", desc:"Rudern in Plank – Core + Rücken.",
      how: how("Füße breit, Becken stabil. Zieh Hantel ohne Rotation. Langsam absetzen, Brett bleibt stabil.") },

    { name:"Reverse Flys", type:"Mehrgelenkig", group:"Pull", muscle:"Rear Delt", desc:"Reverse Fly – hintere Schulter.",
      how: how("Hüfte beugen, Rücken neutral. Arme leicht gebeugt, nach außen ziehen. Oben kurz halten, langsam ab.") },

    { name:"DB Pullover", type:"Mehrgelenkig", group:"Pull", muscle:"Lat/Brustkorb", desc:"Pullover – Lat & Brustkorb.",
      how: how("Becken stabil, Hantel über Brust. Langsam hinter Kopf bis Dehnung, dann zurück. Kein Hohlkreuz.") },

    { name:"DB Curl (supinated)", type:"Mehrgelenkig", group:"Pull", muscle:"Bizeps", desc:"Bizepscurls – klassisch.",
      how: how("Ellbogen am Körper, keine Hüftschwünge. Hoch bis Spannung, langsam ablassen.") },

    { name:"Hammer Curl", type:"Mehrgelenkig", group:"Pull", muscle:"Bizeps/Brachialis", desc:"Hammer Curls – Griffkraft & Arm.",
      how: how("Neutraler Griff, Ellbogen fix. Kontrollierte Wiederholungen, kein Schwung.") },

    { name:"Farmer’s Carry", type:"Unilateral", group:"Pull", muscle:"Grip/Traps/Core", desc:"Tragen – Grip, Core, Haltung.",
      how: how("Aufrecht, Schulterblätter runter, Core fest. Kurze Schritte, nicht seitlich kippen.") },

    // LEGS + CORE
    { name:"Goblet Squat", type:"Mehrgelenkig", group:"Legs", muscle:"Quads/Glute", desc:"Goblet Squat – sauberer Squat Pattern.",
      how: how("Hantel vor Brust, Ellbogen runter. Knie folgen Zehen, tief in ROM, Brust stolz. Hoch über ganze Fußsohle.") },

    { name:"DB Romanian Deadlift", type:"Mehrgelenkig", group:"Legs", muscle:"Hamstrings/Glute", desc:"RDL – hintere Kette.",
      how: how("Hüfte nach hinten schieben, Rücken neutral. Hanteln nah am Körper, bis Hamstring-Dehnung, dann hoch.") },

    { name:"Bulgarian Split Squats", type:"Unilateral", group:"Legs", muscle:"Quads/Glute", desc:"Split Squat – brutal effektiv, unilateral.",
      how: how("Hinterfuß erhöht. Senkrecht runter, vorderes Knie folgt Zehen. Oberkörper leicht nach vorn, Druck über Mittelfuß.") },

    { name:"Side Plank", type:"Core", group:"Legs", muscle:"Core", desc:"Seitstütz – Anti-Rotation, Core.",
      how: how("Ellenbogen unter Schulter. Hüfte hoch, Körper Linie. Nicht nach vorn kippen, ruhig atmen.") },

    { name:"Dead Bug", type:"Core", group:"Legs", muscle:"Core", desc:"Dead Bug – Core Kontrolle.",
      how: how("LWS am Boden, Rippen runter. Arm/Bein langsam strecken ohne Hohlkreuz. Kontrolle > Tempo.") },

    // FULL BODY / COMPLEX
    { name:"DB Thrusters", type:"Komplexe", group:"Fullbody", muscle:"Fullbody", desc:"Squat + Press – metabolisch.",
      how: how("Tiefer Squat, explosiv hoch und direkt über Kopf drücken. Core fest, saubere Linie.") },

    { name:"Complex: DL→Clean→FS→PP", type:"Komplexe", group:"Fullbody", muscle:"Fullbody", desc:"Komplex – Kraft + Conditioning.",
      how: how("Gewicht moderat. Jede Rep sauber. Keine Hektik: Technik vor Tempo. Ruhige Übergänge.") },

    // CONDITIONING
    { name:"Burpees", type:"Conditioning", group:"Conditioning", muscle:"Metcon", desc:"Ganzkörper – Herz/Kreislauf.",
      how: how("Brust runter, Füße vor, sauberer Sprung/Stand. Rhythmus finden, nicht ausfransen.") },

    { name:"Mountain Climbers", type:"Conditioning", group:"Conditioning", muscle:"Metcon", desc:"Core + Puls.",
      how: how("Plank stabil, Knie zügig nach vorn. Hüfte tief, Schultern stabil.") },

    { name:"High Knees", type:"Conditioning", group:"Conditioning", muscle:"Metcon", desc:"Schnelle Kniehebeläufe – Puls hoch.",
      how: how("Aufrecht, Knie bis Hüfte, Arme aktiv. Kurze Bodenkontaktzeit.") },

    { name:"Jumping Jacks", type:"Conditioning", group:"Conditioning", muscle:"Metcon", desc:"Einfacher Cardio-Finisher.",
      how: how("Weich landen, Rhythmus halten, Schultern entspannt.") },

    // NEAT
    { name:"Walking Desk", type:"NEAT", group:"NEAT", muscle:"NEAT", desc:"Laufen am Band 3 km/h – Alltag XP.",
      how: how("Aufrecht gehen, lockere Arme. Ziel: konstante Minuten sammeln.") },

    // REST
    { name:"Recovery + Mobility", type:"Rest", group:"Rest", muscle:"Recovery", desc:"Ruhetag mit Mobility.",
      how: how("10–20 Min Mobility (Hüfte/Schulter/WS) + optional Spaziergang.") }
  ];

  function getAll(){ return list.slice(); }
  function getByName(name){ return list.find(x=>x.name===name) || null; }

  // Simple recommender (week + adaptive)
  function recommend(ex, week, adaptive){
    const type = ex?.type || "Mehrgelenkig";
    const w = Math.max(1, Number(week||1));
    const block = (w<=4)?1:(w<=8?2:3);

    let sets = 3, reps = "8–12";
    if(type==="Mehrgelenkig"){ sets = (block===1?3:(block===2?4:4)); reps = (block===1?"8–12":(block===2?"6–10":"5–8")); }
    if(type==="Unilateral"){ sets = (block===1?3:(block===2?4:4)); reps = (block===1?"8–12 je Seite":(block===2?"6–10 je Seite":"5–8 je Seite")); }
    if(type==="Core"){ sets = (block===1?3:4); reps = (block===1?"30–45s":"40–60s"); }
    if(type==="Conditioning"){ sets = (block===1?4:(block===2?5:5)); reps = (block===1?"30–40s / 60s Pause":(block===2?"35–45s / 45–60s":"40–45s / 30–45s")); }
    if(type==="Komplexe"){ sets = (block===1?4:(block===2?5:6)); reps = (block===1?"6–8 je Movement":(block===2?"6 je Movement":"5–6 je Movement")); }
    if(type==="NEAT"){ sets = null; reps = "30–60 Min"; }
    if(type==="Rest"){ sets = null; reps = "10–20 Min Mobility"; }

    // adaptive tweak
    const sd = adaptive?.setDelta || 0;
    if(sets!=null) sets = Math.max(1, sets + sd);

    return { sets, reps };
  }

  return { getAll, getByName, recommend };
})();
