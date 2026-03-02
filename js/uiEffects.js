(() => {
  "use strict";

  function ensureSystemOverlay(){
    let el = document.getElementById("systemOverlay");
    if (!el){
      el = document.createElement("div");
      el.id = "systemOverlay";
      el.style.position = "fixed";
      el.style.left = "12px";
      el.style.right = "12px";
      el.style.top = "12px";
      el.style.zIndex = "110";
      el.style.pointerEvents = "none";
      document.body.appendChild(el);
    }
    return el;
  }

  function systemMessage(lines, ms=2600){
    const host = ensureSystemOverlay();
    const box = document.createElement("div");
    box.className = "systemPanel";
    box.style.pointerEvents = "none";
    box.style.marginBottom = "10px";
    const text = Array.isArray(lines) ? lines.join("\n") : String(lines||"");
    box.innerHTML = `
      <div class="sysHead">[ SYSTEM ]</div>
      <div class="sysBody">${escapeHTML(text)}</div>
    `;
    host.appendChild(box);
    setTimeout(()=>{ box.style.opacity="0"; box.style.transform="translateY(-6px)"; }, ms);
    setTimeout(()=>{ box.remove(); }, ms+380);
  }

  function escapeHTML(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  window.UIEffects = { systemMessage };
})();
