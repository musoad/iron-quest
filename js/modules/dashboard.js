// js/modules/dashboard.js

export function render(container, state) {

  container.innerHTML = `
    <section>
      <h2>Dashboard</h2>
      <p>Level: ${state.level}</p>
      <p>XP: ${state.xp}</p>
    </section>
  `
}
