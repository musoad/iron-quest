(() => {
  "use strict";
  const KEY_NAME = "ironquest_profile_name_v9";
  const KEY_AVATAR = "ironquest_profile_avatar_v9"; // reserved for future

  function getName(){
    const n = (localStorage.getItem(KEY_NAME) || "").trim();
    return n || "Hunter";
  }
  function setName(name){
    const v = String(name || "").trim().slice(0, 22);
    localStorage.setItem(KEY_NAME, v);
    return v;
  }
  function getAvatar(){ return localStorage.getItem(KEY_AVATAR) || ""; }
  function setAvatar(v){ localStorage.setItem(KEY_AVATAR, String(v||"")); }

  window.IronQuestProfile = { getName, setName, getAvatar, setAvatar };
})();
