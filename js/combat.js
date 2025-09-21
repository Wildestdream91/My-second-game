/* combat.js — boucle combat robuste + délégation UI */
const Combat = (() => {
  let current = null;     // ennemi courant
  let interval = null;    // auto-attaque
  const TICK = 950;

  const rnd = (a,b)=>Math.floor(a + Math.random()*(b-a+1));
  const byId = (id)=>document.getElementById(id);

  function enemyNamePool(){
    return ["Décharné","Sombre rôdeur","Corrompu","Démon mineur","Esprit vengeur","Chauve-souris du sang","Goule","Spectre","Fétiche","Guerrier déchu","Sangsue","Maraudeur","Fanatique","Garde corrompu","Charognard"];
  }

  function renderEnemy(){
    const c = byId("enemyCard"); if(!c) return;
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
  }

  function spawn(force=false){
    // force: vrai quand on change explicitement de zone
    try{
      const s = GameCore.state;
      if(!s){ console.warn("[Combat] pas d'état"); return; }
      const z = Zones.getZone(s.currentZone);
      if(!z){ console.warn("[Combat] zone inconnue", s.currentZone); renderEnemy(); return; }

      // Si on n'a pas de current et pas de force, on (re)génère. Si force, on change quoiqu'il arrive.
      if(current && !force) { renderEnemy(); return; }

      const diff = Zones.getDifficultyScalars(GameCore.getDifficulty());
      const baseHP  = Math.max(12, z.zl*6);
      const baseDMG = Math.max(3, Math.floor(z.zl*0.8));
      const n = enemyNamePool()[Math.floor(Math.random()*enemyNamePool().length)];

      current = {
        name: `${n} (Z${z.zl})`,
        hpMax: Math.floor(baseHP * (diff.enemy.hp||1)),
        hp:    Math.floor(baseHP * (diff.enemy.hp||1)),
        dmg:   Math.floor(baseDMG * (diff.enemy.dmg||1)),
        zone: z
      };
      renderEnemy();
      GameCore.log(`Un ${current.name} apparaît.`);
    }catch(e){
      console.error("[Combat.spawn] error:", e);
    }
  }

  function playerAttackDamage(){
    const base = GameCore.atkTotal?.() || 1;
    let dmg = Math.max(1, Math.floor(base * (0.7 + Math.random()*0.6)));
    const critRoll = Math.random()*100 < (GameCore.critTotal?.()||0);
    if(critRoll) dmg = Math.floor(dmg*1.5);
    return dmg;
  }

  function enemyAttackDamage(){
    const def = GameCore.defTotal?.() || 0;
    let dmg = Math.max(1, (current?.dmg||1) - Math.floor(def*0.25));
    dmg = Math.max(1, Math.floor(dmg * (0.85 + Math.random()*0.3)));
    return dmg;
  }

  function giveRewards(z){
    const cfg=GameCore.getConfig?.()||{};
    const diff=Zones.getDifficultyScalars(GameCore.getDifficulty?.()||"Normal");
    const xpGain   = Math.max(1, Math.floor((z.baseXP||10)   * (diff.reward?.xp||1)   * ((cfg.xpRate||100)/100)));
    const goldGain = Math.max(1, Math.floor((z.baseGold||5)  * (diff.reward?.gold||1) * ((cfg.goldRate||100)/100)));
    GameCore.addXP?.(xpGain); GameCore.addGold?.(goldGain);
    GameCore.log(`+${xpGain} XP, +${goldGain} or`);
    Loot.rollDrop?.(z);
  }

  function checkDeath(){
    if(current && current.hp<=0){
      GameCore.log(`${current.name} est vaincu !`);
      giveRewards(current.zone);
      if(current.zone.boss && current.zone.bossId){
        GameCore.onBossDefeated?.(current.zone.bossId);
      }
      current=null; renderEnemy();
      if(interval){ setTimeout(()=>spawn(false), 450); }
      return true;
    }
    return false;
  }

  function attackOnce(){
    if(!current){ spawn(false); return; }
    // Joueur frappe
    const dmgP = playerAttackDamage();
    current.hp = Math.max(0, current.hp - dmgP);
    GameCore.log(`Vous infligez ${dmgP} dégâts.`);
    renderEnemy();
    if(checkDeath()) return;

    // Riposte ennemie
    const dmgE = enemyAttackDamage();
    const s=GameCore.state;
    s.hp = Math.max(0, s.hp - dmgE);
    GameCore.log(`Vous subissez ${dmgE} dégâts.`);
    if(s.hp<=0){
      GameCore.log(`💀 Vous tombez au combat ! -10% or, retour au camp.`);
      s.gold = Math.max(0, Math.floor(s.gold*0.9));
      s.hp = Math.max(1, Math.floor(s.hpMax*0.5));
      GameCore.save?.();
      current=null; renderEnemy();
      if(interval) toggleAuto(); // stop auto
      return;
    }
    GameCore.save?.();
  }

  function toggleAuto(){
    if(interval){
      clearInterval(interval); interval=null;
      GameCore.log("Auto OFF");
      renderEnemy();
    }else{
      if(!current) spawn(false);
      interval = setInterval(()=>{ attackOnce(); }, TICK);
      GameCore.log("Auto ON");
      renderEnemy();
    }
  }

  // API publique
  return { spawn, attackOnce, toggleAuto };
})();
