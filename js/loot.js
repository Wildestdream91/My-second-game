const Loot = (()=>{
  const MAX_CAPACITY = 40;

  // Affixes catalog (simple)
  const AFFIX_POOL = {
    atk:   { label:"+ATQ",   slots:['weapon','ring','amulet'] },
    def:   { label:"+DEF",   slots:['shield','head','chest','ring'] },
    crit:  { label:"+Crit%", slots:['amulet','ring'] },
    hp:    { label:"+HP",    slots:['head','chest','ring'] },
    mf:    { label:"+MF%",   slots:['amulet','ring','head'] }
  };

  // Base ranges per slot
  const BASE_RANGES = {
    weapon:{ atk:[2,12] },
    shield:{ def:[2,8] },
    head:{ def:[1,6], hp:[4,12] },
    chest:{ def:[3,10], hp:[6,16] },
    ring:{ atk:[0,4], def:[0,3], crit:[1,4], hp:[2,8], mf:[2,6] },
    amulet:{ atk:[0,2], crit:[2,8], mf:[4,10] }
  };

  // Sets (simple)
  const SETS = {
    wolf: { name:"Set du Loup", pieces:['weapon','head'], threshold2:{ atk:2, crit:3 } },
    ash:  { name:"Set des Cendres", pieces:['weapon','amulet'], threshold2:{ atk:4, mf:5 } }
  };

  // Rarity weights per act (affects number of affixes & rolls)
  const RARITY = {
    common: { label:'Commun', affixCount:[1,1], mult:1.0, value:[4,10] },
    rare:   { label:'Rare',   affixCount:[2,3], mult:1.2, value:[12,22] },
    unique: { label:'Unique', affixCount:[2,3], mult:1.5, value:[25,45] },
  };

  const ACT_RARITY_WEIGHTS = {
    act1: { common: 88, rare: 11, unique: 1 },
    act2: { common: 85, rare: 13, unique: 2 },
    act3: { common: 82, rare: 15, unique: 3 },
    act4: { common: 78, rare: 18, unique: 4 },
    act5: { common: 75, rare: 20, unique: 5 },
  };

  const SLOTS = ['weapon','shield','head','chest','ring','amulet'];

  function rollRarity(act){
    const w = ACT_RARITY_WEIGHTS[act] || ACT_RARITY_WEIGHTS.act1;
    const mf = GameCore.totalMF() || 0;
    // MF converts some common→rare and rare→unique probability (simple model)
    const bonusRare   = Math.min(12, mf*0.08);
    const bonusUnique = Math.min(5, mf*0.03);
    const weights = {
      unique: Math.min(100, w.unique + bonusUnique),
      rare:   Math.max(0, w.rare + bonusRare),
      common: 100 // computed by leftover
    };
    const total = weights.unique + weights.rare + (w.common - (bonusRare + bonusUnique));
    const r = Math.random()*total;
    if(r < weights.unique) return 'unique';
    if(r < weights.unique + weights.rare) return 'rare';
    return 'common';
  }

  function affixRoll(slot, key, mult){
    const base = BASE_RANGES[slot]||{};
    const range = base[key];
    if(!range) return 0;
    const v = GameCore.R(range[0], range[1]);
    return Math.max(0, Math.floor(v*mult));
  }

  function randomAffixKeysFor(slot){
    // pick possible affixes for slot
    const all = Object.keys(AFFIX_POOL).filter(k=> (AFFIX_POOL[k].slots||[]).includes(slot) || (BASE_RANGES[slot]&&BASE_RANGES[slot][k]));
    return all;
  }

  function genItem(act){
    const slot = SLOTS[GameCore.R(0,SLOTS.length-1)];
    const rarity = rollRarity(act);
    const rcfg = RARITY[rarity];
    const name = `${rcfg.label} ${baseNameFor(slot)}`;

    const affixes = { value: GameCore.R(rcfg.value[0], rcfg.value[1]) };
    const count = GameCore.R(rcfg.affixCount[0], rcfg.affixCount[1]);
    const keys = randomAffixKeysFor(slot);
    for(let i=0;i<count && keys.length;i++){
      const pickIndex = GameCore.R(0, keys.length-1);
      const k = keys.splice(pickIndex,1)[0];
      affixes[k] = (affixes[k]||0) + affixRoll(slot, k, rcfg.mult);
    }

    // unique/set flavor
    let setKey=null;
    if(rarity==='unique' && Math.random()<0.5){
      // 50% uniques appartiennent à un set si slot match
      for(const k in SETS){
        if(SETS[k].pieces.includes(slot)){ setKey=k; break; }
      }
      if(setKey) affixes.mf = (affixes.mf||0) + 3; // petit bonus MF sur uniques de set
    }

    return { name, slot, rarity, affixes, setKey };
  }

  function baseNameFor(slot){
    const baseNames = {
      weapon:['Épée','Hache','Masse','Glaive','Lance'],
      shield:['Targe','Bouclier','Écu'],
      head:['Capuche','Heaume','Masque'],
      chest:['Tunique','Cotte','Armure'],
      ring:['Anneau','Bague'],
      amulet:['Amulette','Talisman']
    };
    return baseNames[slot][GameCore.R(0, baseNames[slot].length-1)];
  }

  function makePotion(){
    return { name:'Potion de soin', type:'potion', slot:'consumable', rarity:'common', affixes:{ healPct:35, value:2 } };
  }

  function addToBag(item){
    const s = GameCore.state;
    if(s.bag.length >= MAX_CAPACITY){
      GameCore.addLog(`⚠️ Inventaire plein, ${item.name} tombe au sol.`);
      return false;
    }
    s.bag.push(item);
    GameCore.addLog(`Loot: ${item.name}`);
    GameCore.save();
    return true;
  }

  function useConsumable(idx){
    const s = GameCore.state;
    const it = s.bag[idx];
    if(!it) return;
    if(it.type==='potion'){
      const heal = Math.floor(s.hpMax * ((it.affixes.healPct||35)/100));
      s.hp = Math.min(s.hpMax, s.hp + heal);
      s.bag.splice(idx,1);
      GameCore.addLog(`🧪 Potion utilisée: +${heal} HP.`);
      GameCore.save();
    }
  }

  function toggleEquip(bagIndex){
    const s = GameCore.state;
    const it = s.bag[bagIndex];
    if(!it || it.slot==='consumable') return;
    const old = s.equipment[it.slot];
    s.equipment[it.slot] = it;
    if(old){ s.bag[bagIndex] = old; } else { s.bag.splice(bagIndex,1); }
    GameCore.addLog(`Équipé: ${it.name}`);
    GameCore.save();
  }

  function unequip(slot, returnItem=false, dropInstead=false){
    const s = GameCore.state;
    const it = s.equipment[slot];
    if(!it) return null;
    s.equipment[slot] = null;
    GameCore.addLog(`Retiré: ${it.name}`);
    if(dropInstead){ GameCore.addLog(`Jeté: ${it.name}`); return null; }
    if(returnItem){ return it; }
    if(s.bag.length < MAX_CAPACITY){ s.bag.push(it); }
    else { GameCore.addLog(`⚠️ Sac plein, ${it.name} tombe au sol.`); }
    GameCore.save();
    return null;
  }

  function sellCommons(){
    const s = GameCore.state;
    let count=0, gold=0;
    s.bag = s.bag.filter(it=>{
      if(it && it.rarity==='common' && it.slot!=='consumable'){
        count++; gold += it.affixes.value || 1;
        return false;
      }
      return true;
    });
    s.gold += gold;
    GameCore.save();
    return {count, gold};
  }

  function tooltipText(it){
    if(it.type==='potion'){
      return `${it.name}
Consommable
Soin: ${it.affixes.healPct||35}% HP
Valeur: ${it.affixes.value||2} or`;
    }
    const lines = [`${it.name}`, `Rareté: ${it.rarity}`];
    const a = it.affixes || {};
    if(a.atk) lines.push(`ATQ +${a.atk}`);
    if(a.def) lines.push(`DEF +${a.def}`);
    if(a.crit) lines.push(`Crit +${a.crit}%`);
    if(a.hp) lines.push(`HP +${a.hp}`);
    if(a.mf) lines.push(`MF +${a.mf}%`);
    lines.push(`Valeur: ${a.value||1} or`);
    if(it.setKey){
      lines.push(`Set: ${it.setKey==='wolf'?'Set du Loup':'Set des Cendres'}`);
      lines.push(`Bonus (2): ${it.setKey==='wolf'?'+2 ATQ, +3% Crit':'+4 ATQ, +5% MF'}`);
    }
    return lines.join('\n');
  }

  // Totals (used on sheet)
  function activeSetText(){
    const s = GameCore.state;
    const counts = {};
    for(const slot in s.equipment){
      const it = s.equipment[slot];
      if(it?.setKey){ counts[it.setKey]=(counts[it.setKey]||0)+1; }
    }
    const names = {wolf:"Set du Loup", ash:"Set des Cendres"};
    const actives = Object.keys(counts).filter(k=>counts[k]>=2).map(k=>`${names[k]} (2/2)`);
    return actives.length? `Bonus set actif: ${actives.join(', ')}` : '';
  }
  function totalAttack(){ return GameCore.baseAttack(); }
  function totalDefense(){ return GameCore.baseDefense(); }
  function totalCrit(){ return GameCore.baseCrit(); }
  function totalMF(){ return GameCore.totalMF(); }

  return { genItem: genItem, addToBag, toggleEquip, useConsumable, unequip,
           sellCommons, tooltipText, activeSetText, totalAttack, totalDefense, totalCrit, totalMF,
           makePotion };
})();