const Loot = (()=>{

  const RARITY = [
    { key:'common', label:'Commun', chance:70, atk:[0,3], def:[0,2], crit:[0,2] },
    { key:'rare',   label:'Rare',   chance:25, atk:[2,6], def:[1,5], crit:[1,5] },
    { key:'unique', label:'Unique', chance:5,  atk:[6,12],def:[4,10],crit:[4,10] }
  ];

  const SLOTS = ['weapon','shield','head','chest','ring','amulet'];

  function pickRarity(){
    const roll = Math.random()*100;
    let sum=0;
    for(const r of RARITY){
      sum+=r.chance;
      if(roll<=sum) return r;
    }
    return RARITY[0];
  }

  function affixRange([a,b]){ return GameCore.R(a,b); }

  function genItemForZone(zone){
    const r = pickRarity();
    const slot = SLOTS[GameCore.R(0,SLOTS.length-1)];
    const name = `${r.label} ${slot}`;
    const affixes = {
      atk: slot==='weapon' ? affixRange(r.atk) : 0,
      def: (slot==='shield'||slot==='chest'||slot==='head') ? affixRange(r.def) : 0,
      crit: slot==='amulet' ? affixRange(r.crit) : 0
    };
    return { name, slot, rarity:r.key, affixes };
  }

  function addToBag(item){
    const s = GameCore.state;
    s.bag.push(item);
    GameCore.addLog(`Loot: ${item.name}`);
    GameCore.save();
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

  function totalAttack(){ return GameCore.baseAttack(); }
  function totalDefense(){ return GameCore.baseDefense(); }
  function totalCrit(){ return GameCore.baseCrit(); }

  return { genItemForZone, addToBag, toggleEquip, totalAttack, totalDefense, totalCrit };
})();