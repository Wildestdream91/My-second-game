const Loot = (()=>{
  const MAX_CAPACITY = 40;

  // Affixes pool (multi-affixes)
  const AFFIX_POOL = {
    weapon: ['atk','crit','mf'],
    shield: ['def','mf'],
    head:   ['def','mf','crit'],
    chest:  ['def','mf'],
    ring:   ['crit','mf','atk'],
    amulet: ['crit','mf']
  };

  const AFFIX_RANGES = {
    atk:  { common:[1,5],  rare:[3,9],  unique:[7,12] },
    def:  { common:[1,4],  rare:[3,7],  unique:[6,12] },
    crit: { common:[1,3],  rare:[3,7],  unique:[6,12] },
    mf:   { common:[5,10], rare:[10,20],unique:[15,35] } // Magic Find %
  };

  // Sets examples
  const SETS = {
    wolf: {
      name:"Héritage du Loup",
      pieces:['weapon','head'],
      bonuses: {2:{atk:3, crit:3}, 3:{def:3}} // only 2p achievable here
    },
    ash : {
      name:"Cendre Éternelle",
      pieces:['weapon','amulet','ring'],
      bonuses: {2:{atk:4}, 3:{crit:4}}
    }
  };

  const UNIQUES = {
    weapon: [{ name:"Lame Cendrée", affixes:{ atk:10, crit:6, mf:10 }, note:"+ dégât constant" }],
    amulet: [{ name:"Œil de Minuit", affixes:{ crit:10, mf:20 }, note:"+ chance de critique" }],
    ring  : [{ name:"Sceau Antique", affixes:{ crit:8, mf:12 }, note:"chance de butin rare" }],
    head  : [{ name:"Heaume du Vagabond", affixes:{ def:8, mf:15 }, note:"confort de farm" }],
  };

  // Rarity weights per act (more rares later)
  const RARITY_WEIGHTS = {
    act1:{ common:88, rare:10, unique:2 },
    act2:{ common:85, rare:12, unique:3 },
    act3:{ common:82, rare:14, unique:4 },
    act4:{ common:78, rare:17, unique:5 },
    act5:{ common:75, rare:18, unique:7 },
  };

  function totalMF(){
    const eq = GameCore.state.equipment;
    let mf=0;
    for(const k in eq){
      const a=eq[k]?.affixes;
      if(a?.mf) mf += a.mf;
    }
    return Math.min(200, mf); // cap
  }

  function rollRarity(zoneKey){
    const act = GameCore.actOfZone(zoneKey);
    const w = RARITY_WEIGHTS[act] || RARITY_WEIGHTS.act1;
    const mf = totalMF();
    // MF increases chance of rare/unique by shifting weights
    const uniqueBoost = Math.min(0.5, mf*0.0015); // up to +50%
    const rareBoost   = Math.min(0.5, mf*0.0010);
    const unique = w.unique*(1+uniqueBoost);
    const rare   = w.rare*(1+rareBoost);
    const common = Math.max(0, 100 - (unique+rare));
    const r = Math.random()*100;
    if(r < unique) return 'unique';
    if(r < unique + rare) return 'rare';
    return 'common';
  }

  const SLOTS = ['weapon','shield','head','chest','ring','amulet'];

  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function range([a,b]){ return GameCore.R(a,b); }

  function genAffixes(slot, rarity){
    const pool = AFFIX_POOL[slot];
    const count = rarity==='unique' ? GameCore.R(2,3) : (rarity==='rare' ? GameCore.R(2,3) : GameCore.R(1,2));
    const chosen = [];
    while(chosen.length < count){
      const a = pick(pool);
      if(!chosen.includes(a)) chosen.push(a);
    }
    const aff = { value: GameCore.R(8,18) * (rarity==='unique'?3:(rarity==='rare'?2:1)) };
    for(const key of chosen){
      const [min,max] = AFFIX_RANGES[key][rarity];
      aff[key] = range([min,max]);
    }
    return aff;
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

  function genItemForZone(zoneKey){
    const slot = SLOTS[GameCore.R(0,SLOTS.length-1)];
    const rarity = rollRarity(zoneKey);

    // Try unique
    if(rarity==='unique' && UNIQUES[slot] && Math.random()<0.75){
      const u = UNIQUES[slot][GameCore.R(0,UNIQUES[slot].length-1)];
      return { name:u.name, slot, rarity:'unique', affixes:{...u.affixes, value: GameCore.R(30,45)}, note:u.note };
    }

    // Small chance for set piece on rare
    let setKey=null, setInfo=null;
    if(rarity!=='common' && Math.random()<0.18){
      for(const k in SETS){ const st = SETS[k]; if(st.pieces.includes(slot)){ setKey=k; setInfo=st; break; } }
    }

    const name = `${rarity==='common'?'Commun':rarity==='rare'?'Rare':'Unique'} ${baseNameFor(slot)}` + (setInfo?` (${setInfo.name})`:'');
    const affixes = genAffixes(slot, rarity);
    const it = { name, slot, rarity, affixes };
    if(setKey){ it.setKey=setKey; it.setName=setInfo.name; }
    return it;
  }

  function makePotion(){ return { name:'Potion de soin', type:'potion', slot:'consumable', rarity:'common', affixes:{ healPct:35, value:2 } }; }

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
    if(s.bag.length < 40){ s.bag.push(it); }
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
    let t = `${it.name}
Rareté: ${it.rarity}`;
    const a = it.affixes||{};
    if(a.atk)  t += `\nATQ +${a.atk}`;
    if(a.def)  t += `\nDEF +${a.def}`;
    if(a.crit) t += `\nCrit +${a.crit}%`;
    if(a.mf)   t += `\nMF +${a.mf}%`;
    t += `\nValeur: ${a.value||1} or`;
    if(it.setKey){
      const st = SETS[it.setKey];
      if(st){
        const count = equippedCount(it.setKey);
        t += `\n\nSet: ${st.name} (${count}/${st.pieces.length})`;
        const steps = Object.keys(st.bonuses).map(n=>parseInt(n)).sort((a,b)=>a-b);
        for(const n of steps){
          const b = st.bonuses[n];
          const active = count>=n ? '✓' : '✗';
          t += `\n(${n}) ${active} ` + bonusToText(b);
        }
      }
    }
    if(it.rarity==='unique' && it.note){ t += `\nUnique: ${it.note}`; }
    return t;
  }

  function bonusToText(b){
    const arr=[];
    if(b.atk) arr.push(`+${b.atk} ATQ`);
    if(b.def) arr.push(`+${b.def} DEF`);
    if(b.crit) arr.push(`+${b.crit}% Crit`);
    if(b.mf) arr.push(`+${b.mf}% MF`);
    return arr.join(' ');
  }

  function equippedCount(setKey){
    const eq = GameCore.state.equipment;
    let c=0;
    for(const s in eq){ if(eq[s]?.setKey===setKey) c++; }
    return c;
  }

  function setBonuses(){
    const eq = GameCore.state.equipment;
    const counts = {};
    for(const s in eq){
      const it = eq[s];
      if(it?.setKey) counts[it.setKey]=(counts[it.setKey]||0)+1;
    }
    const bonus = {atk:0,def:0,crit:0,mf:0};
    for(const key in counts){
      const st = SETS[key]; const c=counts[key];
      if(!st) continue;
      const steps = Object.keys(st.bonuses).map(n=>parseInt(n)).sort((a,b)=>a-b);
      for(const n of steps){ if(c>=n){ const b = st.bonuses[n]; bonus.atk+=(b.atk||0); bonus.def+=(b.def||0); bonus.crit+=(b.crit||0); bonus.mf+=(b.mf||0);} }
    }
    return bonus;
  }

  function activeSetText(){
    const eq = GameCore.state.equipment;
    const counts = {};
    for(const s in eq){ const it=eq[s]; if(it?.setKey) counts[it.setKey]=(counts[it.setKey]||0)+1; }
    const names = {wolf:"Héritage du Loup", ash:"Cendre Éternelle"};
    const actives = Object.keys(counts).filter(k=>counts[k]>=2).map(k=>`${names[k]||k} (${counts[k]} pièces)`);
    return actives.length? `Bonus de set actif: ${actives.join(', ')}` : '';
  }

  function totalAttack(){ return GameCore.baseAttack() + setBonuses().atk; }
  function totalDefense(){ return GameCore.baseDefense() + setBonuses().def; }
  function totalCrit(){ return GameCore.baseCrit() + setBonuses().crit; }
  function totalMF(){ return (function(){ let x=0; const eq=GameCore.state.equipment; for(const k in eq){ x+=(eq[k]?.affixes?.mf||0); } x+=setBonuses().mf||0; return x; })(); }

  return { genItemForZone, addToBag, toggleEquip, sellCommons, totalAttack, totalDefense, totalCrit, totalMF,
           tooltipText, setBonuses, activeSetText, makePotion, useConsumable, unequip };
})();