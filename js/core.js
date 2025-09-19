const GameCore = (()=>{
  const SAVE_VERSION = 53;
  const KEY="idle_arpg_save_v5_3";

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
    zone: 'act1_foret',
    act: 'act1',
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
    if (state.log.length>900) state.log.shift();
    save();
  };
  const startOfToday = ()=> { const d=new Date(); d.setHours(0,0,0,0); return d.getTime(); };

  // Derived (base + items + sets)
  function setBonuses(){
    const counts = {};
    const eq = state.equipment;
    for(const slot in eq){
      const it = eq[slot]; if(!it?.setKey) continue;
      counts[it.setKey] = (counts[it.setKey]||0)+1;
    }
    const bonus = { atk:0, def:0, crit:0, hpPct:0, mf:0 };
    // Define simple sets
    const SETS = {
      wolf:{ name:"Set du Loup",  thresholds:{2:{atk:2,crit:3},3:{hpPct:5}} },
      ash :{ name:"Set des Cendres", thresholds:{2:{atk:4,mf:5},3:{def:3}} }
    };
    for(const key in counts){
      const pieces = counts[key], cfg = SETS[key];
      if(!cfg) continue;
      for(const thr in cfg.thresholds){
        if(pieces >= parseInt(thr)){
          const b = cfg.thresholds[thr];
          for(const k in b){ bonus[k]=(bonus[k]||0)+b[k]; }
        }
      }
    }
    return bonus;
  }

  function fromEquipment(){
    const eq = state.equipment;
    const sum = { atk:0, def:0, crit:0, mf:0, flatHp:0 };
    for(const slot in eq){
      const it = eq[slot]; if(!it) continue;
      const a = it.affixes||{};
      sum.atk += a.atk||0;
      sum.def += a.def||0;
      sum.crit += a.crit||0;
      sum.mf += a.mf||0;
      sum.flatHp += a.hp||0;
    }
    const setB = setBonuses();
    sum.atk += setB.atk||0;
    sum.def += setB.def||0;
    sum.crit += setB.crit||0;
    sum.mf += setB.mf||0;
    sum.hpPct = setB.hpPct||0;
    return sum;
  }

  function baseAttack(){
    let atk = Math.floor(state.str * 1.5) + 5;
    const eq = fromEquipment(); atk += eq.atk;
    return atk;
  }
  function baseDefense(){
    let def = Math.floor(state.dex * 0.8) + Math.floor(state.str*0.2);
    const eq = fromEquipment(); def += eq.def;
    return def;
  }
  function baseCrit(){
    let crit = 5 + Math.floor(state.dex/5);
    const eq = fromEquipment(); crit += eq.crit;
    return clamp(crit, 0, 75);
  }
  function totalMF(){
    return clamp(fromEquipment().mf, 0, 300);
  }

  // Save / Load
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
  function migrate(){ if(!state.version){ state.version = SAVE_VERSION; } }

  function reset(){
    localStorage.removeItem(KEY);
    location.href='index.html';
  }

  // New Game
  function newGame(name, cls){
    const base = DEFAULT_CLASSES[cls] || DEFAULT_CLASSES["Barbare"];
    Object.assign(state, {
      version: SAVE_VERSION, created: true,
      name: name || "Héros", cls,
      level: 1, xp: 0, xpToNext: 100,
      str: base.str, dex: base.dex, vit: base.vit, ene: base.ene,
      hpMax: base.hp + base.vit*2, hp: 0, manaMax: base.mana + base.ene*2, mana: 0,
      gold: 0, equipment:{weapon:null,shield:null,head:null,chest:null,ring:null,amulet:null},
      bag:[], zone:'act1_foret', act:'act1', lastSeen: Date.now(), log:[],
      lastDailyReset: startOfToday(), shop:{ lastReset: startOfToday(), potionsBought:0 }
    });
    state.hp = state.hpMax; state.mana = state.manaMax;
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
    const eq = fromEquipment();
    state.hpMax += 6 + state.vit + (eq.flatHp||0);
    state.hpMax = Math.floor(state.hpMax * (1 + (eq.hpPct||0)/100));
    state.hp = state.hpMax;
    state.manaMax += 4 + state.ene; state.mana = state.manaMax;
    addLog(`✨ Niveau ${state.level} atteint !`);
    checkActUnlock();
  }

  function checkActUnlock(){
    const lvl = state.level;
    const unlocks = [
      {act:'act2', lvl:15, name:'Acte II — Désert de Lut Gholein'},
      {act:'act3', lvl:27, name:'Acte III — Jungle de Kurast'},
      {act:'act4', lvl:35, name:'Acte IV — Enfer'},
      {act:'act5', lvl:40, name:'Acte V — Mont Arreat'},
    ];
    for(const u of unlocks){
      if(lvl === u.lvl){
        addLog(`✨ Déblocage : ${u.name} !`);
      }
    }
  }

  // Offline progress (stubbed simple)
  function applyOfflineProgress(simFn){
    const now = Date.now(); let delta = Math.floor((now - state.lastSeen)/1000); state.lastSeen = now;
    if(delta < 10) { save(); return; }
    delta = Math.min(delta, 3*3600);
    const encounters = Math.floor(delta/30);
    const res = simFn(encounters);
    addLog(`Idle hors-ligne : ${res.kills} kills, +${res.xp} XP, +${res.gold} or, ${res.items} objets.`);
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
    newGame, ensureGameOrRedirect: (url)=>{ load(); if(!state.created){ location.href = url; return; } },
    gainXP, levelUp,
    baseAttack, baseDefense, baseCrit, totalMF, setBonuses, fromEquipment,
    addLog, logsHTML,
    applyOfflineProgress,
    exportSave, importSave,
    R, clamp
  };
})();