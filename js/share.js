(() => {
  "use strict";

  async function shareHunterCard(){
    const entries = await window.IronDB.getAllEntries();
    const totalXp = (entries||[]).reduce((s,e)=> s + Number(e.xp||0), 0);
    const L = window.IronQuestProgression.levelFromTotalXp(totalXp);
    const name = window.IronQuestProfile?.getName?.() || "Hunter";
    const cls = window.IronQuestClasses.meta(window.IronQuestClasses.get());
    const rankKey = window.IronQuestHunterRank.compute(L.lvl, totalXp);

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    // Background
    const g = ctx.createLinearGradient(0,0,1080,600);
    g.addColorStop(0, '#0b0b0c');
    g.addColorStop(1, '#111418');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,1080,600);

    // Accent panel
    ctx.fillStyle = 'rgba(76,255,155,0.08)';
    roundRect(ctx, 56, 56, 968, 488, 28, true);

    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '900 44px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText('IRON QUEST — HUNTER CARD', 92, 130);

    // Name
    ctx.font = '900 64px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText(String(name).slice(0,22), 92, 220);

    // Meta
    ctx.font = '700 34px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillText(`Rank: ${rankKey}`, 92, 285);
    ctx.fillText(`Class: ${cls.name}`, 92, 335);
    ctx.fillText(`Level: ${L.lvl}`, 92, 385);

    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = '600 28px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText(`Total XP: ${window.Utils.fmt(totalXp)}`, 92, 435);

    // XP bar
    const pct = Math.max(0, Math.min(1, (L.remainder / Math.max(1, L.nextNeed))));
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, 92, 465, 760, 22, 11, true);
    ctx.fillStyle = 'rgba(76,255,155,0.85)';
    roundRect(ctx, 92, 465, Math.max(12, 760*pct), 22, 11, true);

    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '600 22px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
    ctx.fillText('[ SYSTEM ] Keep training. Keep ascending.', 92, 526);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'ironquest-hunter-card.png', { type:'image/png' });

    // Web Share API (if available)
    if(navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
      await navigator.share({
        title: 'IRON QUEST — Hunter Card',
        text: 'My Hunter Card (IRON QUEST)',
        files: [file]
      });
      window.Toast?.toast('Share', 'Shared.');
      return;
    }

    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ironquest-hunter-card.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
    window.Toast?.toast('Share', 'Downloaded image.');
  }

  function roundRect(ctx, x, y, w, h, r, fill){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
    if(fill) ctx.fill();
  }

  window.IronQuestShare = { shareHunterCard };
})();
