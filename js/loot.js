const Loot = (()=>{
  const MAX_CAPACITY = 40;

  const RARITY = [
    { key:'common', label:'Commun', chance:70, atk:[0,3], def:[0,2], crit:[0,2], value:[3,6] },
    { key:'rare',   label:'Rare',   chance:25, atk:[2,6], def:[1,5], crit:[1,5], value:[8,15] },
    { key:'unique', label:'Unique', chance:5,  atk:[6,12],def:[4,10],crit:[4,10],value:[20,35] }
  ];
  const SLOTS = ['weapon','shield','head','chest','ring','amulet'];

  function pickRarity(){
    const roll = Math.random()*100;
    let sum=0;
    for(const r of RARITY){ sum+=r.chance; if(roll<=sum) return r; }
    return RARITY[0];
  }
  function affixRange([a,b]){ return GameCore.R(a,b); }

  function genItemForZone(zone){
    const r = pickRarity();
    const slot = SLOTS[GameCore.R(0,SLOTS.length-1)];
    const baseNames = {
      weapon:['Épée','Hache','Masse','Glaive'],
      shield:['Targe','Bouclier','Écu'],
      head:['Capuche','Heaume','Masque'],
      chest:['Tunique','Cotte','Armure'],
      ring:['Anneau','Bague'],
      amulet:['Amulette','Talisman']
    };
    const base = baseNames[slot][GameCore.R(0, baseNames[slot].length-1)];
    const name = `${r.label} ${base}`;
    const affixes = {
      atk: slot==='weapon' ? affixRange(r.atk) : 0,
      def: (slot==='shield'||slot==='chest'||slot==='head') ? affixRange(r.def) : 0,
      crit: slot==='amulet' ? affixRange(r.crit) : 0,
      value: GameCore.R(r.value[0], r.value[1])
    };
    return { name, slot, rarity:r.key, affixes };
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

  function toggleEquip(bagIndex){
    const s = GameCore.state;
    const it = s.bag[bagIndex];
    if(!it) return;
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
      if(it && it.rarity==='common'){
        count++; gold += it.affixes.value || 1;
        return false;
      }
      return true;
    });
    s.gold += gold;
    GameCore.save();
    return {count, gold};
  }

  function totalAttack(){ return GameCore.baseAttack(); }
  function totalDefense(){ return GameCore.baseDefense(); }
  function totalCrit(){ return GameCore.baseCrit(); }

  return { genItemForZone, addToBag, toggleEquip, sellCommons, totalAttack, totalDefense, totalCrit };
})();