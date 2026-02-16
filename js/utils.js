(() => {
  "use strict";

  const Utils = {
    isoDate(d = new Date()) {
      return new Date(d).toISOString().slice(0, 10);
    },
    clamp(n, a, b) {
      return Math.max(a, Math.min(b, n));
    },
    addDays(date, days) {
      const d = new Date(date);
      d.setDate(d.getDate() + Number(days || 0));
      return d;
    },
    startOfWeekMonday(date = new Date()) {
      const d = new Date(date);
      const day = d.getDay(); // 0=So
      const diff = (day === 0 ? -6 : 1) - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  };

  window.Utils = Utils;
})();
