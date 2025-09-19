const Combat = (()=>{

  // Acts and zones with enemies & drop rates
  const ACTS = {
    act1: {
      name:'Acte I — Terres Sauvages', req:1,
      zones:{
        act1_foret: { name:'Forêt Maudite', enemyDice:'1d3', xp:[8,14], gold:[3,8], lootChance:0.18, enemies:[
          {name:'Sombre Loup',    type:'beast',  hp:[14,22], atk:[1,3], def:[0,1], lvl:[1,2]},
          {name:'Corbeau Sombre', type:'beast',  hp:[10,16], atk:[1,2], def:[0,1], lvl:[1,2]},
          {name:'Dryade Corrompue',type:'fae',   hp:[18,24], atk:[1,4], def:[1,2], lvl:[2,3]},
          {name:'Goules',         type:'undead', hp:[16,24], atk:[1,3], def:[0,2], lvl:[1,3]}
        ]},
        act1_crypte: { name:'Crypte Silencieuse', enemyDice:'1d6', xp:[12,18], gold:[5,10], lootChance:0.16, enemies:[
          {name:'Squelette',      type:'undead', hp:[20,30], atk:[1,6], def:[1,3], lvl:[2,4]},
          {name:'Zombie Putride', type:'undead', hp:[26,36], atk:[1,4], def:[2,4], lvl:[3,5]},
          {name:'Nécro-adepte',   type:'undead', hp:[18,26], atk:[1,5], def:[1,3], lvl:[3,5]},
          {name:'Spectre',        type:'undead', hp:[22,32], atk:[1,6], def:[1,4], lvl:[3,5]}
        ]},
        act1_catacombes: { name:'Catacombes', enemyDice:'1d6', xp:[14,22], gold:[6,12], lootChance:0.15, enemies:[
          {name:'Dryade Corrompue',type:'fae',   hp:[22,30], atk:[1,5], def:[2,3], lvl:[4,6]},
          {name:'Gargouille Déchue',type:'demon',hp:[24,34], atk:[1,6], def:[2,4], lvl:[5,7]},
          {name:'Déchu',           type:'demon', hp:[20,28], atk:[1,4], def:[1,3], lvl:[4,6]}
        ]},
      }
    },
    act2: {
      name:'Acte II — Désert de Lut Gholein', req:15,
      zones:{
        act2_desert: { name:'Désert Brûlant', enemyDice:'1d6', xp:[16,24], gold:[6,12], lootChance:0.15, enemies:[
          {name:'Scarabée',   type:'beast',  hp:[24,34], atk:[1,6], def:[2,4], lvl:[16,20]},
          {name:'Lézard des sables', type:'beast', hp:[26,38], atk:[1,6], def:[2,5], lvl:[18,22]},
          {name:'Vautour',    type:'beast',  hp:[20,30], atk:[1,5], def:[1,3], lvl:[18,22]}
        ]},
        act2_tombeaux: { name:'Tombeaux Anciens', enemyDice:'1d8', xp:[20,28], gold:[8,16], lootChance:0.14, enemies:[
          {name:'Guerrier momifié', type:'undead', hp:[28,40], atk:[1,7], def:[2,5], lvl:[20,24]},
          {name:'Mage Squelette', type:'undead', hp:[24,34], atk:[2,8], def:[2,4], lvl:[21,26]},
          {name:'Esprit',      type:'undead', hp:[22,32], atk:[2,7], def:[2,4], lvl:[22,26]}
        ]}
      }
    },
    act3: {
      name:'Acte III — Jungle de Kurast', req:27,
      zones:{
        act3_jungle: { name:'Jungle Putride', enemyDice:'1d8', xp:[24,32], gold:[8,16], lootChance:0.14, enemies:[
          {name:'Fétiche', type:'demon', hp:[30,42], atk:[2,8], def:[3,5], lvl:[28,32]},
          {name:'Araignée géante', type:'beast', hp:[32,46], atk:[2,9], def:[3,6], lvl:[29,33]},
          {name:'Âme orageuse', type:'undead', hp:[28,40], atk:[3,10], def:[3,5], lvl:[30,34]}
        ]},
        act3_temples: { name:'Temples de Kurast', enemyDice:'1d10', xp:[28,36], gold:[10,18], lootChance:0.13, enemies:[
          {name:'Sorciers Zakarum', type:'undead', hp:[30,44], atk:[3,10], def:[3,6], lvl:[31,35]},
          {name:'Hydre invoquée', type:'demon', hp:[34,48], atk:[3,12], def:[4,6], lvl:[32,36]}
        ]}
      }
    },
    act4: {
      name:'Acte IV — Enfer', req:35,
      zones:{
        act4_plaine: { name:'Plaine du Désespoir', enemyDice:'2d6', xp:[30,38], gold:[12,20], lootChance:0.12, enemies:[
          {name:'Chevalier Déchu', type:'demon', hp:[36,50], atk:[3,12], def:[4,7], lvl:[36,39]},
          {name:'Abyss Knight', type:'demon', hp:[34,48], atk:[3,11], def:[4,6], lvl:[36,39]}
        ]},
        act4_riviere: { name:'Rivière de Feu', enemyDice:'2d8', xp:[34,42], gold:[14,22], lootChance:0.11, enemies:[
          {name:'Venom Lord', type:'demon', hp:[40,56], atk:[4,14], def:[5,8], lvl:[38,40]},
          {name:'Grotesque', type:'demon', hp:[42,58], atk:[4,14], def:[5,8], lvl:[38,40]}
        ]}
      }
    },
    act5: {
      name:'Acte V — Mont Arreat', req:40,
      zones:{
        act5_hautes: { name:'Hautes Terres Arreat', enemyDice:'2d8', xp:[36,46], gold:[14,24], lootChance:0.11, enemies:[
          {name:'Yéti', type:'beast', hp:[44,62], atk:[4,15], def:[6,9], lvl:[41,45]},
          {name:'Succube', type:'demon', hp:[40,58], atk:[4,13], def:[5,8], lvl:[42,46]},
          {name:'Squelette enragé', type:'undead', hp:[38,56], atk:[4,12], def:[5,8], lvl:[41,46]}
        ]},
        act5_worldstone: { name:'Keep de la Pierre-Monde', enemyDice:'2d10', xp:[42,54], gold:[16,28], lootChance:0.10, enemies:[
          {name:'Mage de la Destruction', type:'undead', hp:[46,64], atk:[5,16], def:[7,10], lvl:[45,50]},
          {name:'Colosse Infernus', type:'demon', hp:[50,70], atk:[5,18], def:[7,11], lvl:[46,50]}
        ]}
      }
    }
  };

  let enemy = null;
  let autoTimer = null;
  const $ = (id)=>document.getElementById(id);

  function populateSelectors(){
    const actSel = $('actSelect'), zoneSel = $('zoneSelect');
    actSel.innerHTML=''; zoneSel.innerHTML='';
    const lvl = GameCore.state.level;
    for(const key in ACTS){
      const act = ACTS[key];
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = act.name + (lvl < act.req ? ` (verrouillé: niv ${act.req})` : '');
      opt.disabled = lvl < act.req;
      if(key === GameCore.state.act) opt.selected = true;
      actSel.appendChild(opt);
    }
    const currentAct = ACTS[GameCore.state.act] || ACTS.act1;
    for(const zKey in currentAct.zones){
      const z = currentAct.zones[zKey];
      const opt = document.createElement('option');
      opt.value = zKey; opt.textContent = z.name;
      if(zKey===GameCore.state.zone) opt.selected = true;
      zoneSel.appendChild(opt);
    }
  }

  function pickEnemy(){
    const s = GameCore.state;
    const {act, zone} = s;
    const z = ACTS[act].zones[zone];
    const e = z.enemies[GameCore.R(0, z.enemies.length-1)];
    enemy = {
      name: e.name, type: e.type,
      hpMax: GameCore.R(e.hp[0], e.hp[1]), hp: 0,
      def: GameCore.R(e.def[0], e.def[1]), atk: [e.atk[0], e.atk[1]],
      lvl: GameCore.R(e.lvl[0], e.lvl[1])
    };
    enemy.hp = enemy.hpMax;
    GameCore.addLog(`Une ${enemy.name} (${enemy.type}) surgit dans ${z.name} !`);
    renderEnemy();
  }

  function renderPlayer(){
    const s = GameCore.state;
    $('pName').textContent = s.name; $('pClass').textContent = s.cls; $('pLvl').textContent = s.level;
    $('pStr').textContent = s.str; $('pDex').textContent = s.dex; $('pVit').textContent = s.vit; $('pEne').textContent = s.ene;
    $('pAtk').textContent = GameCore.baseAttack();
    $('pDef').textContent = GameCore.baseDefense();
    $('pCrit').textContent = GameCore.baseCrit();
    $('pGold').textContent = s.gold;
    $('pMF').textContent = GameCore.totalMF();

    const hpPct = Math.max(0, Math.min(1, s.hp / s.hpMax));
    const manaPct = Math.max(0, Math.min(1, s.mana / s.manaMax));
    const xpPct = Math.max(0, Math.min(1, s.xp / s.xpToNext));
    $('barHpFill').style.width = (hpPct*100)+'%'; $('barHpText').textContent = `HP ${s.hp}/${s.hpMax}`;
    $('barManaFill').style.width = (manaPct*100)+'%'; $('barManaText').textContent = `Mana ${s.mana}/${s.manaMax}`;
    $('barXpFill').style.width = (xpPct*100)+'%'; $('barXpText').textContent = `XP ${s.xp}/${s.xpToNext}`;

    document.getElementById('logBox').innerHTML = GameCore.logsHTML();
  }
  function renderEnemy(){
    if(!enemy){ $('enemyCard').hidden=true; return; }
    $('enemyCard').hidden=false;
    $('eName').textContent = enemy.name; $('eLvl').textContent = enemy.lvl; $('eType').textContent = enemy.type;
    $('eHP').textContent = enemy.hp; $('eHPmax').textContent = enemy.hpMax;
    $('eDef').textContent = enemy.def;
    const z = ACTS[GameCore.state.act].zones[GameCore.state.zone];
    $('eDice').textContent = z.enemyDice;
    $('eHpBar').max = enemy.hpMax; $('eHpBar').value = enemy.hp;
  }

  function setAct(v){
    const lvl = GameCore.state.level;
    const req = ACTS[v]?.req||1;
    if(lvl < req){ GameCore.addLog(`Acte verrouillé (requiert niv ${req}).`); return; }
    GameCore.state.act = v;
    const firstZone = Object.keys(ACTS[v].zones)[0];
    GameCore.state.zone = firstZone;
    GameCore.save();
    populateSelectors();
  }
  function setZone(v){ GameCore.state.zone = v; GameCore.save(); }

  function playerCritChance(){ return Math.min(75, GameCore.baseCrit()); }

  function attackOnce(){
    const s = GameCore.state;
    if(!enemy){ GameCore.addLog("Aucun ennemi. Lance une nouvelle rencontre."); renderPlayer(); return; }
    // Joueur frappe
    let pAtk = GameCore.baseAttack();
    if(Math.random()*100 < playerCritChance()) pAtk = Math.floor(pAtk * 1.75);
    pAtk += GameCore.R(0,4);
    const dmgToEnemy = Math.max(1, pAtk - enemy.def);
    enemy.hp = Math.max(0, enemy.hp - dmgToEnemy);
    GameCore.addLog(`⚔️ ${s.name} inflige ${dmgToEnemy} à ${enemy.name}.`);
    if(enemy.hp<=0){ victory(); return; }
    // Riposte
    const eDmg = GameCore.R(enemy.atk[0], enemy.atk[1]);
    const dmgToPlayer = Math.max(0, eDmg - GameCore.baseDefense());
    s.hp = Math.max(0, s.hp - dmgToPlayer);
    GameCore.addLog(`☠️ ${enemy.name} riposte : ${dmgToPlayer} dégâts.`);
    if(s.hp<=0){ defeat(); return; }
    GameCore.save();
    renderPlayer(); renderEnemy();
  }

  function victory(){
    const s = GameCore.state;
    const z = ACTS[s.act].zones[s.zone];
    const xpGain = GameCore.R(z.xp[0], z.xp[1]);
    const goldGain = GameCore.R(z.gold[0], z.gold[1]);
    GameCore.gainXP(xpGain);
    s.gold += goldGain;
    GameCore.addLog(`🏆 ${s.name} vainc ${enemy.name} (+${xpGain} XP, +${goldGain} or).`);
    if(Math.random() < z.lootChance){
      const it = Loot.genItem(s.act);
      Loot.addToBag(it);
    }
    enemy = null;
    renderEnemy(); renderPlayer();
  }

  function defeat(){
    const s = GameCore.state;
    GameCore.addLog(`💀 ${s.name} est terrassé ! Retour au camp.`);
    s.hp = s.hpMax; enemy = null;
    GameCore.save();
    renderPlayer(); renderEnemy();
  }

  function offlineSim(encounters){
    let kills=0, xp=0, items=0, gold=0;
    for(let i=0;i<encounters;i++){
      const s = GameCore.state;
      const z = ACTS[s.act].zones[s.zone];
      if(Math.random()<0.6){
        kills++; xp += GameCore.R(z.xp[0], z.xp[1]); gold += GameCore.R(z.gold[0], z.gold[1]);
        if(Math.random()< z.lootChance*0.6){ if(Loot.addToBag(Loot.genItem(s.act))) items++; }
      }
    }
    GameCore.state.gold += gold; GameCore.gainXP(xp);
    return {kills, xp, gold, items};
  }

  function initUI(){
    populateSelectors();
    renderPlayer();
    $('actSelect').addEventListener('change', e=> setAct(e.target.value));
    $('zoneSelect').addEventListener('change', e=> setZone(e.target.value));
    $('newEncounter').addEventListener('click', pickEnemy);
    $('attackBtn').addEventListener('click', attackOnce);
    $('fleeBtn').addEventListener('click', ()=>{ GameCore.addLog('Tu prends la fuite.'); enemy=null; renderEnemy(); });
    $('autoToggle').addEventListener('change', e=> setAuto(e.target.checked));
    if(!enemy) pickEnemy();
  }

  let autoTimer=null;
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
      }, 2000);
      GameCore.addLog('Auto-combat activé.');
    } else {
      GameCore.addLog('Auto-combat désactivé.');
    }
  }

  return { initUI, offlineSim };
})();