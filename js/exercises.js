// js/exercises.js
window.Exercises = (function(){
  // Woche->Block Logik ist in Progression (recommendedSets/Reps dort dynamisch)
  const LIST = [
    { name:"DB Floor Press (neutral)", type:"Mehrgelenkig", group:"Push", desc:"Auf dem Boden drücken, Ellbogen kontrolliert, neutraler Griff, Schulterblätter hinten/unten." },
    { name:"Arnold Press", type:"Mehrgelenkig", group:"Push", desc:"Sitzend/stehend. Rotation unten→oben, Core fest, keine Hohlkreuz-Überstreckung." },
    { name:"Deficit Push-Ups", type:"Mehrgelenkig", group:"Push", desc:"Hände erhöht (z. B. auf Griffen), tiefere ROM, Rumpf wie Brett." },
    { name:"Overhead Trizeps Extension", type:"Mehrgelenkig", group:"Push", desc:"Ellbogen eng, Schulter stabil, kontrolliert absenken, oben strecken." },
    { name:"DB Lateral Raises", type:"Mehrgelenkig", group:"Push", desc:"Leicht vorgebeugt, Ellbogen leicht gebeugt, bis Schulterhöhe, kontrolliert." },

    { name:"1-Arm DB Row (Pause oben)", type:"Unilateral", group:"Pull", desc:"Rücken neutral, Zug zur Hüfte, oben 1s halten, Schulterblatt aktiv." },
    { name:"Renegade Rows", type:"Unilateral", group:"Pull", desc:"Plank-Position, abwechselnd Rudern, Hüfte ruhig, Core maximal fest." },
    { name:"Reverse Flys (langsam)", type:"Mehrgelenkig", group:"Pull", desc:"Brust auf Hüfte, Arme leicht gebeugt, hinten zusammen, langsam zurück." },
    { name:"DB Supinated Curl", type:"Mehrgelenkig", group:"Pull", desc:"Handflächen oben, Ellbogen ruhig, volle Streckung unten, ohne Schwung." },
    { name:"Farmer’s Carry (DB)", type:"Unilateral", group:"Pull", desc:"Aufrecht gehen, Schultern tief, Core fest, Griff halten, gleichmäßig atmen." },

    { name:"Bulgarian Split Squats", type:"Unilateral", group:"Legs", desc:"Hinteres Bein erhöht, Knie folgt Fuß, Oberkörper leicht vor, sauber tief." },
    { name:"DB Romanian Deadlift", type:"Mehrgelenkig", group:"Legs", desc:"Hüfte nach hinten, Rücken neutral, Hanteln nah am Körper, Stretch Hamstrings." },
    { name:"Goblet Squat", type:"Mehrgelenkig", group:"Legs", desc:"Hantel vor Brust, Ellbogen innen, tief sitzen, Knie raus, Brust stolz." },
    { name:"Side Plank + Leg Raise", type:"Core", group:"Legs", desc:"Seitstütz, Hüfte hoch, optional Beinheben, Körperlinie stabil." },
    { name:"Standing DB Calf Raises", type:"Core", group:"Legs", desc:"Voller Bewegungsweg, oben 1s halten, langsam absenken." },

    { name:"Komplex: Deadlift", type:"Komplexe", group:"Fullbody", desc:"Teil eines Komplexes. Technik zuerst. Neutraler Rücken, Hinge Pattern." },
    { name:"Komplex: Clean", type:"Komplexe", group:"Fullbody", desc:"Explosiv aus Hüfte, Hanteln nah, sauber fangen, Core fest." },
    { name:"Komplex: Front Squat", type:"Komplexe", group:"Fullbody", desc:"Ellbogen hoch, Brust aufrecht, Knie nach außen, tief & stabil." },
    { name:"Komplex: Push Press", type:"Komplexe", group:"Fullbody", desc:"Dip&Drive, Hüfte/Beine helfen, oben stabil fixieren." },
    { name:"Plank Shoulder Taps", type:"Core", group:"Fullbody", desc:"Plank, abwechselnd Schulter antippen, Hüfte ruhig, Spannung halten." },

    { name:"Burpees", type:"Conditioning", group:"Conditioning", desc:"Ganzkörper, Rhythmus finden, Landung weich, Atem kontrollieren." },
    { name:"Mountain Climbers", type:"Conditioning", group:"Conditioning", desc:"Plank, Knie zügig Richtung Brust, Schultern über Händen." },
    { name:"High Knees", type:"Conditioning", group:"Conditioning", desc:"Schnelle Kniehebeläufe, aufrecht, Arme aktiv." },
    { name:"Russian Twists (DB)", type:"Core", group:"Conditioning", desc:"Rumpf leicht zurück, Rotation aus Brustwirbelsäule, Hüfte stabil." },
    { name:"Hollow Body Hold", type:"Core", group:"Conditioning", desc:"LWS am Boden, Beine/Arme lang, Spannung halten, ruhig atmen." },

    { name:"Walking Desk (3 km/h)", type:"NEAT", group:"NEAT", desc:"Lockeres Gehen. Konstanz schlägt Intensität." },
    { name:"Jogging", type:"Jogging", group:"Jogging", desc:"Distanz + Zeit tracken. Ziel: Pace/Leistung verbessern, nicht überziehen." },

    { name:"Ruhetag (Recovery + Mobility)", type:"Rest", group:"Recovery", desc:"10–20 Min Mobility + Spaziergang. Fokus: Erholung." },
  ];

  function byName(name){
    return LIST.find(x=>x.name===name) || null;
  }

  function all(){
    return LIST.slice();
  }

  // Plan: fix (kannst du später noch editierbar machen)
  const WEEK_PLAN = {
    Mon: ["DB Floor Press (neutral)","Arnold Press","Deficit Push-Ups","Overhead Trizeps Extension","DB Lateral Raises"],
    Tue: ["1-Arm DB Row (Pause oben)","Renegade Rows","Reverse Flys (langsam)","DB Supinated Curl","Farmer’s Carry (DB)"],
    Wed: ["Ruhetag (Recovery + Mobility)"],
    Thu: ["Bulgarian Split Squats","DB Romanian Deadlift","Goblet Squat","Side Plank + Leg Raise","Standing DB Calf Raises"],
    Fri: ["Komplex: Deadlift","Komplex: Clean","Komplex: Front Squat","Komplex: Push Press","Plank Shoulder Taps"],
    Sat: ["Burpees","Mountain Climbers","High Knees","Russian Twists (DB)","Hollow Body Hold"],
    Sun: ["Ruhetag (Recovery + Mobility)"],
  };

  return { all, byName, WEEK_PLAN };
})();
