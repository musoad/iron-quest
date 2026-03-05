(function(){

function toISODate(d){
  if(!d) return new Date().toISOString().slice(0,10);
  if(typeof d === "string" && d.length === 10) return d;
  try{
    return new Date(d).toISOString().slice(0,10);
  }catch(e){
    return new Date().toISOString().slice(0,10);
  }
}

function normalizeEntry(e){
  if(!e) return e;

  e.date = toISODate(e.date);

  if(typeof e.sets !== "number") e.sets = Number(e.sets) || 0;
  if(typeof e.reps !== "number") e.reps = Number(e.reps) || 0;

  if(e.km) e.km = Number(e.km) || 0;
  if(e.minutes) e.minutes = Number(e.minutes) || 0;

  if(!e.type){
    if(e.exercise === "Jogging") e.type = "Conditioning";
    else e.type = "Strength";
  }

  if(typeof e.xp !== "number" || isNaN(e.xp)){
    if(window.IronQuestXP){
      if(e.exercise === "Jogging"){
        e.xp = IronQuestXP.jogXP(e.km || 0, e.minutes || 0);
      }else{
        e.xp = IronQuestXP.calcExerciseXP(
          e.exercise,
          e.sets || 0,
          e.reps || 0
        );
      }
    }else{
      e.xp = 0;
    }
  }

  if(e.xp < 0) e.xp = 0;

  return e;
}

window.IronQuestSchema = {
  normalizeEntry
};

})();
