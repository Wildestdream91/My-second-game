/* combat.js — boucle combat simple + gains & drops */
const Combat = (() => {
  let current = null; // ennemi courant
  let interval = null;

  function randomBetween(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }

  function spawn(){
    const s=GameCore.state;
    const z = Zones.getZone(s.currentZone) || { zl:1, baseXP:10, baseGold:5, nameFR:"Zone inconnue" };
    const diff = Zones.getDifficultyScalars(GameCore.getDifficulty());
    const namePool = ["Décharné","Sombre rôdeur","Corrompu","Démon mineur","Esprit vengeur","Chauve-souris du sang","Goule","Spectre","Fétiche","Guerrier déchu"];
    const n = namePool[Math.floor(Math.random()*namePool.length)];

    // HP/Dégâts ennemis scalés par zone & difficulté
    const baseHP  = Math.max(12, z.zl*6);
    const baseDMG = Math.max(3, Math.floor(z.zl*0.8));
    current = {
      name: `${n} (Z${z.zl})`,
      hpMax: Math.floor(baseHP * (diff.enemy.hp||1)),
      hp:    Math.floor(baseHP * (diff.enemy.hp||1)),
      dmg:   Math.floor(baseDMG * (diff.enemy.dmg||1)),
      zone: z
    };
    renderEnemy();
    GameCore.log(`Un ${current.name} apparaît.`);
  }

  function renderEnemy(){
    const c = document.getElementById("enemyCard"); if(!c) return;
    if(!current){ c.innerHTML = `<div class="muted">Aucun ennemi. Choisis une zone puis <b>Aller</b>.</div>`; return; }
    const hpPct = Math.max(0, Math.min(100, Math.round(current.hp/current.hpMax*100)));
    c.innerHTML = `
      <div class="name">${current.name}</div>
      <div class="hpbar"><div class="hpfill" style="width:${hpPct}%"></div></div>
      <div class="muted small">DMG ${current.dmg} • PV ${current.hp}/${current.hpMax}</div>
      <div style="display:flex;gap:8px;margin-top:6px">
        <button class="btn primary" id="btnAttack">Attaquer</button>
        <button class="btn" id="btnAuto">${interval?'Arrêter':'Auto'}</button>
      </div>
    `;
    document.getElementById("btnAttack").onclick = attackOnce;
    document.getElementById("btnAuto").onclick = toggleAuto;
  }

  function playerAttackDamage(){
    const base = GameCore.atkTotal();
    // jet de dés : 70%..130% du total, et critique selon %crit
    let dmg = Math.max(1, Math.floor(base * (0.7 + Math.random()*0.6)));
    const critRoll = Math.random()*100 < (GameCore.critTotal()||0);
    if(critRoll) dmg = Math.floor(dmg*1.5);
    return dmg;
  }

  function enemyAttackDamage(){
    const s=GameCore.state;
    const def = GameCore.defTotal();
    let dmg = Math.max(1, current.dmg - Math.floor(def*0.25));
    // petite variance
    dmg = Math.max(1, Math.floor(dmg * (0.85 + Math.random()*0.3)));
    return dmg;
  }

  function giveRewards(z){
    const cfg=GameCore.getConfig();
    const diff=Zones.getDifficultyScalars(GameCore.getDifficulty());
    // XP/Gold scalés difficulté + admin
    const xpGain = Math.max(1, Math.floor((z.baseXP || 10) * (diff.reward.xp||1) * ((cfg.xpRate||100)/100)));
    const goldGain = Math.max(1, Math.floor((z.baseGold || 5) * (diff.reward.gold||1) * ((cfg.goldRate||100)/100)));
    GameCore.addXP(xpGain); GameCore.addGold(goldGain);
    GameCore.log(`+${xpGain} XP, +${goldGain} or`);
    // Drop
    Loot.rollDrop(z);
  }

  function checkDeath(){
    if(current && current.hp<=0){
      GameCore.log(`${current.name} est vaincu !`);
      giveRewards(current.zone);
      // Boss gate (si zone boss)
      if(current.zone.boss && current.zone.bossId){
        GameCore.onBossDefeated(current.zone.bossId);
      }
      current=null; renderEnemy();
      // respawn après un court délai si auto
      if(interval){ setTimeout(spawn, 500); }
      return true;
    }
    return false;
  }

  function attackOnce(){
    if(!current) return;
    // Joueur frappe
    const dmgP = playerAttackDamage();
    current.hp = Math.max(0, current.hp - dmgP);
    GameCore.log(`Vous infligez ${dmgP} dégâts.`);
    renderEnemy();
    if(checkDeath()) return;

    // L'ennemi riposte
    const dmgE = enemyAttackDamage();
    const s=GameCore.state;
    s.hp = Math.max(0, s.hp - dmgE);
    GameCore.log(`Vous subissez ${dmgE} dégâts.`);
    if(s.hp<=0){
      // KO → petite pénalité & retour au camp
      GameCore.log(`💀 Vous tombez au combat ! Perte d'or mineure et retour au camp.`);
      s.gold = Math.max(0, Math.floor(s.gold*0.9)); // -10%
      s.hp = Math.max(1, Math.floor(s.hpMax*0.5));
      GameCore.save();
      current=null; renderEnemy();
      if(interval) toggleAuto(); // stop auto
      return;
    }
    GameCore.save();
  }

  function toggleAuto(){
    if(interval){
      clearInterval(interval); interval=null;
      GameCore.log("Auto OFF");
      renderEnemy();
    }else{
      if(!current) spawn();
      interval = setInterval(()=>{ attackOnce(); }, 950);
      GameCore.log("Auto ON");
      renderEnemy();
    }
  }

  // ----- Initialisation à l’arrivée sur game.html -----
  (function init(){
    // spawn direct si une zone est déjà sélectionnée
    spawn();
  })();

  return { spawn, attackOnce, toggleAuto };
})();
