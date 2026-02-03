<script>
  // ✅ Fallback Tab-Navigation (funktioniert auch wenn app.js crasht)
  (function () {
    function activate(tabId) {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));

      const btn = document.querySelector(`.tab[data-tab="${tabId}"]`);
      const panel = document.getElementById("tab-" + tabId);

      if (btn) btn.classList.add("active");
      if (panel) panel.classList.add("active");

      // optional: URL hash setzen
      if (tabId) location.hash = tabId;
    }

    // Event Delegation (robust)
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      e.preventDefault();
      const tabId = btn.getAttribute("data-tab");
      activate(tabId);
    });

    // Beim Start: Hash nutzen
    const initial = (location.hash || "#dash").replace("#", "");
    activate(initial);
  })();
</script>
</body>
</html>
