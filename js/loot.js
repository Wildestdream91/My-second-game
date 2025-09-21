/* loot.js — génération d’objets + UI inventaire/équipement */

const Loot = (() => {
  // Rareté & couleurs
  const RARITIES = [
    { key:"normal",  label:"Normal",  colorClass:"r-normal",  w:60, mfScale:0 },
    { key:"magique", label:"Magique", colorClass:"r-magique", w:28, mfScale:1 },
    { key:"rare",    label:"Rare",    colorClass:"r-rare",    w:9,  mfScale:1.2 },
    { key:"set",     label:"Set",     colorClass:"r-set",     w:2,  mfScale:1.4 },
    { key:"unique",  label:"Unique",  colorClass:"r-unique",  w:1,  mfScale:1.6 },
  ];

  const SLOTS = ["weapon","shield","head","amulet","ring","chest","charm"];

  function chooseRarity(mfBonus){
    // pondération + impact MF
    let pool=[]; for(const r of RARITIES){
      const mult = r.mfScale? 1 + (mfBonus/100)*(r.mfScale*0.75) : 1;
      const weight = Math.max(0.1, r.w / mult);
      pool.push({r, weight});
    }
    let total=pool.reduce((a,b)=>a+b.weight,0);
    let roll=Math.random()*total;
    for(const p of pool){ if(roll<p.weight) return p.r; roll-=p.weight; }
    return RARITIES[0];
  }

  function baseStatsForSlot(slot, ilvl, rarity){
    // Stats minimes mais cohérentes
    const scale = 1 + ilvl/10;
    const bump = rarity.key==="magique"?1.2 : rarity.key==="rare"?1.5 : rarity.key==="set"?1.6 : rarity.key==="unique"?1.8 : 1;
    const rnd=(a,b)=>Math.floor(a+Math.random()*(b-a+1));
    let st={ atk:0, def:0, crit:0, mf:0, str:0, dex:0, vit:0, ene:0 };
    if(slot==="weapon"){
      st.atk = rnd(1,3)*Math.floor(scale*bump);
      st.crit = rnd(0,2);
    }else if(slot==="shield" || slot==="chest" || slot==="head"){
      st.def = rnd(1,3)*Math.floor(scale*bump);
    }else if(slot==="amulet" || slot==="ring"){
      st.crit = rnd(0,3);
      st.mf = rnd(0,10);
    }else if(slot==="charm"){
      st.mf = rnd(2,8);
    }
    // Petits bonus de caracs selon rareté
    if(rarity.key!=="normal"){
      st.str += rnd(0,2);
      st.dex += rnd(0,2);
      st.vit += rnd(0,2);
      st.ene += rnd(0,2);
    }
    return st;
  }

  function makeItem(zone, playerLevel){
    const cfg = GameCore.getConfig();
    const diffScal = Zones.getDifficultyScalars(GameCore.getDifficulty());
    const mfTotal = (GameCore.mfTotal?.()||0) + (diffScal.reward?.mfBonus||0) + (cfg.mfRate||0);
    const rarity = chooseRarity(mfTotal);

    const slot = SLOTS[Math.floor(Math.random()*SLOTS.length)];
    const ilvl = Math.max(1, Math.floor((zone?.zl||1) * (1 + (["Cauchemar","Enfer"].includes(GameCore.getDifficulty())? 0.5:0))));
    const reqLvl = Math.max(1, Math.min(99, Math.floor(ilvl * 0.8)));

    const stats = baseStatsForSlot(slot, ilvl, rarity);
    const id = `it_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const name = `${rarity.label} ${slot}`;
    return { id, name, slot, rarity:rarity.key, ilvl, reqLvl, ...stats };
  }

  function rarityClass(r){ const rr=RARITIES.find(x=>x.key===r); return rr?rr.colorClass:"r-normal"; }

  // ---- Rendu équipement + inventaire ----
  function renderEquipment(){
    const s=GameCore.state;
    const el = document.getElementById("equipList"); if(!el) return;
    const slots = ["weapon","shield","head","chest","amulet","ring","charm"];
    el.innerHTML = slots.map(slot=>{
      const it = s.equipment[slot];
      if(!it){
        return `<div class="equipSlot"><b>${slot.toUpperCase()}</b><div class="muted small">— vide —</div></div>`;
      }
      return `<div class="equipSlot">
        <div class="item">
          <div class="nm ${rarityClass(it.rarity)}">${it.name}
            <span class="badge">ilvl ${it.ilvl}</span>
          </div>
          <div class="muted small">Req: niv ${it.reqLvl}</div>
          <div class="small">
            ${it.atk?`ATQ +${it.atk} `:""}${it.def?`DEF +${it.def} `:""}${it.crit?`Crit +${it.crit}% `:""}${it.mf?`MF +${it.mf}% `:""}
            ${it.str?`FOR +${it.str} `:""}${it.dex?`DEX +${it.dex} `:""}${it.vit?`VIT +${it.vit} `:""}${it.ene?`ÉNE +${it.ene} `:""}
          </div>
          <div class="item-actions">
            <button class="btn" onclick="Loot.unequip('${slot}')">Retirer</button>
          </div>
        </div>
      </div>`;
    }).join("");
  }

  function renderInventory(){
    const s=GameCore.state;
    const el = document.getElementById("inventoryGrid"); if(!el) return renderEquipment();
    renderEquipment();
    if(!s.inventory.length){ el.innerHTML = `<div class="muted">Inventaire vide.</div>`; return; }
    el.innerHTML = s.inventory.map(it=>{
      return `<div class="item">
        <div class="nm ${rarityClass(it.rarity)}">${it.name}
          <span class="badge">ilvl ${it.ilvl}</span>
        </div>
        <div class="muted small">Slot: ${it.slot} • Req niv ${it.reqLvl}</div>
        <div class="small">
          ${it.atk?`ATQ +${it.atk} `:""}${it.def?`DEF +${it.def} `:""}${it.crit?`Crit +${it.crit}% `:""}${it.mf?`MF +${it.mf}% `:""}
          ${it.str?`FOR +${it.str} `:""}${it.dex?`DEX +${it.dex} `:""}${it.vit?`VIT +${it.vit} `:""}${it.ene?`ÉNE +${it.ene} `:""}
        </div>
        <div class="item-actions">
          <button class="btn" onclick="Loot.tryEquip('${it.id}')">Équiper</button>
          <button class="btn danger" onclick="Loot.sell('${it.id}')">Vendre</button>
        </div>
      </div>`;
    }).join("");
  }

  function tryEquip(id){
    const s=GameCore.state;
    const it=s.inventory.find(x=>x.id===id); if(!it) return;
    if(s.level < it.reqLvl){ alert(`Niveau requis ${it.reqLvl}`); return; }
    const prev = s.equipment[it.slot];
    // équiper
    s.equipment[it.slot] = it;
    // retirer de l'inventaire
    s.inventory = s.inventory.filter(x=>x.id!==id);
    // l'ancien (si existait) va en inventaire
    if(prev) s.inventory.push(prev);
    GameCore.log(`Équipé: ${it.name}`);
    GameCore.recalcVitals(false);
    GameCore.save();
    renderInventory();
  }

  function unequip(slot){
    const s=GameCore.state;
    const it = s.equipment[slot]; if(!it) return;
    s.inventory.push(it);
    s.equipment[slot]=null;
    GameCore.log(`Retiré: ${it.name}`);
    GameCore.recalcVitals(false);
    GameCore.save();
    renderInventory();
  }

  function sell(id){
    const s=GameCore.state;
    const it=s.inventory.find(x=>x.id===id); if(!it) return;
    const price = Math.max(1, Math.floor((it.ilvl || 1) * (["unique","set"].includes(it.rarity)? 6 : it.rarity==="rare"?4 : it.rarity==="magique"?3 : 2)));
    s.gold += price;
    s.inventory = s.inventory.filter(x=>x.id!==id);
    GameCore.log(`Vendu ${it.name} (+${price} or)`);
    GameCore.save();
    renderInventory();
  }

  // ---- Drop (appelé par combat) ----
  function rollDrop(zone){
    // Table de chance de drop  — base par combat : ~35% en Normal
    const cfg=GameCore.getConfig();
    const diff=Zones.getDifficultyScalars(GameCore.getDifficulty());
    const baseP = 0.35 * (diff.reward.drop||1) * ((cfg.dropRate||100)/100);
    const p = Math.min(0.95, baseP);
    if(Math.random()<=p){
      const it = makeItem(zone, GameCore.state.level);
      GameCore.state.inventory.push(it);
      GameCore.log(`Objet trouvé : ${it.name} (ilvl ${it.ilvl})`);
      GameCore.save();
      return it;
    }
    return null;
  }

  return { renderInventory, tryEquip, unequip, sell, rollDrop };
})();
