window.BossSystem = (() => {

const BOSSES = [
    { week: 2, name: "Foundation Beast", xp: 1000 },
    { week: 4, name: "Iron Destroyer", xp: 1500 },
    { week: 8, name: "Overlord", xp: 3000 }
];

let cleared = JSON.parse(localStorage.getItem("iq_boss") || "{}");

function getCurrentBoss(week) {
    return BOSSES.find(b => b.week === week);
}

function clearBoss(week) {
    const boss = getCurrentBoss(week);
    if (!boss) return;

    cleared[week] = true;
    localStorage.setItem("iq_boss", JSON.stringify(cleared));

    if (window.XPSystem) {
        XPSystem.addXP(boss.xp);
    }
}

function isCleared(week) {
    return !!cleared[week];
}

return {
    getCurrentBoss,
    clearBoss,
    isCleared
};

})();
