/* combat.js — boss gating + auto stop + fiche perso */
(function(){
  var Combat = {};
  var current = null;
  var interval = null;

  function flash(sel,cls){
    var el=document.querySelector(sel);
    if(!el)return;
    el.classList.add(cls);
    setTimeout(()=>el.classList.remove(cls),220);
  }

  function clampPct(n){
    n=Math.max(0,Math.min(100,Math.round(n)));
    if(!isFinite(n))return 0;
    return n;
  }

  function ensureReady(){
    if(!window.GameCore||!GameCore.state){ return false; }
    if(!window.Zones){ return false; }
    return true;
  }

  function renderPlayer(){
    if(!ensureReady()) return;
    var s=GameCore.state;
    var hpPct=clampPct((s.hp/(s.hpMax||1))*100);
    var mpPct=clampPct((s.mana/(s.manaMax||1))*100);
    var xpMax=(GameCore.xpTable&&GameCore.xpTable[s.level])||1;
    var xpPct=clampPct((s.xp/xpMax)*100);
    var el;
    el=document.getElementById('barHpFill'); if(el) el.style.width=hpPct+'%';
    el=document.getElementById('barHpText'); if(el) el.textContent="HP "+s.hp+"/"+s.hpMax;
    el=document.getElementById('barManaFill'); if(el) el.style.width=mpPct+'%';
    el=document.getElementById('barManaText'); if(el) el.textContent="Mana "+s.mana+"/"+s.manaMax;
    el=document.getElementById('barXpFill'); if(el) el.style.width=xpPct+'%';
    el=document.getElementById('barXpText'); if(el) el.textContent="XP "+s.xp+"/"+xpMax;
  }

  function renderStats(){
    if(!ensureReady()) return;
    var el;
    el=document.getElementById('cAtk');  if(el) el.textContent=GameCore.atkTotal();
    el=document.getElementById('cDef');  if(el) el.textContent=GameCore.defTotal();
    el=document.getElementById('cCrit'); if(el) el.textContent=GameCore.critTotal();
    el=document.getElementById('cMF');   if(el) el.textContent=GameCore.mfTotal();
  }

  function renderCharSheet(){
    if(!ensureReady()) return;
    var s=GameCore.state;
    var el;
    el=document.getElementById("charName");  if(el) el.textContent=s.name;
    el=document.getElementById("charClass"); if(el) el.textContent=s.klass;
    el=document.getElementById("charLevel"); if(el) el.textContent=s.level;
    el=document.getElementById("charGold");  if(el) el.textContent=s.gold;
    el=document.getElementById("charStr");   if(el) el.textContent=s.str;
    el=document.getElementById("charDex");   if(el) el.textContent=s.dex;
    el=document.getElementById("charVit");   if(el) el.textContent=s.vit;
    el=document.getElementById("charEne");   if(el) el.textContent=s.ene;
    el=document.getElementById("charPts");   if(el) el.textContent=s.statPts;
  }

  function spawn(forceLog){
    if(!ensureReady()) return;
    var s=GameCore.state;
    var z=Zones.getZone(s.currentZone);
    if(!z){ z={zl:1,baseXP:10,baseGold:5,nameFR:"Zone inconnue"}; }
    var diff=Zones.getDifficultyScalars(GameCore.getDifficulty());

    var isBoss=false, name, baseHP, baseDMG;
    var bossDead=z.bossId && !!s.progress.bosses[z.bossId];
    var rollBoss=false;

    if(z.bossId && !bossDead){
      var chance=z.bossChance||0.05;
      if(Math.random()<chance){ rollBoss=true; }
    }

    if(rollBoss){
      isBoss=true;
      name=(z.bossName||"Boss")+" [BOSS]";
      baseHP=Math.max(40,Math.floor(z.zl*10));
      baseDMG=Math.max(6,Math.floor(z.zl*1.6));
      if(interval){ clearInterval(interval); interval=null; GameCore.log("⏹️ Auto OFF (boss détecté)"); }
    } else {
      var names=["Décharné","Rôdeur","Corrompu","Démon","Chauve-souris","Goule","Spectre","Fétiche","Déchu"];
      name=names[Math.floor(Math.random()*names.length)]+" (Z"+z.zl+")";
      baseHP=Math.max(12,z.zl*6);
      baseDMG=Math.max(3,Math.floor(z.zl*0.8));
    }

    current={ name,isBoss,
      hpMax:Math.floor(baseHP*(diff.enemy.hp||1)),
      hp:   Math.floor(baseHP*(diff.enemy.hp||1)),
      dmg:  Math.floor(baseDMG*(diff.enemy.dmg||1)),
      zone:z };
    renderEnemy();
    if(forceLog!==false) GameCore.log((isBoss?"⚠️ ":"")+"Un "+current.name+" apparaît.");
  }

  function renderEnemy(){
    var c=document.getElementById("enemyCard");
    if(!c) return;
    if(!current){
      c.innerHTML='<div class="muted">Aucun ennemi. Choisis une zone puis <b>Aller</b>.</div>';
      return;
    }
    var hpPct=clampPct(current.hp/current.hpMax*100);
    c.innerHTML=''
      +'<div class="name">'+current.name+'</div>'
      +'<div class="hpbar"><div class="hpfill" style="width:'+hpPct+'%"></div></div>'
      +'<div class="muted small">DMG '+current.dmg+' • PV '+current.hp+'/'+current.hpMax+'</div>'
      +'<div style="display:flex;gap:8px;margin-top:6px">'
      +'<button class="btn primary" id="btnAttack">Attaquer</button>'
      +'<button class="btn" id="btnAuto">'+(interval?'Arrêter':'Auto')+'</button>'
      +'</div>';
    var ba=document.getElementById("btnAttack");
    var au=document.getElementById("btnAuto");
    if(ba) ba.onclick=attackOnce;
    if(au) au.onclick=toggleAuto;
  }

  function playerAttackDamage(){
    var base=GameCore.atkTotal();
    var dmg=Math.max(1,Math.floor(base*(0.7+Math.random()*0.6)));
    var crit=Math.random()*100<GameCore.critTotal();
    if(crit) dmg=Math.floor(dmg*1.5);
    return dmg;
  }

  function enemyAttackDamage(){
    var def=GameCore.defTotal();
    var dmg=Math.max(1,current.dmg-Math.floor(def*0.25));
    dmg=Math.max(1,Math.floor(dmg*(0.8+Math.random()*0.4)));
    return dmg;
  }

  function attackOnce(){
    if(!current){ spawn(); return; }
    var s=GameCore.state;
    var dmg=playerAttackDamage();
    current.hp-=dmg;
    flash('#enemyCard','hit');
    GameCore.playSFX && GameCore.playSFX("hit");
    GameCore.log("💥 Vous infligez "+dmg+" dmg à "+current.name);
    if(current.hp<=0){
      GameCore.log("☠️ "+current.name+" est vaincu !");
      if(current.isBoss){ GameCore.markZoneBossDefeated(current.zone); }
      var z=current.zone;
      var diff=Zones.getDifficultyScalars(GameCore.getDifficulty());
      var xpGain=Math.floor(z.baseXP*(diff.reward.xp||1));
      var goldGain=Math.floor(z.baseGold*(diff.reward.gold||1));
      GameCore.addXP(xpGain);
      GameCore.addGold(goldGain);
      renderPlayer(); renderStats(); renderCharSheet();
      current=null; renderEnemy();
      return;
    }
    if(Math.random()<0.7){
      var dmg2=enemyAttackDamage();
      s.hp-=dmg2;
      if(s.hp<0) s.hp=0;
      renderPlayer();
      GameCore.log("⚔️ "+current.name+" frappe: -"+dmg2+" PV");
      if(s.hp<=0){
        GameCore.log("💀 Vous êtes mort ! (réapparition auto)");
        GameCore.recalcVitals(true);
        renderPlayer();
      }
    }
    renderEnemy();
    GameCore.save();
  }

  function toggleAuto(){
    if(interval){
      clearInterval(interval); interval=null;
      GameCore.log("⏸️ Auto OFF");
      renderEnemy();
      localStorage.setItem("idleARPG_auto","0");
    } else {
      interval=setInterval(attackOnce,900);
      GameCore.log("▶️ Auto ON");
      renderEnemy();
      localStorage.setItem("idleARPG_auto","1");
      localStorage.setItem("idleARPG_lastTick",String(Date.now()));
    }
  }

  function fastForward(ms){
    var ticks=Math.floor(ms/900);
    if(ticks<=0) return;
    for(var i=0;i<ticks;i++){
      if(!current){ spawn(false); }
      attackOnce();
      if(!current) continue;
    }
  }

  document.addEventListener("DOMContentLoaded",function(){
    GameCore.ensureGameOrRedirect("index.html");
    if(!ensureReady()) return;
    renderStats(); renderPlayer(); renderCharSheet();
    if(document.getElementById("enemyCard")) spawn(false);
    var wasAuto=localStorage.getItem("idleARPG_auto")==="1";
    var last=Number(localStorage.getItem("idleARPG_lastTick")||"0");
    if(wasAuto && last>0){
      var delta=Date.now()-last;
      fastForward(delta);
      if(!interval){
        interval=setInterval(attackOnce,900);
        GameCore.log("Auto ON (repris)");
      }
    }
    setInterval(function(){
      if(interval) localStorage.setItem("idleARPG_lastTick",String(Date.now()));
    },3000);
  });

  window.Combat={ spawn, toggleAuto };
})();
