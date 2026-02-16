// js/core/renderEngine.js

export function render(route, module, state) {
  const root = document.getElementById("app-root")

  if (!module || !module.render) {
    root.innerHTML = `<p>Module ${route} not found.</p>`
    return
  }

  root.innerHTML = ""
  module.render(root, state)
}
