/* loot.js — raretés, MF, drops et équipement basique */
const Loot = (function(){
  // Raretés et poids (avant MF / difficulté)
  const RARITY = [
    { key:"normal", name:"Normal",  cls:"r-normal",  weight:100 },
    { key:"magic",  name:"Magique", cls:"r-magic",   weight:22  },
    { key:"rare",   name:"Rare",    cls:"r-rare",    weight:6   },
    { key:"set",    name:"Set",     cls:"r-set",     weight:2   },
    { key:"unique", name:"Unique",  cls:"r-unique",  weight:1   },
  ];

  const SLOTS = ["arme","casque","armure","gants","bottes","anneau","amulette"];

  // Génération d’un item simple
  function genItem(z){
    const s = GameCore.state;
    const diff = Zones.getDifficultyScalars(GameCore.getDifficulty());
    const cfg = GameCore.getConfig?.() || {};

    // Chances ajustées par MF et diff
    const mf = Math.max(0, Math.min(500, (GameCore.mfTotal?.()||0) + (diff.mfBonus||0) + (cfg.mfRate||0)));
    // On convertit MF en bonus sur les poids "haut de gamme"
    const weights = RARITY.map(r=>{
      let w = r.weight;
      if(r.key!=="normal"){
        w = Math.max(1, Math.floor(w * (1 + mf/250))); // MF améliore non-normal
      }
      return w;
    });
    const total = weights.reduce((a,b)=>a+b,0);
    let roll = Math.random()*total;
    let rarity = RARITY[0];
    for(let i=0;i<RARITY.length;i++){
      if(roll < weights[i]){ rarity = RARITY[i]; break; }
      roll -= weights[i];
    }

    // Slot et affixes très simples
    const slot = SLOTS[Math.floor(Math.random()*SLOTS.length)];
    const name = `${rarity.name} ${slot}`;
    // affixes: petits bonus liés au niveau de zone
    const zl = Math.max(1, (z?.zl||1));
    const atk = (slot==="arme") ? Math.floor(1+zl*0.6+(rarity===RARITY[4]? zl*0.6 : 0)) : 0;
    const def = (slot==="armure"||slot==="casque"||slot==="gants"||slot==="bottes") ? Math.floor(1+zl*0.4+(rarity===RARITY[3]? zl*0.5 : 0)) : 0;
    const crit= (slot==="amulette"||slot==="anneau") ? Math.min(25, Math.floor(1+zl*0.15)) : 0;
    const mfB = (slot==="amulette"||slot==="anneau") ? Math.min(20, Math.floor(1+zl*0.12)) : 0;

    return {
      id: "it_"+Date.now()+"_"+Math.floor(Math.random()*9999),
      slot, rarity:rarity.key, rarityCls:rarity.cls, name,
      atk, def, crit, mf: mfB,
      zl
    };
  }

  // Probabilité de drop d’un objet (avant MF), ajustée par diff/config
  function shouldDrop(z){
    const diff = Zones.getDifficultyScalars(GameCore.getDifficulty());
    const cfg  = GameCore.getConfig?.() || {};
    const base = 0.18; // 18% base
    const rate = (diff.reward.drop||1) * ((cfg.dropRate||100)/100);
    const chance = Math.max(0.01, Math.min(0.95, base * rate));
    return Math.random() < chance;
  }

  function addToInventory(item){
    const s=GameCore.state;
    s.inv = s.inv || [];
    s.inv.push(item);
    GameCore.save();
  }

  function equipBestAuto(item){ // optionnel: auto-equip si meilleur (simplifié)
    const s=GameCore.state;
    s.equip = s.equip || {};
    const cur = s.equip[item.slot];
    function score(it){
      return (it?.atk||0)*2 + (it?.def||0)*1.5 + (it?.crit||0)*1.2 + (it?.mf||0)*0.6 + (it?.zl||0)*0.2;
    }
    if(!cur || score(item) > score(cur)){
      s.equip[item.slot] = item;
      GameCore.log(`🛡️ Équipé: ${item.name}`);
    }
    GameCore.save();
  }

  function renderInventoryList(containerId){
    const wrap = document.getElementById(containerId||"invList");
    if(!wrap) return;
    const inv = (GameCore.state?.inv)||[];
    wrap.innerHTML = inv.slice().reverse().map(it=>{
      const line = [];
      if(it.atk) line.push(`ATQ +${it.atk}`);
      if(it.def) line.push(`DEF +${it.def}`);
      if(it.crit) line.push(`CRIT +${it.crit}%`);
      if(it.mf) line.push(`MF +${it.mf}%`);
      return `<div class="item">
        <div class="name ${it.rarityCls}">${it.name}</div>
        <div class="muted small">Slot: ${it.slot} • ZL ${it.zl}</div>
        <div>${line.join(" • ")||"<span class='muted'>—</span>"}</div>
        <div class="item-actions">
          <button class="btn" onclick="Loot.equipItem('${it.id}')">Équiper</button>
          <button class="btn" onclick="Loot.dropItem('${it.id}')">Jeter</button>
        </div>
      </div>`;
    }).join('');
  }

  function renderEquipment(containerId){
    const wrap = document.getElementById(containerId||"equipList");
    if(!wrap) return;
    const eq = (GameCore.state?.equip)||{};
    wrap.innerHTML = SLOTS.map(slot=>{
      const it = eq[slot];
      const name = it ? `<span class="${it.rarityCls}">${it.name}</span>` : `<span class="muted">—</span>`;
      return `<div class="equipSlot">
        <div><b>${slot[0].toUpperCase()+slot.slice(1)}</b></div>
        <div>${name}</div>
      </div>`;
    }).join('');
  }

  function equipItem(id){
    const s=GameCore.state; if(!s) return;
    const it = (s.inv||[]).find(x=>x.id===id);
    if(!it) return;
    s.equip = s.equip || {};
    s.equip[it.slot] = it;
    GameCore.log(`🛡️ Équipé: ${it.name}`);
    GameCore.save();
    renderEquipment(); renderInventoryList();
  }
  function dropItem(id){
    const s=GameCore.state; if(!s) return;
    const i = (s.inv||[]).findIndex(x=>x.id===id);
    if(i>=0){
      const [it] = s.inv.splice(i,1);
      GameCore.log(`🗑️ Jeté: ${it.name}`);
      GameCore.save();
      renderEquipment(); renderInventoryList();
    }
  }

  function rollDrop(z){
    if(!shouldDrop(z)) return;
    const it = genItem(z);
    addToInventory(it);
    equipBestAuto(it); // qualité de vie: auto-équip si mieux
  }

  // Expose
  return {
    rollDrop,
    renderInventoryList,
    renderEquipment,
    equipItem,
    dropItem,
  };
})();
