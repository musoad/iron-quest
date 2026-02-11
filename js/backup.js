window.BackupSystem = (() => {

function exportBackup() {
    const data = {
        localStorage: {...localStorage},
        timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "ironquest-backup.json";
    a.click();
}

function importBackup(file) {
    const reader = new FileReader();
    reader.onload = e => {
        const data = JSON.parse(e.target.result);
        Object.entries(data.localStorage).forEach(([k,v]) => {
            localStorage.setItem(k,v);
        });
        alert("Backup erfolgreich importiert.");
        location.reload();
    };
    reader.readAsText(file);
}

return {
    exportBackup,
    importBackup
};

})();
