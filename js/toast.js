(() => {
  "use strict";
  function ensureWrap(){
    let w=document.querySelector(".toastWrap");
    if(!w){ w=document.createElement("div"); w.className="toastWrap"; document.body.appendChild(w); }
    return w;
  }
  function toast(title, body="", ms=2400){
    const wrap=ensureWrap();
    const t=document.createElement("div");
    t.className="toast";
    t.innerHTML=`<div class="tTitle">${title}</div>${body?`<div class="tBody">${body}</div>`:""}`;
    wrap.appendChild(t);
    setTimeout(()=>{ t.style.opacity="0"; t.style.transform="translateY(6px)"; }, ms);
    setTimeout(()=>{ t.remove(); }, ms+380);
  }
  window.Toast={ toast };
})();
