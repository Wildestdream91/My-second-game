const Loot = (()=>{
  const MAX_CAPACITY = 40;

  // ----- Sets & uniques -----
  const SETS = {
    wolf: { name:"Set du Loup", pieces:["weapon","head"], bonus2:{ atk:2, crit:3 } },
    ash : { name:"Set des Cendres", pieces:["weapon","amulet"], bonus2:{ atk:4 } }
  };
  const UNIQUES = {
    weapon: [{ name:"Lance des Cendres", affixes:{ atk:8, demonCrit:20 }, note:"+20% crit contre démons" }],
    amulet: [{ name:"Œil de la Nuit",    affixes:{ crit:8 }, note:"+8% crit" }],
    ring  : [{ name:"Sceau Fendu",       affixes:{ crit:5 }, note:"+5% crit" }]
  };

  const RARITY = [
    { key:'common', label:'Commun', chance:68, atk:[0,3], def:[0,2], crit:[0,2], value:[3,6] },
    { key:'rare',   label:'Rare',   chance:28, atk:[2,6], def:[1,5], crit:[1,5], value:[8,15] },
    { key:'unique', label:'Unique', chance:4,  atk:[6,12],def:[4,10],crit:[4,10],value:[20,35] }
  ];
  const SLOTS = ['weapon','shield','head','chest','ring','amulet'];

  function pickRarity(){
    const roll = Math.random()*100;
    let sum=0;
    for(const r of RARITY){ sum+=r.chance; if(roll<=sum) return r; }
    return RARITY[0];
  }
  function affixRange([a,b]){ return GameCore.R(a,b); }

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

  function genItemForZone(zone){
    const rarity = pickRarity();
    const slot = SLOTS[GameCore.R(0,SLOTS.length-1)];

    // unique named
    if(rarity.key==='unique' && UNIQUES[slot] && Math.random()<0.8){
      const cand = UNIQUES[slot][GameCore.R(0, UNIQUES[slot].length-1)];
      return { name:cand.name, slot, rarity:'unique', affixes:{...cand.affixes, value: GameCore.R(24,40)}, note:cand.note };
    }

    // set candidate (rare only) ~15% chance if slot compatible
    let setKey=null, setInfo=null;
    if(rarity.key==='rare' && Math.random()<0.15){
      for(const k in SETS){
        const st = SETS[k];
        if(st.pieces.includes(slot)){ setKey=k; setInfo=st; break; }
      }
    }

    const name = `${rarity.label} ${baseNameFor(slot)}` + (setInfo?` (${setInfo.name})`:'');
    const affixes = {
      atk: slot==='weapon' ? affixRange(rarity.atk) : 0,
      def: (slot==='shield'||slot==='chest'||slot==='head') ? affixRange(rarity.def) : 0,
      crit: slot==='amulet' ? affixRange(rarity.crit) : 0,
      value: GameCore.R(rarity.value[0], rarity.value[1])
    };
    const it = { name, slot, rarity:rarity.key, affixes };
    if(setKey){ it.setKey = setKey; it.setName = setInfo.name; }
    return it;
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
      const heal = Math.floor(s.hpMax * (it.affixes.healPct||35)/100);
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
    const equipped = s.equipment[it.slot];
    s.equipment[it.slot] = it;
    if(equipped){
      s.bag[bagIndex] = equipped;
    } else {
      s.bag.splice(bagIndex,1);
    }
    GameCore.save();
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

  // ---- Comparison & tooltips ----
  function compareWithEquipped(it){
    const s = GameCore.state;
    const eq = s.equipment[it.slot];
    if(!eq || it.slot==='consumable') return '';
    const dAtk = (it.affixes.atk||0) - (eq.affixes?.atk||0);
    const dDef = (it.affixes.def||0) - (eq.affixes?.def||0);
    const dCrit= (it.affixes.crit||0) - (eq.affixes?.crit||0);
    const seg = [];
    if(dAtk) seg.push(`ATQ ${dAtk>0?'+':''}${dAtk}`);
    if(dDef) seg.push(`DEF ${dDef>0?'+':''}${dDef}`);
    if(dCrit)seg.push(`Crit ${dCrit>0?'+':''}${dCrit}%`);
    return seg.length ? ('\n' + seg.join(' | ')) : '';
  }

  function tooltipText(it){
    if(it.type==='potion'){
      return `${it.name}
Consommable
Soin: ${it.affixes.healPct||35}% HP
Valeur: ${it.affixes.value||1} or`;
    }
    let t = `${it.name}
Rareté: ${it.rarity}
ATQ ${it.affixes.atk||0}  DEF ${it.affixes.def||0}
Crit ${it.affixes.crit||0}%
Valeur: ${it.affixes.value||1} or`;
    if(it.setKey){
      const st = SETS[it.setKey];
      t += `
Set: ${st.name}
Bonus (2): ${st.bonus2.atk?`+${st.bonus2.atk} ATQ `:''}${st.bonus2.crit?`+${st.bonus2.crit}% Crit`:''}`;
    }
    if(it.rarity==='unique' && it.note){ t += `
Unique: ${it.note}`; }
    t += compareWithEquipped(it);
    return t;
  }

  function setBonuses(){
    const s = GameCore.state;
    const equipped = s.equipment;
    const counts = {};
    for(const slot in equipped){
      const it = equipped[slot];
      if(it?.setKey) counts[it.setKey]=(counts[it.setKey]||0)+1;
    }
    const bonus = {atk:0,def:0,crit:0};
    for(const key in counts){
      const c = counts[key];
      const st = SETS[key];
      if(c>=2 && st.bonus2){
        bonus.atk += st.bonus2.atk||0;
        bonus.def += st.bonus2.def||0;
        bonus.crit+= st.bonus2.crit||0;
      }
    }
    return bonus;
  }

  function activeSetText(){
    const s = GameCore.state;
    const counts = {};
    const names = {};
    for(const slot in s.equipment){
      const it = s.equipment[slot];
      if(it?.setKey){ counts[it.setKey]=(counts[it.setKey]||0)+1; names[it.setKey]=it.setName; }
    }
    const actives = Object.keys(counts).filter(k=>counts[k]>=2).map(k=>`${names[k]} (2/2)`);
    return actives.length? `Bonus de set actif: ${actives.join(', ')}` : '';
  }

  function totalAttack(){ return GameCore.baseAttack(); }
  function totalDefense(){ return GameCore.baseDefense(); }
  function totalCrit(){ return GameCore.baseCrit(); }

  return { genItemForZone, addToBag, toggleEquip, sellCommons, totalAttack, totalDefense, totalCrit,
           tooltipText, compareWithEquipped, activeSetText, setBonuses, makePotion, useConsumable };
})();