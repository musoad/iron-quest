(function(){

  const XP = {};

  XP.calculateXP = function(entry){
    const base = entry.sets * entry.reps * 5;
    return base;
  };

  XP.getLevelFromXP = function(totalXP){
    return Math.floor(totalXP / 1000) + 1;
  };

  // ✅ NEU – Streak Berechnung für Challenges
  XP.streakFromEntries = function(entries){
    if(!entries || !entries.length) return 0;

    const days = new Set(
      entries.map(e => new Date(e.date).toDateString())
    );

    const sorted = Array.from(days)
      .map(d => new Date(d))
      .sort((a,b)=>b-a);

    let streak = 0;
    let current = new Date();

    for(let i=0;i<sorted.length;i++){
      const diff = Math.floor((current - sorted[i])/(1000*60*60*24));
      if(diff === streak){
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  window.IronQuestXP = XP;

})();
