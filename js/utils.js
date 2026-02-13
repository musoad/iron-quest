(function(){
  function $(id){ return document.getElementById(id); }
  function isoDate(d){
    const x = (d instanceof Date) ? d : new Date(d);
    return new Date(x.getTime() - (x.getTimezoneOffset()*60000)).toISOString().slice(0,10);
  }
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
  function safeJSONParse(s, fallback){
    try{ return JSON.parse(s) ?? fallback; }catch{ return fallback; }
  }
  function loadJSON(key, fallback){
    return safeJSONParse(localStorage.getItem(key), fallback);
  }
  function saveJSON(key, val){
    localStorage.setItem(key, JSON.stringify(val));
  }

  window.IQ = { $, isoDate, clamp, loadJSON, saveJSON };
})();
