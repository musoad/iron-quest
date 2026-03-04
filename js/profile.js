(() => {
  "use strict";

  // Persistent profile settings (localStorage)
  const KEY_NAME = "ironquest.name";
  const KEY_CLASS = "ironquest.class";
  const KEY_START = "ironquest.startDate";
  const KEY_GENDER = "ironquest.gender";

  function getName() {
    return localStorage.getItem(KEY_NAME) || "Hunter";
  }

  function setName(name) {
    localStorage.setItem(KEY_NAME, String(name || "Hunter"));
  }

  function getClass() {
    return (localStorage.getItem(KEY_CLASS) || "unassigned").toLowerCase();
  }

  function setClass(cls) {
    localStorage.setItem(KEY_CLASS, String(cls || "unassigned").toLowerCase());
  }

  function getStartDate() {
    return localStorage.getItem(KEY_START) || "";
  }

  function setStartDate(v) {
    localStorage.setItem(KEY_START, String(v || ""));
  }

  function getGender() {
    return localStorage.getItem(KEY_GENDER) || "male";
  }

  function setGender(v) {
    const g = String(v || "male").toLowerCase();
    localStorage.setItem(KEY_GENDER, g === "female" ? "female" : "male");
  }

  window.IronQuestProfile = {
    getName,
    setName,
    getClass,
    setClass,
    getStartDate,
    setStartDate,
    getGender,
    setGender,
  };
})();
