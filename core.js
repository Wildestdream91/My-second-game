const GameCore = (()=>{

  const DEFAULT_CLASSES = {
    "Barbare":     { str: 15, dex: 10, vit: 15, ene:  5, hp: 60, mana: 20 },
    "Paladin":     { str: 12, dex: 12, vit: 14, ene:  6, hp: 55, mana: 24 },
    "Sorcière":    { str:  5, dex: 10, vit: 10, ene: 20, hp: 40, mana: 50 },
    "Nécromancien":{ str:  7, dex: 12, vit: 11, ene: 18, hp: 45, mana: 45 },
    "Amazone":     { str: 10, dex: 16, vit: 10, ene: 10, hp: 48, mana: 36 }
  };

  const state = {
    created: false,
    name: "", cls: "",
    level: 1, xp: 0, xpToNext: 100,
    str: 0, dex: 0, vit: 0, ene: 0,
    hp: 0, hpMax: 0, mana: 0, manaMax: 0,
    equipment: { weapon:null, shield:null, head:null, chest:null, ring:null, amulet:null },
    bag: [],
    zone: 'foret',
    lastSeen: Date.now(),
    quests: [{title:'Abattre un chef de meute', done:false}],
    log: []
  };

  const R = (min,max)=> Math.floor(Math.random()*(max-min+1))+min;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const addLog = (msg)=>{
    state.log.push(`${new Date().toLocaleTimeString()} — ${msg}`);
    if (state.log.length>300) state.log.shift();
    save();
  };

  function baseAttack(){
    let atk = Math.floor(state.str * 1.5) + 5;
    if(state.equipment.weapon?.affixes?.atk) atk += state.equipment.weapon.affixes.atk;
    return atk;
  }
  function baseDefense(){
    let def = Math.floor(state.dex * 0.8) + Math.floor(state.str*0.2);
    if(state.equipment.shield?.affixes?.def) def += state.equipment.shield.affixes.def;
    if(state.equipment.chest?.affixes?.def)  def += state.equipment.chest.affixes.def;
    return def;
  }
  function baseCrit(){
    let crit = 5 + Math.floor(state.dex/5);
    if(state.equipment.amulet?.affixes?.crit) crit += state.equipment.amulet.affixes.crit;
    return clamp(crit, 0, 75);
  }

  const KEY="idle_arpg_save_v1";
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }
  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return;
      const data = JSON.parse(raw);
      Object.assign(state, data);
    }catch(e){}
  }
  function reset(){
    localStorage.removeItem(KEY);
    location.href='index.html';
  }

  function newGame(name, cls){
    const base = DEFAULT_CLASSES[cls] || DEFAULT_CLASSES["Barbare"];
    state.created = true;
    state.name = name || "Héros";
    state.cls  = cls;
    state.level = 1; state.xp = 0; state.xpToNext = 100;
    state.str = base.str; state.dex = base.dex; state.vit = base.vit; state.ene = base.ene;
    state.hpMax = base.hp + state.vit*2; state.hp = state.hpMax;
    state.manaMax = base.mana + state.ene*2; state.mana = state.manaMax;
    state.bag = []; state.equipment = {weapon:null,shield:null,head:null,chest:null,ring:null,amulet:null};
    state.zone = 'foret';
    state.lastSeen = Date.now();
    state.log = [];
    state.quests = [{title:'Abattre un chef de meute', done:false}];
    addLog(`Nouveau héros : ${state.name} (${state.cls})`);
    save();
  }

  function gainXP(n){
    state.xp += n;
    while(state.xp >= state.xpToNext){
      state.xp -= state.xpToNext;
      levelUp();
    }
    save();
  }
  function levelUp(){
    state.level++;
    state.xpToNext = Math.floor(state.xpToNext * 1.25 + 20);
    state.str += 1; state.dex += 1; state.vit += 2; state.ene += 1;
    state.hpMax += 6 + state.vit; state.hp = state.hpMax;
    state.manaMax += 4 + state.ene; state.mana = state.manaMax;
    addLog(`✨ Niveau ${state.level} atteint !`);
  }

  function applyOfflineProgress(simFn){
    const now = Date.now();
    const deltaSec = Math.floor((now - state.lastSeen)/1000);
    state.lastSeen = now;
    if(deltaSec < 10) { save(); return; }

    const encounters = Math.floor((deltaSec/40) * 0.25 * 4);
    if(encounters>0){
      const res = simFn(encounters);
      addLog(`Idle hors-ligne : ${res.kills} kills, +${res.xp} XP, ${res.items} objets.`);
    }
    save();
  }

  function ensureGameOrRedirect(url){
    load();
    if(!state.created){ location.href = url; }
  }
  function logsHTML(){
    return state.log.map(l=>l).join('\n');
  }

  return {
    state, save, load, reset,
    newGame, ensureGameOrRedirect,
    gainXP, levelUp,
    baseAttack, baseDefense, baseCrit,
    addLog, logsHTML,
    applyOfflineProgress,
    R, clamp
  };
})();