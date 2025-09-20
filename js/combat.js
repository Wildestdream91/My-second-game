/* ==========================================
   Idle ARPG v7.3 FR - combat.js
   ========================================== */

// Difficulté
const DIFFICULTIES={
  "Facile":{hp:0.8,dmg:0.8,def:0.9,xp:1.0,gold:1.0},
  "Normal":{hp:1.0,dmg:1.0,def:1.0,xp:1.0,gold:1.0},
  "Difficile":{hp:1.25,dmg:1.2,def:1.1,xp:1.1,gold:1.1},
  "Enfer":{hp:1.6,dmg:1.5,def:1.25,xp:1.25,gold:1.25}
};
function D(){const d=GameCore?.state?.difficulty||"Normal";return DIFFICULTIES[d]||DIFFICULTIES["Normal"];}

const Combat={
  enemy:null, auto:false, timer:null,
  // (les groupes / zones inchangés…)

  victory(){
    const e=this.enemy; if(!e) return; const act=e.act;
    // XP plus généreuse
    const baseXP = Math.round(12 + act*8 + e.level*0.9);
    const baseGold= 5+act*4+Math.floor(e.level/3);

    // Boss donnent plus
    const xpGain  = Math.floor((e.boss ? baseXP*6 : baseXP) * D().xp);
    const goldGain= Math.floor((e.boss ? baseGold*4 : baseGold) * D().gold);

    GameCore.addXP(xpGain); GameCore.addGold(goldGain);
    GameCore.log(`🏆 ${e.name} vaincu ! +${xpGain} XP, +${goldGain} or.`);

    if(e.boss&&["Andariel","Duriel","Méphisto","Diablo","Baal"].includes(e.name)){
      GameCore.state.bossesDefeated[e.name]=true;
      GameCore.log(`🔥 ${e.name} est tombé ! Acte suivant débloqué.`);
    }
    this.enemy=null; const card=document.getElementById("enemyCard"); if(card) card.hidden=true;
    GameCore.save(); GameCore.uiRefreshStatsIfPresent();
  },

  // (tout le reste inchangé : attack(), flee, toggleAuto, etc.)
};
