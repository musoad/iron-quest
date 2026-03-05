(() => {
  "use strict";

  function el(tag, attrs={}, children=[]){
    const n = document.createElement(tag);
    for(const [k,v] of Object.entries(attrs||{})){
      if(k === "class") n.className = v;
      else if(k === "html") n.innerHTML = v;
      else if(k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, String(v));
    }
    for(const c of (children||[])){
      if(c == null) continue;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return n;
  }

  function card(title, bodyHtml){
    return el("div", { class:"card", html: `
      ${title ? `<div class="card-title">${title}</div>` : ""}
      <div class="card-body">${bodyHtml||""}</div>
    `});
  }

  function button(label, opts={}){
    const b = el("button", { class: "btn " + (opts.kind||"") }, [label]);
    if(opts.onClick) b.addEventListener("click", opts.onClick);
    if(opts.title) b.title = opts.title;
    if(opts.disabled) b.disabled = true;
    return b;
  }

  function pill(text){
    return el("span", { class:"pill" }, [text]);
  }

  function progressBar(pct){
    const p = Math.max(0, Math.min(1, Number(pct)||0));
    return el("div", { class:"progress" }, [
      el("div", { class:"progress-fill", style:`width:${Math.round(p*100)}%` })
    ]);
  }

  window.UI = { el, card, button, pill, progressBar };
})();
