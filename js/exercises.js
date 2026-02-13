(function(){
  const EX = [
    { name:"DB Floor Press (neutral)", type:"Mehrgelenkig", desc:"Brust/Trizeps, stabil & schulterfreundlich.", recSets:"4", recReps:"8-12" },
    { name:"DB Bench Press", type:"Mehrgelenkig", desc:"Brust/Trizeps, klassisch.", recSets:"4", recReps:"8-12" },
    { name:"Arnold Press", type:"Mehrgelenkig", desc:"Schulter rundum, Kontrolle.", recSets:"3-4", recReps:"8-12" },
    { name:"DB Overhead Press", type:"Mehrgelenkig", desc:"Schulter/Trizeps, streng.", recSets:"3-4", recReps:"6-10" },
    { name:"Deficit Push-Ups", type:"Mehrgelenkig", desc:"Push-up mit mehr ROM, Brust/Trizeps.", recSets:"3-4", recReps:"10-20" },
    { name:"Close-Grip Push-Ups", type:"Mehrgelenkig", desc:"Trizeps-Fokus.", recSets:"3-4", recReps:"10-20" },
    { name:"Overhead Trizeps Extension", type:"Mehrgelenkig", desc:"Trizeps langer Kopf.", recSets:"3", recReps:"10-15" },
    { name:"DB Skull Crushers (Floor)", type:"Mehrgelenkig", desc:"Trizeps, sauber.", recSets:"3", recReps:"10-15" },
    { name:"DB Lateral Raises", type:"Mehrgelenkig", desc:"Seitliche Schulter, langsam.", recSets:"3", recReps:"12-20" },

    { name:"1-Arm DB Row (Pause oben)", type:"Unilateral", desc:"Rücken/Lat, Pause oben.", recSets:"4", recReps:"8-12" },
    { name:"Renegade Rows", type:"Unilateral", desc:"Rücken + Core Anti-Rotation.", recSets:"3-4", recReps:"6-10/Seite" },
    { name:"Reverse Flys (langsam)", type:"Mehrgelenkig", desc:"Rear Delt/Upper Back.", recSets:"3", recReps:"12-20" },
    { name:"DB Pullover", type:"Mehrgelenkig", desc:"Lat/Brustkorb, Dehnung.", recSets:"3", recReps:"10-15" },
    { name:"DB Supinated Curl", type:"Mehrgelenkig", desc:"Bizeps, Supination.", recSets:"3", recReps:"8-12" },
    { name:"Cross-Body Hammer Curl", type:"Mehrgelenkig", desc:"Brachialis/Unterarm.", recSets:"3", recReps:"10-15" },
    { name:"Farmer’s Carry (DB)", type:"Unilateral", desc:"Grip/Traps/Core – Carry.", recSets:"3", recReps:"30-60s" },

    { name:"Bulgarian Split Squats", type:"Unilateral", desc:"Quads/Glute, brutal effektiv.", recSets:"4", recReps:"8-12/Seite" },
    { name:"DB Romanian Deadlift", type:"Mehrgelenkig", desc:"Hamstrings/Glute, Hip hinge.", recSets:"4", recReps:"6-10" },
    { name:"Goblet Squat", type:"Mehrgelenkig", desc:"Quads/Glute, aufrecht.", recSets:"4", recReps:"8-12" },
    { name:"Hip Thrust (Floor)", type:"Mehrgelenkig", desc:"Glute, Peak contraction.", recSets:"3-4", recReps:"10-15" },
    { name:"Side Plank + Leg Raise", type:"Core", desc:"Core + Glute med.", recSets:"3", recReps:"30-45s/Seite" },
    { name:"Dead Bug", type:"Core", desc:"Core Kontrolle, Rücken neutral.", recSets:"3", recReps:"8-12/Seite" },
    { name:"Standing DB Calf Raises", type:"Core", desc:"Waden, oben halten.", recSets:"3-4", recReps:"15-25" },

    { name:"Komplex: Deadlift", type:"Komplexe", desc:"Komplex-Teil – Technik vor Tempo.", recSets:"5-6 Runden", recReps:"6" },
    { name:"Komplex: Clean", type:"Komplexe", desc:"Explosiv, sauber.", recSets:"5-6 Runden", recReps:"6" },
    { name:"Komplex: Front Squat", type:"Komplexe", desc:"Core/Quads, aufrecht.", recSets:"5-6 Runden", recReps:"6" },
    { name:"Komplex: Push Press", type:"Komplexe", desc:"Power + Schulter.", recSets:"5-6 Runden", recReps:"6" },
    { name:"DB Thrusters", type:"Komplexe", desc:"Fullbody + Conditioning.", recSets:"4-6", recReps:"8-12" },
    { name:"Plank Shoulder Taps", type:"Core", desc:"Core Anti-Rotation.", recSets:"3-4", recReps:"20-40" },

    { name:"Burpees", type:"Conditioning", desc:"Ganzkörper, Puls hoch.", recSets:"5", recReps:"30-40s" },
    { name:"Mountain Climbers", type:"Conditioning", desc:"Core + Conditioning.", recSets:"5", recReps:"30-40s" },
    { name:"High Knees", type:"Conditioning", desc:"Cardio, Knie hoch.", recSets:"5", recReps:"30-40s" },
    { name:"Jumping Jacks", type:"Conditioning", desc:"Einsteiger Cardio.", recSets:"5", recReps:"40-60s" },

    { name:"Walking Desk (Laufband 3 km/h)", type:"NEAT", desc:"Alltagsschritte/Zone2.", recSets:"—", recReps:"Minuten" },
    { name:"Ruhetag (Recovery + Mobility)", type:"Rest", desc:"Mobility + Spaziergang.", recSets:"—", recReps:"10-20 Min" },
  ];

  function all(){ return EX.slice(); }
  function byName(name){ return EX.find(e => e.name === name) || null; }

  window.IronQuestExercises = { all, byName };
})();
