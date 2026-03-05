(function(){

let snapshot = null;

async function buildSnapshot(){

  const entries = await IronDB.getAll("entries") || [];
  const runs = await IronDB.getAll("runs") || [];

  let totalXP = 0;
  let todayXP = 0;

  const today = new Date().toISOString().slice(0,10);

  entries.forEach(e=>{
    totalXP += e.xp || 0;
    if(e.date === today){
      todayXP += e.xp || 0;
    }
  });

  let level = 1;
  let xpNeeded = 500;

  while(totalXP > xpNeeded){
    totalXP -= xpNeeded;
    level++;
    xpNeeded = Math.floor(500 * Math.pow(level,1.2));
  }

  snapshot = {
    level,
    xp: totalXP,
    xpNext: xpNeeded,
    todayXP,
    entriesCount: entries.length,
    runsCount: runs.length
  };

  return snapshot;
}

async function getSnapshot(){
  if(snapshot) return snapshot;
  return await buildSnapshot();
}

function invalidate(){
  snapshot = null;
}

window.IronQuestState = {
  getSnapshot,
  invalidate
};

})();
