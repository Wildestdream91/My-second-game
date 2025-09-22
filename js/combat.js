/* combat.js — boss gating: le boss de la zone apparaît tant qu'il n'est pas vaincu */
(function(){
  var Combat = {};
  var current = null;
  var interval = null;

  function flash(selector, cls){
    var el = document.querySelector(selector);
    if(!el) return;
    el.classList.add(cls);
    setTimeout(function(){ el.classList.remove(cls); }, 220);
  }
  function clampPct(n){
    n = Math.max(0, Math.min(100, Math.round(n)));
    if (!isFinite(n)) return 0;
    return n;
  }
  function ensureReady(){
    if (!window.GameCore || !GameCore.state) { console.warn("[Combat] GameCore/state manquant"); return false; }
    if (!window.Zones) { console.warn("[Combat] Zones manquant"); return false; }
    return true;
  }

  // ---- Rendu joueur
  function renderPlayer(){
    if(!ensureReady()) return;
    var s = GameCore.state;
    var hpPct = clampPct((s.hp / (s.hpMax||1)) * 100);
    var mpPct = clampPct((s.mana / (s.manaMax||1)) * 100);
    var xpMax = (GameCore.xpTable && GameCore.xpTable[s.level]) || 1;
    var xpPct = clampPct((s.xp / xpMax) * 100);
    var el;

    el = document.getElementById('barHpFill'); if(el) el.style.width = hpPct + '%';
    el = document.getElementById('barHpText'); if(el) el.textContent = "HP " + s.hp + "/" + s.hpMax;
    el = document.getElementById('barManaFill'); if(el) el.style.width = mpPct + '%';
    el = document.getElementById('barManaText'); if(el) el.textContent = "Mana " + s.mana + "/" + s.manaMax;
    el = document.getElementById('barXpFill'); if(el) el.style.width = xpPct + '%';
    el = document.getElementById('barXpText'); if(el) el.textContent = "XP " + s.xp + "/" + xpMax;
  }
  function renderStats(){
    if(!ensureReady()) return;
    var el;
    el = document.getElementById('cAtk');  if(el) el.textContent = (GameCore.atkTotal && GameCore.atkTotal()) || 0;
    el = document.getElementById('cDef');  if(el) el.textContent = (GameCore.defTotal && GameCore.defTotal()) || 0;
    el = document.getElementById('cCrit'); if(el) el.textContent = (GameCore.critTotal && GameCore.critTotal()) || 0;
    el = document.getElementById('cMF');   if(el) el.textContent = (GameCore.mfTotal && GameCore.mfTotal()) || 0;
  }

  // ---- Spawn (boss si non vaincu)
  function spawn(forceLog){
    if(!ensureReady()) return;
    var s = GameCore.state;
    var z = Zones.getZone(s.currentZone);
    if(!z){ z = { zl:1, baseXP:10, baseGold:5, nameFR:"Zone inconnue" }; }
    var diff = Zones.getDifficultyScalars(GameCore.getDifficulty());

    var isBoss = false;
    var name;
    var baseHP, baseDMG;

    var bossAlreadyDead = z.bossId && !!(s.progress && s.progress.bosses && s.progress.bosses[z.bossId]);

    if(z.bossId && !bossAlreadyDead){
      isBoss = true;
      name = (z.bossName || "Boss de la zone") + " [BOSS]";
      baseHP  = Math.max(40, Math.floor(z.zl*10));
      baseDMG = Math.max(6,  Math.floor(z.zl*1.6));
    }else{
      var names = ["Décharné","Sombre rôdeur","Corrompu","Démon mineur","Chauve-souris","Goule","Spectre","Fétiche","Guerrier déchu"];
      name = names[Math.floor(Math.random()*names.length)] + " (Z" + z.zl + ")";
      baseHP  = Math.max(12, z.zl*6);
      baseDMG = Math.max(3, Math.floor(z.zl*0.8));
    }

    current = {
      name: name,
      isBoss: isBoss,
      hpMax: Math.floor(baseHP * (diff.enemy.hp||1)),
      hp:    Math.floor(baseHP * (diff.enemy.hp||1)),
      dmg:   Math.floor(baseDMG * (diff.enemy.dmg||1)),
      zone:  z
    };

    renderEnemy();
    if (forceLog !== false) GameCore.log((isBoss?"⚠️ ":"") + "Un " + current.name + " apparaît.");
  }

  function renderEnemy(){
    var c = document.getElementById("enemyCard");
    if(!c) return;
    if(!current){
      c.innerHTML = '<div class="muted">Aucun ennemi. Choisis une zone puis <b>Aller</b>.</div>';
      return;
    }
    var hpPct = clampPct(current.hp/current.hpMax*100);
    c.innerHTML = ''
      + '<div class="name">' + current.name + '</div>'
      + '<div class="hpbar"><div class="hpfill" style="width:'+hpPct+'%"></div></div>'
      + '<div class="muted small">DMG '+current.dmg+' • PV '+current.hp+'/'+current.hpMax+'</div>'
      + '<div style="display:flex;gap:8px;margin-top:6px">'
      + '  <button class="btn primary" id="btnAttack">Attaquer</button>'
      + '  <button class="btn" id="btnAuto">' + (interval?'Arrêter':'Auto') + '</button>'
      + '</div>';
    var ba = document.getElementById("btnAttack");
    var au = document.getElementById("btnAuto");
    if(ba) ba.onclick = attackOnce;
    if(au) au.onclick = toggleAuto;
  }

  // ---- Dégâts
  function playerAttackDamage(){
    var base = (GameCore.atkTotal && GameCore.atkTotal()) || 1;
    var dmg = Math.max(1, Math.floor(base * (0.7 + Math.random()*0.6)));
    var crit = Math.random()*100 < ((GameCore.critTotal && GameCore.critTotal()) || 0);
    if(crit) dmg = Math.floor(dmg*1.5);
    return dmg;
  }
  function enemyAttackDamage(){
    var def = (GameCore.defTotal && GameCore.defTotal()) || 0;
    var dmg = Math.max(1, current.dmg - Math.floor(def*0.25));
    dmg = Math.max(1, Math.floor(dmg * (0.9 + Math.random()*0.2)));
    return dmg;
  }

  // ---- Récompenses & mort
  function giveRewards(z){
    var diff = Zones.getDifficultyScalars(GameCore.getDifficulty());
    var cfg  = (GameCore.getConfig && GameCore.getConfig()) || {};
    var xpGain   = Math.max(1, Math.floor((z.baseXP||10)   * (diff.reward.xp||1)   * ((cfg.xpRate||100)/100)));
    var goldGain = Math.max(1, Math.floor((z.baseGold||5)  * (diff.reward.gold||1) * ((cfg.goldRate||100)/100)));
    GameCore.addXP(xpGain);
    GameCore.addGold(goldGain);
    GameCore.log("+"+xpGain+" XP, +"+goldGain+" or");
    if (window.Loot && Loot.rollDrop) Loot.rollDrop(z);
    renderPlayer();
  }

  function checkDeath(){
    if(current && current.hp<=0){
      GameCore.log(current.name + " est vaincu !");
      giveRewards(current.zone);
      if(current.isBoss){
        GameCore.markZoneBossDefeated(current.zone);
      }
      current=null; renderEnemy();
      if(interval){ setTimeout(spawn, 450); }
      return true;
    }
    return false;
  }

  // ---- Tour
  function attackOnce(){
    if(!current) return;
    GameCore.initSFX && GameCore.initSFX();

    var dmgP = playerAttackDamage();
    current.hp = Math.max(0, current.hp - dmgP);
    GameCore.playSFX && GameCore.playSFX('hit');
    flash('#enemyCard .hpbar', (dmgP>=Math.max(5, (current.dmg||1)*1.2)) ? 'crit' : 'hit');
    GameCore.log("Vous infligez " + dmgP + " dégâts.");
    renderEnemy();
    if(checkDeath()) return;

    var dmgE = enemyAttackDamage();
    var s = GameCore.state;
    s.hp = Math.max(0, s.hp - dmgE);
    flash('.bar.hp', 'hit');
    GameCore.log("Vous subissez " + dmgE + " dégâts.");

    if(s.hp<=0){
      GameCore.log("💀 Vous tombez au combat ! -10% or, retour au camp.");
      s.gold = Math.max(0, Math.floor(s.gold*0.9));
      s.hp = Math.max(1, Math.floor(s.hpMax*0.5));
      GameCore.save();
      current=null; renderEnemy();
      renderPlayer();
      if(interval) toggleAuto();
      return;
    }

    GameCore.save();
    renderPlayer();
  }

  // ---- Auto
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
    var cap = Math.min(ms||0, 120000);
    var steps = Math.floor(cap / 900);
    if(steps <= 0) return;
    if(!current) spawn();
    for(var i=0;i<steps;i++){
      attackOnce();
      if(!current) spawn();
    }
  }

  // ---- Expose & init
  Combat.spawn = spawn;
  Combat.attackOnce = attackOnce;
  Combat.toggleAuto = toggleAuto;
  window.Combat = Combat;

  document.addEventListener("DOMContentLoaded", function(){
    GameCore.ensureGameOrRedirect("index.html");
    if(!ensureReady()) return;

    renderStats();
    renderPlayer();

    if(document.getElementById("enemyCard")) spawn(false);

    var wasAuto = localStorage.getItem("idleARPG_auto")==="1";
    var last = Number(localStorage.getItem("idleARPG_lastTick")||"0");
    if(wasAuto && last>0){
      var delta = Date.now() - last;
      fastForward(delta);
      if(!interval){
        interval = setInterval(attackOnce, 900);
        GameCore.log("Auto ON (repris)");
      }
    }
    setInterval(function(){
      if(interval) localStorage.setItem("idleARPG_lastTick", String(Date.now()));
    }, 3000);
  });

})();
