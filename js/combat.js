/* combat.js — boucle combat + rendu joueur (HP/Mana/XP/Stats) */
(function(){
  // Expose public API à la fin
  var Combat = {};
  var current = null;   // ennemi courant
  var interval = null;  // auto-attack timer

  /* ---------- Helpers UI ---------- */
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

  /* ---------- Rendu joueur (Combat page) ---------- */
  function renderPlayer(){
    if(!ensureReady()) return;
    var s = GameCore.state;

    // HP
    var hpPct = clampPct((s.hp / (s.hpMax||1)) * 100);
    var hpFill = document.getElementById('barHpFill');
    var hpTxt  = document.getElementById('barHpText');
    if (hpFill) hpFill.style.width = hpPct + '%';
    if (hpTxt)  hpTxt.textContent  = "HP " + s.hp + "/" + s.hpMax;

    // Mana
    var mpPct = clampPct((s.mana / (s.manaMax||1)) * 100);
    var mpFill = document.getElementById('barManaFill');
    var mpTxt  = document.getElementById('barManaText');
    if (mpFill) mpFill.style.width = mpPct + '%';
    if (mpTxt)  mpTxt.textContent  = "Mana " + s.mana + "/" + s.manaMax;

    // XP
    var xpMax = (GameCore.xpTable && GameCore.xpTable[s.level]) || 1;
    var xpPct = clampPct((s.xp / xpMax) * 100);
    var xpFill = document.getElementById('barXpFill');
    var xpTxt  = document.getElementById('barXpText');
    if (xpFill) xpFill.style.width = xpPct + '%';
    if (xpTxt)  xpTxt.textContent  = "XP " + s.xp + "/" + xpMax;
  }

  function renderStats(){
    if(!ensureReady()) return;
    var atk = (GameCore.atkTotal && GameCore.atkTotal()) || 0;
    var def = (GameCore.defTotal && GameCore.defTotal()) || 0;
    var crt = (GameCore.critTotal && GameCore.critTotal()) || 0;
    var mf  = (GameCore.mfTotal && GameCore.mfTotal()) || 0;

    var elA = document.getElementById('cAtk');
    var elD = document.getElementById('cDef');
    var elC = document.getElementById('cCrit');
    var elM = document.getElementById('cMF');
    if(elA) elA.textContent = atk;
    if(elD) elD.textContent = def;
    if(elC) elC.textContent = crt;
    if(elM) elM.textContent = mf;
  }

  /* ---------- Ennemi ---------- */
  function spawn(forceLog){
    if(!ensureReady()) return;
    var s = GameCore.state;
    var z = Zones.getZone(s.currentZone) || { zl:1, baseXP:10, baseGold:5, nameFR:"Zone inconnue" };
    var diff = Zones.getDifficultyScalars(GameCore.getDifficulty());
    var names = ["Décharné","Sombre rôdeur","Corrompu","Démon mineur","Chauve-souris","Goule","Spectre","Fétiche","Guerrier déchu"];
    var n = names[Math.floor(Math.random()*names.length)];
    var baseHP  = Math.max(12, z.zl*6);
    var baseDMG = Math.max(3, Math.floor(z.zl*0.8));
    current = {
      name: n + " (Z" + z.zl + ")",
      hpMax: Math.floor(baseHP * (diff.enemy.hp||1)),
      hp:    Math.floor(baseHP * (diff.enemy.hp||1)),
      dmg:   Math.floor(baseDMG * (diff.enemy.dmg||1)),
      zone: z
    };
    renderEnemy();
    if (forceLog !== false) GameCore.log("Un " + current.name + " apparaît.");
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

  /* ---------- Calculs dégâts ---------- */
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

  /* ---------- Récompenses & mort ennemi ---------- */
  function giveRewards(z){
    var diff = Zones.getDifficultyScalars(GameCore.getDifficulty());
    var cfg  = (GameCore.getConfig && GameCore.getConfig()) || {};
    var xpGain   = Math.max(1, Math.floor((z.baseXP||10)   * (diff.reward.xp||1)   * ((cfg.xpRate||100)/100)));
    var goldGain = Math.max(1, Math.floor((z.baseGold||5)  * (diff.reward.gold||1) * ((cfg.goldRate||100)/100)));
    GameCore.addXP(xpGain);
    GameCore.addGold(goldGain);
    GameCore.log("+"+xpGain+" XP, +"+goldGain+" or");
    if (window.Loot && Loot.rollDrop) Loot.rollDrop(z);

    // maj affichage XP/or côté combat
    renderPlayer();
  }

  function checkDeath(){
    if(current && current.hp<=0){
      GameCore.log(current.name + " est vaincu !");
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

  /* ---------- Tour d’attaque ---------- */
  function attackOnce(){
    if(!current) return;
    GameCore.initSFX && GameCore.initSFX();

    // joueur tape
    var dmgP = playerAttackDamage();
    current.hp = Math.max(0, current.hp - dmgP);
    GameCore.playSFX && GameCore.playSFX('hit');
    flash('#enemyCard .hpbar', (dmgP>=Math.max(5, (current.dmg||1)*1.2)) ? 'crit' : 'hit');
    GameCore.log("Vous infligez " + dmgP + " dégâts.");
    renderEnemy();
    if(checkDeath()) return;

    // ennemi tape
    var dmgE = enemyAttackDamage();
    var s = GameCore.state;
    s.hp = Math.max(0, s.hp - dmgE);
    flash('.bar.hp', 'hit');
    GameCore.log("Vous subissez " + dmgE + " dégâts.");

    // si mort joueur
    if(s.hp<=0){
      GameCore.log("💀 Vous tombez au combat ! -10% or, retour au camp.");
      s.gold = Math.max(0, Math.floor(s.gold*0.9));
      s.hp = Math.max(1, Math.floor(s.hpMax*0.5));
      GameCore.save();
      current=null; renderEnemy();
      renderPlayer(); // remettre les barres en cohérence
      if(interval) toggleAuto();
      return;
    }

    GameCore.save();
    renderPlayer(); // maj barres HP/XP/Mana après échange de coups
  }

  /* ---------- Auto-fight + reprise ---------- */
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
    var cap = Math.min(ms||0, 120000); // 2 minutes max
    var steps = Math.floor(cap / 900);
    if(steps <= 0) return;
    if(!current) spawn();
    for(var i=0;i<steps;i++){
      attackOnce();
      if(!current) spawn();
    }
  }

  /* ---------- Expose & init ---------- */
  Combat.spawn = spawn;
  Combat.attackOnce = attackOnce;
  Combat.toggleAuto = toggleAuto;
  window.Combat = Combat;

  document.addEventListener("DOMContentLoaded", function(){
    if(!ensureReady()) return;

    // Stats & barres dès l’arrivée sur la page
    renderStats();
    renderPlayer();

    // Autospawn + reprise auto si nécessaire
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
    // garder le timestamp frais
    setInterval(function(){
      if(interval) localStorage.setItem("idleARPG_lastTick", String(Date.now()));
    }, 3000);
  });

})();
