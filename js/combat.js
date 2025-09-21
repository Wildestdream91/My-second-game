/* ======================
   combat.js — combats avec difficultés
   ====================== */
GameCore.ensureGameOrRedirect("index.html");

let E = null; // ennemi actuel

function currentScalars(){
  const diff = GameCore.getDifficulty?.() || "Normal";
  return Zones.getDifficultyScalars ? Zones.getDifficultyScalars(diff) : {enemy:{hp:1,dmg:1},reward:{xp:1,gold:1,drop:1,mfBonus:0,rarityBoost:null}};
}

function spawnEnemy(){
  const s = GameCore.state;
  const diff = GameCore.getDifficulty?.() || "Normal";
  const scal = currentScalars();

  // Zone actuelle
  const zoneId = s.currentZone || "a1-rogue-encampment";
  const lvl = Zones.enemyLevel ? Zones.enemyLevel(zoneId, diff) : (s.level||1);

  // Base HP/DMG : simple scaling sur le niveau, + scal difficulté
  const baseHP  = 20 + lvl * 10;
  const baseDMG = 3  + Math.floor(lvl * 0.8);

  E = {
    name: "Ennemi",
    level: lvl,
    maxHp: Math.floor(baseHP  * (scal.enemy?.hp  ?? 1)),
    hp:    0,
    dmg:   Math.floor(baseDMG * (scal.enemy?.dmg ?? 1)),
    boss: false,
    zoneId
  };
  E.hp = E.maxHp;

  // Si zone marquée boss → plus costaud
  const z = Zones.getZone ? Zones.getZone(zoneId) : null;
  if(z?.boss){ E.boss = true; E.name = (z.bossId||"Boss").toUpperCase(); E.maxHp = Math.floor(E.maxHp * 1.8); E.hp = E.maxHp; E.dmg = Math.floor(E.dmg * 1.6); }

  renderEnemy();
  GameCore.log?.(`👹 ${E.name} (Nv ${E.level}) apparaît.`);
}

function renderEnemy(){
  const c = document.getElementById("enemyCard");
  if(!c) return;
  if(!E){ c.innerHTML="<div class='muted'>Aucun ennemi.</div>"; return; }
  c.innerHTML = `
    <div><b>${E.name}</b> — Nv ${E.level} ${E.boss?"<span class='badge-ilvl'>Boss</span>":""}</div>
    <progress id="eHpBar" value="${E.hp}" max="${E.maxHp}"></progress>
    <div class="actions">
      <button class="btn primary" onclick="attack()">⚔️ Attaquer</button>
    </div>
  `;
}

function attack(){
  if(!E) return;
  // Jet d'attaque du joueur
  const atk = GameCore.atkTotal? GameCore.atkTotal() : (GameCore.effStr()+GameCore.state.level);
  const critChance = (GameCore.critTotal? GameCore.critTotal() : Math.floor(GameCore.effDex()/2));
  const isCrit = Math.random()*100 < critChance;
  const roll = Math.max(1, Math.floor(atk * (0.6 + Math.random()*0.8))); // 0.6x..1.4x
  const dmgToEnemy = isCrit ? Math.floor(roll*1.6) : roll;

  E.hp = Math.max(0, E.hp - dmgToEnemy);
  GameCore.log?.(`💥 Vous infligez ${dmgToEnemy}${isCrit?" (Crit)":""}.`);

  // Ennemi riposte s'il vit
  if(E.hp>0){
    const def = GameCore.defTotal? GameCore.defTotal() : Math.floor(GameCore.effDex() + GameCore.state.level/2);
    let dmg = Math.max(1, E.dmg - Math.floor(def*0.25));
    dmg = Math.floor(dmg * (0.85 + Math.random()*0.3)); // variance
    GameCore.state.hp = Math.max(0, GameCore.state.hp - dmg);
    GameCore.log?.(`🩸 L'ennemi vous touche pour ${dmg}.`);
  }

  // UI bars persos (si page présente)
  const s=GameCore.state;
  const hpFill=document.getElementById("barHpFill");
  const hpText=document.getElementById("barHpText");
  if(hpFill) hpFill.style.width=(s.hp/s.hpMax*100)+"%";
  if(hpText) hpText.textContent=`HP ${s.hp}/${s.hpMax}`;

  renderEnemy();

  // Fin combat ?
  if(E.hp<=0){ onEnemyKilled(); }
  else if(s.hp<=0){ onPlayerDead(); }

  GameCore.save?.();
}

function onEnemyKilled(){
  const scal = currentScalars();
  const lvl = E.level;

  // base XP / Or
  let baseXP = 8 + lvl * 6;
  let baseGold = 5 + lvl * 4;
  if(E.boss){ baseXP *= 3.5; baseGold *= 3.0; }

  // 👉 Application des taux admin
  const cfg = GameCore.getConfig?.() || {};
  const xpGain   = Math.floor(baseXP  * (scal.reward?.xp   ?? 1) * ((cfg.xpRate  ?? 100)/100));
  const goldGain = Math.floor(baseGold * (scal.reward?.gold ?? 1) * ((cfg.goldRate?? 100)/100));

  GameCore.addXP?.(xpGain);
  GameCore.addGold?.(goldGain);
  GameCore.log?.(`🏵️ Ennemi vaincu ! +${xpGain} XP, +${goldGain} or.`);

  // Loot avec contexte difficulté
  const mfEquip = GameCore.mfTotal? GameCore.mfTotal():0;
  const mfDiff  = scal.reward?.mfBonus || 0;
  const mfAdmin = cfg.mfRate || 0;
  const mf = mfEquip + mfDiff + mfAdmin;

  const ctx = {
    boss: E.boss,
    act: Zones.getZone ? (Zones.getZone(E.zoneId)?.act || 1) : 1,
    enemyLevel: E.level,
    dropBonus: (scal.reward?.drop || 1) * ((cfg.dropRate??100)/100),
    rarityBoost: scal.reward?.rarityBoost || null
  };
  if(typeof Loot?.generateLoot === "function"){
    Loot.generateLoot(mf, ctx);
  }

  // Progression de boss
  const z = Zones.getZone ? Zones.getZone(E.zoneId) : null;
  if(z?.boss && z.bossId){
    GameCore.onBossDefeated?.(z.bossId);
  }

  spawnEnemy();
}

function onPlayerDead(){
  GameCore.log?.("💀 Vous êtes mort ! Récupération au campement.");
  const s=GameCore.state;
  s.hp = Math.floor(s.hpMax*0.5); // respawn 50%
  GameCore.save?.();
  spawnEnemy();
}

// init
(function initCombat(){
  if(!GameCore.isDifficultyUnlocked?.(GameCore.getDifficulty?.() || "Normal")){
    GameCore.setDifficulty?.("Normal");
  }
  if(!GameCore.state.currentZone){
    GameCore.state.currentZone="a1-rogue-encampment";
  }
  spawnEnemy();
})();
