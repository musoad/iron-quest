(function () {

console.log("APP START");

try {

  function $(id){ return document.getElementById(id); }

  function showTab(name){
    console.log("Switch to tab:", name);

    document.querySelectorAll(".tab").forEach(t=>{
      t.classList.remove("active");
    });

    const el = $(name);
    if(el){
      el.classList.add("active");
    } else {
      console.error("Tab not found:", name);
    }
  }

  function initNavigation(){
    console.log("Init navigation");

    document.querySelectorAll("nav button").forEach(btn=>{
      btn.addEventListener("click", function(){
        const tab = btn.getAttribute("data-tab");
        showTab(tab);
      });
    });
  }

  function renderDashboard(){
    const el = $("dashboard");
    if(!el) return;
    el.innerHTML = "<h2>Dashboard OK</h2>";
  }

  function renderLog(){
    const el = $("log");
    if(!el) return;
    el.innerHTML = "<h2>Log OK</h2>";
  }

  function renderSkills(){
    const el = $("skills");
    if(!el) return;
    el.innerHTML = "<h2>Skills OK</h2>";
  }

  function renderAnalytics(){
    const el = $("analytics");
    if(!el) return;
    el.innerHTML = "<h2>Analytics OK</h2>";
  }

  function renderHealth(){
    const el = $("health");
    if(!el) return;
    el.innerHTML = "<h2>Health OK</h2>";
  }

  function renderBoss(){
    const el = $("boss");
    if(!el) return;
    el.innerHTML = "<h2>Boss OK</h2>";
  }

  function renderChallenge(){
    const el = $("challenge");
    if(!el) return;
    el.innerHTML = "<h2>Challenge OK</h2>";
  }

  function init(){
    console.log("Init app");

    initNavigation();

    renderDashboard();
    renderLog();
    renderSkills();
    renderAnalytics();
    renderHealth();
    renderBoss();
    renderChallenge();

    showTab("dashboard");
  }

  document.addEventListener("DOMContentLoaded", init);

} catch (e) {
  console.error("APP CRASH:", e);
  alert("JS Fehler: " + e.message);
}

})();
