(() => {
  "use strict";
  window.Utils = {
    isoDate(d = new Date()) { return new Date(d).toISOString().slice(0,10); },
    clamp(n,a,b){ return Math.max(a, Math.min(b,n)); },
    addDays(date, days){
      const d = new Date(date);
      d.setDate(d.getDate() + Number(days||0));
      return d;
    }
  };
})();
