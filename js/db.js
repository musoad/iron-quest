(function(){

const DB_KEY = "ironquest_entries";

function getAll(){
  return JSON.parse(localStorage.getItem(DB_KEY) || "[]");
}

function saveAll(entries){
  localStorage.setItem(DB_KEY, JSON.stringify(entries));
}

function add(entry){
  const entries = getAll();
  entry.id = Date.now();
  entries.push(entry);
  saveAll(entries);
}

function update(entry){
  const entries = getAll();
  const i = entries.findIndex(e=>e.id===entry.id);
  if(i>=0){
    entries[i] = entry;
    saveAll(entries);
  }
}

function remove(id){
  const entries = getAll().filter(e=>e.id!==id);
  saveAll(entries);
}

window.IronQuestDB = {
  getAll,
  add,
  update,
  remove
};

})();
