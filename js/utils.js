(() => {
  const Utils = {
    isoDate(d = new Date()) {
      return new Date(d).toISOString().slice(0, 10);
    },
    clamp(n, a, b) {
      return Math.max(a, Math.min(b, n));
    }
  };
  window.Utils = Utils;
})();
