(() => {
  "use strict";

  // Polyfill for older iOS Safari
  if (!String.prototype.replaceAll) {
    // eslint-disable-next-line no-extend-native
    String.prototype.replaceAll = function(search, replacement){
      const target = String(this);
      const s = String(search);
      if (s === "") return target;
      return target.split(s).join(String(replacement));
    };
  }

  window.Utils = {
    isoDate(d=new Date()){ return new Date(d).toISOString().slice(0,10); },
    clamp(n,a,b){ return Math.max(a, Math.min(b,n)); },
    addDays(date, days){ const d=new Date(date); d.setDate(d.getDate()+Number(days||0)); return d; },
    uid(){ return Math.random().toString(16).slice(2)+Date.now().toString(16); },
    fmt(n){ return String(Math.round(Number(n||0))); }
  };
})();
