const GameCore = (()=>{
  const SAVE_VERSION = 5;
  const KEY="idle_arpg_save_v5";

  const DEFAULT_CLASSES = {
    "Barbare":     { str: 15, dex: 10, vit: 15, ene:  5, hp: 60, mana: 20 },
    "Paladin":     { str: 12, dex: 12, vit: 14, ene:  6, hp: 55, mana: 24 },
    "Sorcière":    { str:  5, dex: 10, vit: 10, ene: 20, hp: 40, mana: 50 },
    "Nécromancien":{ str:  7, dex: 12, vit: 11, ene: 18, hp: 45, mana: 45 },
    "Amazone":     { str: 10, dex: 16, vit: 10, ene: 10, hp: 48, mana: 36 }
  };

  const state = {
    version: SAVE_VERSION,
    created: false,
    name: "", cls: "",
    level: 1, xp: 0, xpToNext: 100,
    str: 0, dex: 0, vit: 0, ene: 0,
    hp: 0, hpMax: 0, mana: 0, manaMax: 0,
    gold: 0,
    equipment: { weapon:null, shield:null, head:null, chest:null, ring:null, amulet:null },
    bag: [],
    zone: 'foret',
    lastSeen: Date.now(),
    lastDailyReset: 0,
    shop: { lastReset: 0, potionsBought: 0 },
    log: []
  };

  // Utils
  const R = (min,max)=> Math.floor(Math.random()*(max-min+1))+min;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const addLog = (msg)=>{
    state.log.push(`${new Date().toLocaleTimeString()} — ${msg}`);
    if (state.log.length>800) state.log.shift();
    save();
  };
  const startOfToday = ()=> { const d=new Date(); d.setHours(0,0,0,0); return d.getTime(); };

  // Derived
  function baseAttack(){
    let atk = Math.floor(state.str * 1.5) + 5;
    if(state.equipment.weapon?.affixes?.atk) atk += state.equipment.weapon.affixes.atk;
    const setB = window.Loot?.setBonuses() || {atk:0};
    atk += setB.atk||0;
    return atk;
  }
  function baseDefense(){
    let def = Math.floor(state.dex * 0.8) + Math.floor(state.str*0.2);
    if(state.equipment.shield?.affixes?.def) def += state.equipment.shield.affixes.def;
    if(state.equipment.chest?.affixes?.def)  def += state.equipment.chest.affixes.def;
    const setB = window.Loot?.setBonuses() || {def:0};
    def += setB.def||0;
    return def;
  }
  function baseCrit(){
    let crit = 5 + Math.floor(state.dex/5);
    if(state.equipment.amulet?.affixes?.crit) crit += state.equipment.amulet.affixes.crit;
    const setB = window.Loot?.setBonuses() || {crit:0};
    crit += setB.crit||0;
    return clamp(crit, 0, 75);
  }

  // Save / Load / Migrate
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }
  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return;
      const data = JSON.parse(raw);
      Object.assign(state, data);
      migrate();
    }catch(e){}
  }
  function migrate(){
    if(!state.version){ state.version = 1; }
    if(state.version < 5){
      state.gold = state.gold || 0;
      state.bag = state.bag || [];
      state.shop = state.shop || { lastReset: 0, potionsBought: 0 };
      state.version = 5;
      addLog('Migration → v5 (barres HP/Mana/XP).');
    }
  }
  function reset(){
    localStorage.removeItem(KEY);
    location.href='index.html';
  }

  // New Game
  function newGame(name, cls){
    const base = DEFAULT_CLASSES[cls] || DEFAULT_CLASSES["Barbare"];
    state.version = SAVE_VERSION;
    state.created = true;
    state.name = name || "Héros";
    state.cls  = cls;
    state.level = 1; state.xp = 0; state.xpToNext = 100;
    state.str = base.str; state.dex = base.dex; state.vit = base.vit; state.ene = base.ene;
    state.hpMax = base.hp + state.vit*2; state.hp = state.hpMax;
    state.manaMax = base.mana + state.ene*2; state.mana = state.manaMax;
    state.gold = 0;
    state.bag = []; state.equipment = {weapon:null,shield:null,head:null,chest:null,ring:null,amulet:null};
    state.zone = 'foret';
    state.lastSeen = Date.now();
    state.log = [];
    state.lastDailyReset = startOfToday();
    state.shop = { lastReset: state.lastDailyReset, potionsBought: 0 };
    addLog(`Nouveau héros : ${state.name} (${state.cls})`);
    save();
  }

  // XP / Level
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

  // Daily reset
  function dailyResetIfNeeded(){
    const today = startOfToday();
    if(state.lastDailyReset < today){
      state.lastDailyReset = today;
      state.shop.potionsBought = 0;
      addLog('Nouveau jour : stock du marchand réinitialisé.');
      save();
    }
  }
  function ensureGameOrRedirect(url){
    load();
    if(!state.created){ location.href = url; return; }
    dailyResetIfNeeded();
  }

  // Offline progress
  function applyOfflineProgress(simFn){
    load();
    const now = Date.now();
    let delta = Math.floor((now - state.lastSeen)/1000);
    state.lastSeen = now;
    if(delta < 10) { save(); return; }
    delta = Math.min(delta, 4*3600);
    const encounters = Math.floor((delta/40) * 0.35 * 4);
    if(encounters>0){
      const res = simFn(encounters);
      addLog(`Idle hors-ligne : ${res.kills} kills, +${res.xp} XP, +${res.gold} or, ${res.items} objets.`);
    }
    save();
  }

  // Export / Import
  function exportSave(){
    const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'idle-arpg-save.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    addLog('Sauvegarde exportée.');
  }
  async function importSave(file){
    const text = await file.text();
    const data = JSON.parse(text);
    Object.assign(state, data);
    migrate(); save();
    addLog('Sauvegarde importée.');
  }

  function logsHTML(){ return state.log.join('\n'); }

  return {
    state, save, load, reset,
    newGame, ensureGameOrRedirect,
    gainXP, levelUp,
    baseAttack, baseDefense, baseCrit,
    addLog, logsHTML,
    applyOfflineProgress,
    exportSave, importSave,
    R, clamp
  };
})();