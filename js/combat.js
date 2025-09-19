const Combat = (()=>{

  const ZONES = {
    foret:      { name:'Forêt Maudite',     enemyDice:'1d3', xp:[8,14], lootRate:0.25, enemies:[
      {name:'Sombre Loup',   hp:[14,22], atk:[1,3], def:[0,1], lvl:[1,2]},
      {name:'Goules',        hp:[16,24], atk:[1,3], def:[0,2], lvl:[1,3]}
    ]},
    crypte:     { name:'Crypte Silencieuse', enemyDice:'1d6', xp:[14,22], lootRate:0.35, enemies:[
      {name:'Squelette',     hp:[20,30], atk:[1,6], def:[1,3], lvl:[2,4]},
      {name:'Spectre',       hp:[22,32], atk:[1,6], def:[1,4], lvl:[3,5]}
    ]},
    sanctuaire: { name:'Sanctuaire Cendré', enemyDice:'2d6', xp:[24,40], lootRate:0.45, enemies:[
      {name:'Démon Mineur',  hp:[34,48], atk:[2,12],def:[3,6], lvl:[4,7]},
      {name:'Chevalier Déchu',hp:[38,52],atk:[2,12],def:[4,7], lvl:[5,8]}
    ]}
  };

  let enemy = null;
  let auto = false;
  let $ = (id)=>document.getElementById(id);

  function rollDice(n,sides){
    let t=0; for(let i=0;i<n;i++) t += GameCore.R(1,sides);
    return t;
  }
  function enemyRoll(atk){ return GameCore.R(atk[0], atk[1]); }

  function pickEnemy(){
    const s = GameCore.state;
    const z = ZONES[s.zone];
    const e = z.enemies[GameCore.R(0, z.enemies.length-1)];
    enemy = {
      name: e.name,
      hpMax: GameCore.R(e.hp[0], e.hp[1]),
      hp: 0,
      def: GameCore.R(e.def[0], e.def[1]),
      atk: [e.atk[0], e.atk[1]],
      lvl: GameCore.R(e.lvl[0], e.lvl[1])
    };
    enemy.hp = enemy.hpMax;
    GameCore.addLog(`Une ${enemy.name} surgit dans ${z.name} !`);
    renderEnemy();
  }

  function renderPlayer(){
    const s = GameCore.state;
    $('pName').textContent = s.name;
    $('pClass').textContent = s.cls;
    $('pLvl').textContent = s.level;
    $('pHP').textContent = s.hp; $('pHPmax').textContent = s.hpMax;
    $('pMana').textContent = s.mana; $('pManaMax').textContent = s.manaMax;
    $('pStr').textContent = s.str; $('pDex').textContent = s.dex; $('pVit').textContent = s.vit; $('pEne').textContent = s.ene;
    $('pAtk').textContent = Loot.totalAttack();
    $('pDef').textContent = Loot.totalDefense();
    $('pCrit').textContent = Loot.totalCrit();
    $('hpBar').max = s.hpMax; $('hpBar').value = s.hp;
    document.getElementById('logBox').innerHTML = GameCore.logsHTML();
  }
  function renderEnemy(){
    if(!enemy){ $('enemyCard').hidden=true; return; }
    $('enemyCard').hidden=false;
    $('eName').textContent = enemy.name; $('eLvl').textContent = enemy.lvl;
    $('eHP').textContent = enemy.hp; $('eHPmax').textContent = enemy.hpMax;
    $('eDef').textContent = enemy.def;
    const z = ZONES[GameCore.state.zone];
    $('eDice').textContent = z.enemyDice;
    $('eHpBar').max = enemy.hpMax; $('eHpBar').value = enemy.hp;
  }

  function setZone(v){
    GameCore.state.zone = v;
    GameCore.save();
  }

  function attackOnce(){
    const s = GameCore.state;
    if(!enemy){ GameCore.addLog("Aucun ennemi. Lance une nouvelle rencontre."); renderPlayer(); return; }

    let pAtk = Loot.totalAttack();
    if(Math.random()*100 < Loot.totalCrit()) pAtk = Math.floor(pAtk * 1.75);
    pAtk += GameCore.R(0,4);
    const dmgToEnemy = Math.max(1, pAtk - enemy.def);
    enemy.hp = Math.max(0, enemy.hp - dmgToEnemy);
    GameCore.addLog(`⚔️ ${s.name} inflige ${dmgToEnemy} à ${enemy.name}.`);
    if(enemy.hp<=0){
      victory();
      return;
    }

    const eDmg = enemyRoll(enemy.atk);
    const dmgToPlayer = Math.max(0, eDmg - Loot.totalDefense());
    s.hp = Math.max(0, s.hp - dmgToPlayer);
    GameCore.addLog(`☠️ ${enemy.name} riposte : ${dmgToPlayer} dégâts.`);
    if(s.hp<=0){
      defeat();
      return;
    }
    GameCore.save();
    renderPlayer(); renderEnemy();
  }

  function victory(){
    const s = GameCore.state;
    const z = ZONES[s.zone];
    const xpGain = GameCore.R(z.xp[0], z.xp[1]);
    GameCore.gainXP(xpGain);
    GameCore.addLog(`🏆 ${s.name} vainc ${enemy.name} (+${xpGain} XP).`);
    if(Math.random() < z.lootRate){
      const it = Loot.genItemForZone(s.zone);
      Loot.addToBag(it);
    }
    enemy = null;
    renderEnemy(); renderPlayer();
  }

  function defeat(){
    const s = GameCore.state;
    GameCore.addLog(`💀 ${s.name} est terrassé ! Retour au camp (perte d’XP du combat).`);
    s.hp = s.hpMax;
    enemy = null;
    GameCore.save();
    renderPlayer(); renderEnemy();
  }

  let autoTimer = null;
  function setAuto(val){
    if(val){
      if(!enemy) pickEnemy();
      clearInterval(autoTimer);
      autoTimer = setInterval(()=>{
        attackOnce();
        if(!enemy) pickEnemy();
      }, 2200);
      GameCore.addLog('Auto-combat activé.');
    } else {
      clearInterval(autoTimer);
      GameCore.addLog('Auto-combat désactivé.');
    }
  }

  function offlineSim(encounters){
    let kills=0, xp=0, items=0;
    for(let i=0;i<encounters;i++){
      const zKey = GameCore.state.zone;
      const z = ZONES[zKey];
      const e = z.enemies[0];
      let ehp = GameCore.R(e.hp[0], e.hp[1]);
      const pAtk = Math.max(1, Loot.totalAttack() - GameCore.R(0,2));
      const rounds = Math.ceil(ehp / pAtk);
      if(Math.random() < 0.7){
        kills++;
        const gain = GameCore.R(z.xp[0], z.xp[1]);
        xp += gain;
        if(Math.random() < z.lootRate * 0.6){
          const it = Loot.genItemForZone(zKey);
          Loot.addToBag(it); items++;
        }
      }
    }
    GameCore.gainXP(xp);
    return {kills, xp, items};
  }

  function initUI(){
    renderPlayer();
    document.getElementById('zoneSelect').value = GameCore.state.zone;
    document.getElementById('zoneSelect').addEventListener('change', e=> setZone(e.target.value));
    document.getElementById('newEncounter').addEventListener('click', pickEnemy);
    document.getElementById('attackBtn').addEventListener('click', attackOnce);
    document.getElementById('fleeBtn').addEventListener('click', ()=>{ GameCore.addLog('Tu prends la fuite.'); enemy=null; renderEnemy(); });
    document.getElementById('autoToggle').addEventListener('change', e=> setAuto(e.target.checked));

    const s = GameCore.state;
    document.getElementById('hpBar').max = s.hpMax; document.getElementById('hpBar').value = s.hp;
    document.getElementById('logBox').innerHTML = GameCore.logsHTML();
    if(!enemy) pickEnemy();
  }

  return { initUI, offlineSim };
})();