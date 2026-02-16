// js/core/router.js

export function createRouter(routes, onRouteChange) {

  function init() {
    document.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-route]")
      if (!tab) return

      const route = tab.dataset.route
      if (!routes.includes(route)) return

      onRouteChange(route)
    })

    onRouteChange("dashboard")
  }

  return { init }
}
