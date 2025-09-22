/* combat.js — boucle combat robuste */
(function(){
  const Combat = {};
  let current = null;
  let interval = null;

  function flash(selector, cls){
    const el = document.querySelector(selector);
    if(!el) return;
    el.classList.add(cls);
    setTimeout(()=>el.classList.remove(cls), 220);
  }

  function ensureReady(){
    if (!window.GameCore || !GameCore.state) { console.warn("[Combat] GameCore/state manquant"); return false; }
    if (!window.Zones) { console.warn("[Combat] Zones manquant"); return false; }
    return true;
  }

  function randomBetween(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }

  function spawn(){
    if(!ensureReady()) return;
    const s=GameCore.state;
    const z = Zones.getZone(s.currentZone) || { zl:1, baseXP:10, baseGold:5, nameFR:"Zone inconnue" };
    const diff = Zones.getDifficultyScalars(GameCore.getDifficulty());
    const names = ["Décharné","Sombre rôdeur","Corrompu","Démon mineur","Chauve-souris","Goule","Spectre","Fétiche","Guerrier déchu"];
    const n = names[Math.floor(Math.random()*names.length)];
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
    const c = document.getElementById("enemyCard");
    if(!c) return;
    if(!current){
      c.innerHTML = `<div class="muted">Aucun ennemi. Choisis une zone puis <b>Aller</b>.</div>`;
      return;
    }
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
    const ba = document.getElementById("btnAttack");
    const au = document.getElementById("btnAuto");
    if(ba) ba.onclick = attackOnce;
    if(au) au.onclick = toggleAuto;
  }

  function playerAttackDamage(){
    const base = GameCore.atkTotal ? GameCore.atkTotal() : 1;
    let dmg = Math.max(1, Math.floor(base * (0.7 + Math.random()*0.6)));
    const crit = Math.random()*100 < (GameCore.critTotal ? GameCore.critTotal() : 0);
    if(crit) dmg = Math.floor(dmg*1.5);
    return dmg;
  }

  function enemyAttackDamage(){
    const def = GameCore.defTotal ? GameCore.defTotal() : 0;
    let dmg = Math.max(1, current.dmg - Math.floor(def*0.25));
    dmg = Math.max(1, Math.floor(dmg * (0.9 + Math.random()*0.2)));
    return dmg;
  }

  function giveRewards(z){
    const diff = Zones.getDifficultyScalars(GameCore.getDifficulty());
    const cfg  = GameCore.getConfig?.() || {};
    const xpGain   = Math.max(1, Math.floor((z.baseXP||10) * (diff.reward.xp||1) * ((cfg.xpRate||100)/100)));
    const goldGain = Math.max(1, Math.floor((z.baseGold||5) * (diff.reward.gold||1) * ((cfg.goldRate||100)/100)));
    GameCore.addXP(xpGain); GameCore.addGold(goldGain);
    GameCore.log(`+${xpGain} XP, +${goldGain} or`);
    if(window.Loot && Loot.rollDrop) Loot.rollDrop(z);
  }

  function checkDeath(){
    if(current && current.hp<=0){
      GameCore.log(`${current.name} est vaincu !`);
      giveRewards(current.zone);
      if(current.zone.boss && current.zone.bossId){
        GameCore.onBossDefeated(current.zone.bossId);
      }
      current=null; renderEnemy();
      if(interval){ setTimeout(spawn, 450); }
      return true;
    }
    return false;
  }

  function attackOnce(){
    GameCore.initSFX && GameCore.initSFX();
    if(!current) return;
    const dmgP = playerAttackDamage();
    current.hp = Math.max(0, current.hp - dmgP);
    GameCore.playSFX && GameCore.playSFX('hit');
    // visuel
    const selEnemyBar = '#enemyCard .hpbar';
    flash(selEnemyBar, (dmgP>=Math.max(5, (current.dmg||1)*1.2)) ? 'crit' : 'hit');
    GameCore.log(`Vous infligez ${dmgP} dégâts.`);
    renderEnemy();
    if(checkDeath()) return;

    const dmgE = enemyAttackDamage();
    const s=GameCore.state;
    s.hp = Math.max(0, s.hp - dmgE);
    // flash barre HP joueur
    flash('.bar.hp', 'hit');
    GameCore.log(`Vous subissez ${dmgE} dégâts.`);
    if(s.hp<=0){
      GameCore.log(`💀 Vous tombez au combat ! -10% or, retour au camp.`);
      s.gold = Math.max(0, Math.floor(s.gold*0.9));
      s.hp = Math.max(1, Math.floor(s.hpMax*0.5));
      GameCore.save();
      current=null; renderEnemy();
      if(interval) toggleAuto();
      return;
    }
    GameCore.save();
  }

  function toggleAuto(){
    if(interval){
      clearInterval(interval); interval=null;
      localStorage.removeItem("idleARPG_auto");
      GameCore.log("Auto OFF");
      renderEnemy();
    }else{
      if(!current) spawn();
      interval = setInterval(attackOnce, 900);
      localStorage.setItem("idleARPG_auto","1");
      localStorage.setItem("idleARPG_lastTick", String(Date.now()));
      GameCore.log("Auto ON");
      renderEnemy();
    }
  }

  function fastForward(ms){
    const cap = Math.min(ms||0, 120000);
    const steps = Math.floor(cap / 900);
    if(steps <= 0) return;
    if(!current) spawn();
    for(let i=0;i<steps;i++){
      attackOnce();
      if(!current) spawn();
    }
  }

  // Expose
  window.Combat = { spawn, attackOnce, toggleAuto };
  // Autospawn au chargement de game.html (+ reprise auto)
  document.addEventListener("DOMContentLoaded", ()=>{
    if(document.getElementById("enemyCard")) spawn();
    const wasAuto = localStorage.getItem("idleARPG_auto")==="1";
    const last = Number(localStorage.getItem("idleARPG_lastTick")||"0");
    if(wasAuto && last>0){
      const delta = Date.now() - last;
      fastForward(delta);
      if(!interval){
        interval = setInterval(attackOnce, 900);
        GameCore.log("Auto ON (repris)");
      }
    }
    setInterval(()=>{
      if(interval) localStorage.setItem("idleARPG_lastTick", String(Date.now()));
    }, 3000);
  });
})();
