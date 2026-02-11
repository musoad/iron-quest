window.Attributes = (() => {

let state = {
    STR: 0,
    END: 0,
    STA: 0,
    MOB: 0
};

function addXP(type, xp) {
    if (!state[type]) return;
    state[type] += xp;
    save();
}

function levelFromXP(xp) {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function getLevels() {
    return {
        STR: levelFromXP(state.STR),
        END: levelFromXP(state.END),
        STA: levelFromXP(state.STA),
        MOB: levelFromXP(state.MOB)
    };
}

function save() {
    localStorage.setItem("iq_attributes", JSON.stringify(state));
}

function load() {
    const s = localStorage.getItem("iq_attributes");
    if (s) state = JSON.parse(s);
}

load();

return {
    addXP,
    getLevels,
    state
};

})();
