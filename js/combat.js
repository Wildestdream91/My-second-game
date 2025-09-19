const Combat = (()=>{

  // Zones by act with monsters
  const ZONES = {
    // Act I
    act1_foret:  { act:'act1', name:'Acte I — Forêt Maudite', enemyDice:'1d3', xp:[8,14],  gold:[3,8],  lootChance:0.18, enemies:[
      {name:'Sombre Loup',    type:'beast', hp:[14,22], atk:[1,3], def:[0,1], lvl:[1,2]},
      {name:'Corbeau Sombre', type:'beast', hp:[10,16], atk:[1,2], def:[0,1], lvl:[1,2]},
      {name:'Dryade Corrompue',type:'fae',  hp:[18,24], atk:[1,4], def:[1,2], lvl:[2,3]},
      {name:'Goules',         type:'undead',hp:[16,24], atk:[1,3], def:[0,2], lvl:[1,3]}
    ]},
    act1_crypte: { act:'act1', name:'Acte I — Crypte Silencieuse', enemyDice:'1d6', xp:[12,20], gold:[5,10], lootChance:0.16, enemies:[
      {name:'Squelette',      type:'undead', hp:[20,30], atk:[1,6], def:[1,3], lvl:[2,4]},
      {name:'Zombie Putride', type:'undead', hp:[22,32], atk:[1,4], def:[2,4], lvl:[3,5]},
      {name:'Nécro-adepte',   type:'undead', hp:[18,26], atk:[1,5], def:[1,3], lvl:[3,5]},
      {name:'Spectre',        type:'undead', hp:[22,32], atk:[1,6], def:[1,4], lvl:[3,5]}
    ]},
    act1_catac:  { act:'act1', name:'Acte I — Catacombes', enemyDice:'1d6', xp:[16,24], gold:[6,12], lootChance:0.15, enemies:[
      {name:'Chaman Déchu',   type:'demon',  hp:[24,34], atk:[1,6], def:[2,4], lvl:[5,7]},
      {name:'Déchu',          type:'demon',  hp:[18,26], atk:[1,5], def:[1,3], lvl:[4,6]},
      {name:'Gargouille',     type:'demon',  hp:[20,28], atk:[2,6], def:[1,4], lvl:[5,7]},
      {name:'Archer Squelette',type:'undead',hp:[20,28], atk:[1,6], def:[1,3], lvl:[5,7]}
    ]},

    // Act II
    act2_desert:{ act:'act2', name:'Acte II — Désert', enemyDice:'1d8', xp:[18,28], gold:[8,14], lootChance:0.14, enemies:[
      {name:'Scarabée',       type:'beast',  hp:[26,36], atk:[1,8], def:[2,5], lvl:[16,20]},
      {name:'Lézard des Sables', type:'beast', hp:[24,34], atk:[1,7], def:[2,4], lvl:[16,21]},
      {name:'Vautour',        type:'beast',  hp:[20,28], atk:[1,6], def:[1,3], lvl:[17,22]},
      {name:'Mage Squelette', type:'undead', hp:[22,30], atk:[1,7], def:[1,3], lvl:[18,24]}
    ]},
    act2_tombe:{ act:'act2', name:'Acte II — Tombeaux', enemyDice:'1d10', xp:[22,34], gold:[10,18], lootChance:0.13, enemies:[
      {name:'Guerrier Momifié', type:'undead', hp:[28,40], atk:[1,9], def:[3,6], lvl:[20,26]},
      {name:'Zombie Putride',   type:'undead', hp:[28,38], atk:[1,8], def:[2,5], lvl:[20,26]},
      {name:'Esprit',           type:'undead', hp:[24,34], atk:[1,8], def:[2,5], lvl:[21,27]},
      {name:'Scarabée Foudre',  type:'beast',  hp:[26,36], atk:[2,8], def:[3,6], lvl:[22,27]}
    ]},

    // Act III
    act3_jungle:{ act:'act3', name:'Acte III — Jungle', enemyDice:'1d10', xp:[26,36], gold:[12,20], lootChance:0.13, enemies:[
      {name:'Fétiche',        type:'demon',  hp:[28,40], atk:[1,9], def:[2,6], lvl:[28,32]},
      {name:'Shaman Fétiche', type:'demon',  hp:[26,36], atk:[1,9], def:[2,5], lvl:[29,33]},
      {name:'Araignée Géante',type:'beast',  hp:[30,42], atk:[1,10],def:[3,6], lvl:[30,34]},
      {name:'Spiritueux',     type:'undead', hp:[26,36], atk:[1,9], def:[2,5], lvl:[30,34]}
    ]},
    act3_temple:{ act:'act3', name:'Acte III — Temples de Kurast', enemyDice:'2d6', xp:[30,40], gold:[14,24], lootChance:0.12, enemies:[
      {name:'Sorcier Zakarum', type:'demon',  hp:[30,44], atk:[2,12],def:[3,7], lvl:[32,35]},
      {name:'Âme orageuse',    type:'undead', hp:[30,42], atk:[2,10],def:[2,6],  lvl:[32,35]},
      {name:'Araignée Venimeuse', type:'beast', hp:[32,46], atk:[2,11],def:[3,7], lvl:[33,35]},
      {name:'Fétiche Tueur',   type:'demon',  hp:[30,44], atk:[2,12],def:[3,7], lvl:[33,35]}
    ]},

    // Act IV
    act4_plaine:{ act:'act4', name:'Acte IV — Plaine du Désespoir', enemyDice:'2d6', xp:[34,46], gold:[16,26], lootChance:0.12, enemies:[
      {name:'Démon Mineur',    type:'demon',  hp:[34,48], atk:[2,12],def:[3,6], lvl:[36,38]},
      {name:'Chevalier Déchu', type:'demon',  hp:[38,52], atk:[2,12],def:[4,7], lvl:[36,39]},
      {name:'Abyss Knight',    type:'undead', hp:[34,48], atk:[2,12],def:[3,6], lvl:[37,40]},
      {name:'Venom Lord',      type:'demon',  hp:[40,56], atk:[3,12],def:[4,7], lvl:[38,40]}
    ]},
    act4_riviere:{ act:'act4', name:'Acte IV — Rivière de Feu', enemyDice:'2d8', xp:[36,50], gold:[18,30], lootChance:0.11, enemies:[
      {name:'Grotesque',       type:'demon',  hp:[38,54], atk:[2,14],def:[4,7], lvl:[38,40]},
      {name:'Balrog',          type:'demon',  hp:[42,58], atk:[3,14],def:[5,8], lvl:[39,40]},
      {name:'Serpent Infernal',type:'demon',  hp:[36,52], atk:[2,12],def:[4,7], lvl:[38,40]},
      {name:'Chevalier Déchu', type:'demon',  hp:[38,54], atk:[2,12],def:[4,7], lvl:[38,40]}
    ]},

    // Act V
    act5_hautes:{ act:'act5', name:'Acte V — Hautes Terres', enemyDice:'2d8', xp:[38,54], gold:[18,30], lootChance:0.11, enemies:[
      {name:'Yéti',            type:'beast',  hp:[44,62], atk:[3,14],def:[5,9], lvl:[41,45]},
      {name:'Démon de Glace',  type:'demon',  hp:[42,60], atk:[3,12],def:[5,8], lvl:[42,46]},
      {name:'Harpie',          type:'demon',  hp:[38,56], atk:[2,12],def:[4,7], lvl:[41,46]},
      {name:'Squelette Enragé',type:'undead', hp:[40,58], atk:[2,12],def:[4,7], lvl:[41,46]}
    ]},
    act5_keep:  { act:'act5', name:'Acte V — Donjon de la Pierre-Monde', enemyDice:'2d10', xp:[42,60], gold:[22,36], lootChance:0.10, enemies:[
      {name:'Mage de la Destruction', type:'undead', hp:[44,64], atk:[3,16],def:[6,10], lvl:[45,49]},
      {name:'Colosse',                type:'demon',  hp:[48,70], atk:[3,16],def:[6,10], lvl:[46,49]},
      {name:'Succube',                type:'demon',  hp:[40,60], atk:[3,14],def:[5,8],  lvl:[45,49]},
      {name:'Chevalier Déchu',        type:'demon',  hp:[44,64], atk:[3,14],def:[5,9],  lvl:[45,49]}
    ]}
  };

  const REQ = { act1:1, act2:15, act3:27, act4:35, act5:40 };
  const GROUPS = [
    { act:'act1', label:'Acte I', zones:[ {key:'act1_foret',name:'Forêt Maudite'}, {key:'act1_crypte',name:'Crypte Silencieuse'}, {key:'act1_catac',name:'Catacombes'} ]},
    { act:'act2', label:'Acte II', zones:[ {key:'act2_desert',name:'Désert'}, {key:'act2_tombe',name:'Tombeaux'} ]},
    { act:'act3', label:'Acte III', zones:[ {key:'act3_jungle',name:'Jungle'}, {key:'act3_temple',name:'Temples de Kurast'} ]},
    { act:'act4', label:'Acte IV', zones:[ {key:'act4_plaine',name:'Plaine du Désespoir'}, {key:'act4_riviere',name:'Rivière de Feu'} ]},
    { act:'act5', label:'Acte V', zones:[ {key:'act5_hautes',name:'Hautes Terres'}, {key:'act5_keep',name:'Donjon de la Pierre-Monde'} ]},
  ];

  let enemy = null;
  let autoTimer = null;
  let refreshZoneList = null;

  const $ = (id)=>document.getElementById(id);

  function defaultZone(){ return 'act1_foret'; }
  function requiredLevel(act){ return REQ[act]||1; }
  function accessibleActs(level){
    return { act1: level>=REQ.act1, act2: level>=REQ.act2, act3: level>=REQ.act3, act4: level>=REQ.act4, act5: level>=REQ.act5 };
  }
  function zoneGroups(){ return GROUPS; }

  function pickEnemy(){
    const s = GameCore.state;
    const z = ZONES[s.zone];
    const e = z.enemies[GameCore.R(0, z.enemies.length-1)];
    enemy = {
      name: e.name,
      type: e.type,
      hpMax: GameCore.R(e.hp[0], e.hp[1]),
      hp: 0,
      def: GameCore.R(e.def[0], e.def[1]),
      atk: [e.atk[0], e.atk[1]],
      lvl: GameCore.R(e.lvl[0], e.lvl[1])
    };
    enemy.hp = enemy.hpMax;
    GameCore.addLog(`Une ${enemy.name} (${enemy.type}) surgit dans ${z.name} !`);
    renderEnemy();
  }

  function renderPlayer(){
    const s = GameCore.state;
    $('pName').textContent = s.name;
    $('pClass').textContent = s.cls;
    $('pLvl').textContent = s.level;
    $('pStr').textContent = s.str; $('pDex').textContent = s.dex; $('pVit').textContent = s.vit; $('pEne').textContent = s.ene;
    $('pAtk').textContent = Loot.totalAttack();
    $('pDef').textContent = Loot.totalDefense();
    $('pCrit').textContent = Loot.totalCrit();
    $('pGold').textContent = s.gold;

    const hpPct = Math.max(0, Math.min(1, s.hp / s.hpMax));
    const manaPct = Math.max(0, Math.min(1, s.mana / s.manaMax));
    const xpPct = Math.max(0, Math.min(1, s.xp / s.xpToNext));
    $('barHpFill').style.width = (hpPct*100)+'%';
    $('barManaFill').style.width = (manaPct*100)+'%';
    $('barXpFill').style.width = (xpPct*100)+'%';
    $('barHpText').textContent = `HP ${s.hp}/${s.hpMax}`;
    $('barManaText').textContent = `Mana ${s.mana}/${s.manaMax}`;
    $('barXpText').textContent = `XP ${s.xp}/${s.xpToNext}`;

    document.getElementById('logBox').innerHTML = GameCore.logsHTML();

    // Update zone select lock/unlock
    if(typeof refreshZoneList==='function') refreshZoneList();
  }
  function renderEnemy(){
    if(!enemy){ $('enemyCard').hidden=true; return; }
    $('enemyCard').hidden=false;
    $('eName').textContent = enemy.name; $('eLvl').textContent = enemy.lvl; $('eType').textContent = enemy.type;
    $('eHP').textContent = enemy.hp; $('eHPmax').textContent = enemy.hpMax;
    $('eDef').textContent = enemy.def;
    const z = ZONES[GameCore.state.zone];
    $('eDice').textContent = z.enemyDice;
    $('eHpBar').max = enemy.hpMax; $('eHpBar').value = enemy.hp;
  }

  function setZone(v){
    const act = v.split('_')[0];
    const lvlReq = requiredLevel(act);
    if(GameCore.state.level < lvlReq){
      GameCore.addLog(`🔒 Zone verrouillée (requiert niv ${lvlReq}).`);
      return;
    }
    GameCore.state.zone = v;
    GameCore.save();
  }

  function playerCritChance(){ return Math.min(75, Loot.totalCrit()); }

  function attackOnce(){
    const s = GameCore.state;
    if(!enemy){ GameCore.addLog("Aucun ennemi. Lance une nouvelle rencontre."); renderPlayer(); return; }

    let pAtk = Loot.totalAttack();
    if(Math.random()*100 < playerCritChance()) pAtk = Math.floor(pAtk * 1.75);
    pAtk += GameCore.R(0,4);
    const dmgToEnemy = Math.max(1, pAtk - enemy.def);
    enemy.hp = Math.max(0, enemy.hp - dmgToEnemy);
    GameCore.addLog(`⚔️ ${s.name} inflige ${dmgToEnemy} à ${enemy.name}.`);
    if(enemy.hp<=0){
      victory();
      return;
    }

    const eDmg = GameCore.R(enemy.atk[0], enemy.atk[1]);
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
    const goldGain = GameCore.R(z.gold[0], z.gold[1]);
    GameCore.gainXP(xpGain);
    s.gold += goldGain;
    GameCore.addLog(`🏆 ${s.name} vainc ${enemy.name} (+${xpGain} XP, +${goldGain} or).`);
    // Drop roll
    if(Math.random() < z.lootChance){
      const it = Loot.genItemForZone(s.zone);
      Loot.addToBag(it);
    }
    enemy = null;
    renderEnemy(); renderPlayer();
  }

  function defeat(){
    const s = GameCore.state;
    GameCore.addLog(`💀 ${s.name} est terrassé ! Retour au camp.`);
    s.hp = s.hpMax;
    enemy = null;
    GameCore.save();
    renderPlayer(); renderEnemy();
  }

  function setAuto(val){
    clearInterval(autoTimer);
    if(val){
      if(!enemy) pickEnemy();
      autoTimer = setInterval(()=>{
        if(GameCore.state.hp < Math.floor(GameCore.state.hpMax*0.25)){
          clearInterval(autoTimer);
          GameCore.addLog('🛑 Auto-combat stoppé (HP bas).');
          return;
        }
        attackOnce();
        if(!enemy) pickEnemy();
      }, 2200);
      GameCore.addLog('Auto-combat activé.');
    } else {
      GameCore.addLog('Auto-combat désactivé.');
    }
  }

  function offlineSim(encounters){
    let kills=0, xp=0, items=0, gold=0;
    for(let i=0;i<encounters;i++){
      const zKey = GameCore.state.zone;
      const z = ZONES[zKey];
      if(Math.random()<0.7){
        kills++;
        xp += GameCore.R(z.xp[0], z.xp[1]);
        gold += GameCore.R(z.gold[0], z.gold[1]);
        if(Math.random() < z.lootChance * 0.6){
          const it = Loot.genItemForZone(zKey);
          if(Loot.addToBag(it)) items++;
        }
      }
    }
    GameCore.state.gold += gold;
    GameCore.gainXP(xp);
    return {kills, xp, gold, items};
  }

  function initUI(onZonesRefresh){
    refreshZoneList = onZonesRefresh;
    renderPlayer();
    const sel = $('zoneSelect');
    sel.addEventListener('change', e=> setZone(e.target.value));
    $('newEncounter').addEventListener('click', pickEnemy);
    $('attackBtn').addEventListener('click', attackOnce);
    $('fleeBtn').addEventListener('click', ()=>{ GameCore.addLog('Tu prends la fuite.'); enemy=null; renderEnemy(); });
    $('autoToggle').addEventListener('change', e=> setAuto(e.target.checked));
    if(!enemy) pickEnemy();
  }

  return { initUI, offlineSim, zoneGroups, accessibleActs, requiredLevel, defaultZone };
})();