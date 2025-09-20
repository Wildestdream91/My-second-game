/* ==========================================
   Idle ARPG v7.1 FR - loot.js
   Loot, rareté, MF, inventaire, équipement
   (tap court = équiper, appui long = menu)
   ========================================== */

const Loot = {
  slots: ["head","amulet","weapon","chest","shield","ring"],
  maxInv: 40,

  rarities: [
    {key:"commun",  label:"Commun",  base:60, color:"#bbb"},
    {key:"magique", label:"Magique", base:30, color:"#6fa8dc"},
    {key:"rare",    label:"Rare",    base:8,  color:"#ffd966"},
    {key:"unique",  label:"Unique",  base:2,  color:"#f39c12"},
    {key:"set",     label:"Set",     base:0.5,color:"#2ecc71"}
  ],
  namesBySlot: {
    head:   ["Heaume","Capuche","Couronne"],
    amulet: ["Amulette","Talisman","Glyphe"],
    weapon: ["Épée","Masse","Hache","Baguette","Dague"],
    chest:  ["Armure","Plastron","Robe","Cotte"],
    shield: ["Bouclier","Tour","Pavois"],
    ring:   ["Anneau","Sceau","Bague"]
  },
  bonusByRarity: {
    commun:  { atk:[0,2],  def:[0,2],  crit:[0,1],  mf:[0,1],  stats:[0,1] },
    magique: { atk:[1,4],  def:[1,4],  crit:[1,3],  mf:[1,4],  stats:[0,2] },
    rare:    { atk:[3,7],  def:[3,7],  crit:[2,6],  mf:[3,7],  stats:[1,3] },
    unique:  { atk:[6,12], def:[6,12], crit:[5,10], mf:[7,12], stats:[2,4] },
    set:     { atk:[5,10], def:[5,10], crit:[4,9],  mf:[8,14], stats:[2,4] }
  },
  sellPrice(r){ return r==="commun"?5:r==="magique"?15:r==="rare"?50:r==="unique"?150:300; },

  // 🎲 Génère un loot après combat
  generateLoot(mf=0, context={act:1,boss:false}) {
    const baseDrop = context.boss ? 1.0 : 0.25;
    if (Math.random() > baseDrop) return null;

    const rarity = this.rollRarity(mf, context);
    const slot = this.slots[Math.floor(Math.random()*this.slots.length)];
    const baseName = (this.namesBySlot[slot]||["Objet"])[Math.floor(Math.random()*this.namesBySlot[slot].length)];
    const b = this.bonusByRarity[rarity] || this.bonusByRarity["commun"];
    const [aMin,aMax] = b.atk;   const atk = this.randInt(aMin,aMax);
    const [dMin,dMax] = b.def;   const def = this.randInt(dMin,dMax);
    const [cMin,cMax] = b.crit;  const crit = this.randInt(cMin,cMax);
    const [mMin,mMax] = b.mf;    const mfBonus = this.randInt(mMin,mMax);
    const [sMin,sMax] = b.stats; const extraStats = this.randInt(sMin,sMax);

    const item = {
      id: "it_"+Date.now()+"_"+Math.floor(Math.random()*1e6),
      name: `${baseName} ${this.cap(rarity)}`, slot, rarity,
      atk, def, crit, mf: mfBonus,
      str:0, dex:0, vit:0, ene:0
    };
    for(let i=0;i<extraStats;i++){
      const stat = ["str","dex","vit","ene"][Math.floor(Math.random()*4)];
      item[stat] += 1;
    }

    if (GameCore.state.inventory.length >= this.maxInv) {
      GameCore.log("Inventaire plein. L’objet a été perdu.");
      return null;
    }
    GameCore.state.inventory.push(item);
    GameCore.log(`💎 Vous trouvez: ${item.name} (${rarity}).`);
    GameCore.save();
    this.renderInventory();
    return item;
  },

  // 🔮 Détermine la rareté en fonction du MF
  rollRarity(mf=0, context={act:1,boss:false}){
    const weights = this.rarities.map(r => ({...r}));
    const mfFactor = Math.min(300, mf);
    const bonusRare   = 1 + mfFactor*0.004;
    const bonusUnique = 1 + mfFactor*0.006;
    const bonusSet    = 1 + mfFactor*0.008;
    for (const w of weights) {
      if (w.key==="rare")   w.base *= bonusRare;
      if (w.key==="unique") w.base *= bonusUnique;
      if (w.key==="set")    w.base *= bonusSet;
    }
    if (context.boss) {
      for (const w of weights) {
        if (w.key==="unique") w.base *= 2.0;
        if (w.key==="set")    w.base *= 2.5;
      }
    }
    const sum = weights.reduce((a,b)=>a+b.base,0);
    let roll = Math.random()*sum;
    for (const w of weights) {
      if (roll < w.base) return w.key;
      roll -= w.base;
    }
    return "commun";
  },

  tooltip(it){
    const lines = [
      `${it.name} [${this.cap(it.rarity)}]`,
      `Slot: ${it.slot}`,
      `ATQ +${it.atk}  DEF +${it.def}  Crit +${it.crit}%  MF +${it.mf}%`,
    ];
    if (it.str||it.dex||it.vit||it.ene){
      lines.push(`FOR +${it.str}  DEX +${it.dex}  VIT +${it.vit}  ÉNE +${it.ene}`);
    }
    return lines.join("\n");
  },

  // 🧩 Rafraîchit l’équipement
  renderEquipBoard(){
    const id = (slot)=>document.getElementById("slot"+slot.charAt(0).toUpperCase()+slot.slice(1));
    for(const s of this.slots){
      const cell = id(s);
      if(!cell) continue;
      const it = GameCore.state.equipment?.[s] || null;
      if (it){
        cell.textContent = it.name[0];
        cell.title = this.tooltip(it)+"\n(Tap pour enlever)";
        cell.onclick = ()=>this.unequip(s);
      } else {
        cell.textContent = "—";
        cell.title = s;
        cell.onclick = null;
      }
    }
  },

  // 👜 Affiche l’inventaire
  renderInventory(){
    const grid = document.getElementById("inventoryGrid");
    if (grid) {
      grid.innerHTML = "";
      GameCore.state.inventory.forEach((it,idx)=>{
        const div = document.createElement("div");
        div.className = "item "+it.rarity;
        div.textContent = it.name[0];
        div.title = this.tooltip(it);

        // gestion tap / long-press
        let pressTimer = null; let long = false;

        const openMenu = (ev)=> this.openMenu(ev, it, idx);
        const quickEquip = ()=>{ this.equip(idx); this.renderInventory(); };

        div.addEventListener("touchstart", (e)=>{
          long = false;
          pressTimer = setTimeout(()=>{
            long = true;
            openMenu(e.changedTouches ? e.changedTouches[0] : e);
          }, 500);
        }, {passive:true});

        div.addEventListener("touchend", (e)=>{
          if (pressTimer){ clearTimeout(pressTimer); pressTimer=null; }
          if (!long) quickEquip();
        });

        // Souris / desktop
        div.addEventListener("click", quickEquip);
        div.addEventListener("contextmenu", (e)=>{
          e.preventDefault();
          openMenu(e);
        });

        grid.appendChild(div);
      });
    }

    this.renderEquipBoard();
    GameCore.uiRefreshStatsIfPresent?.();
    const st = document.getElementById("charStats");
    if (st) st.innerHTML = `ATQ ${GameCore.atkTotal()} • DEF ${GameCore.defTotal()} • Crit ${GameCore.critTotal()}% • MF ${GameCore.mfTotal()}%`;
    const log = document.getElementById("logBox");
    if (log) log.innerHTML = GameCore.logsHTML();
  },

  // 📜 Menu contextuel
  openMenu(ev,it,idx){
    const menu = document.getElementById("ctxMenu");
    if(!menu) return;
    menu.innerHTML = "";

    const b1 = document.createElement("button");
    b1.textContent = "Équiper";
    b1.onclick = ()=>{ this.equip(idx); menu.hidden=true; this.renderInventory(); };
    menu.appendChild(b1);

    const b2 = document.createElement("button");
    b2.textContent = `Vendre (+${this.sellPrice(it.rarity)} or)`;
    b2.onclick = ()=>{ this.sell(idx); menu.hidden=true; this.renderInventory(); };
    menu.appendChild(b2);

    const b3 = document.createElement("button");
    b3.textContent = "Jeter";
    b3.onclick = ()=>{ GameCore.state.inventory.splice(idx,1); GameCore.save(); menu.hidden=true; this.renderInventory(); };
    menu.appendChild(b3);

    const x = ev.pageX || ev.clientX || 20;
    const y = ev.pageY || ev.clientY || 20;
    menu.style.left = x + "px";
    menu.style.top  = y + "px";
    menu.hidden = false;
  },

  // ⚔️ Équiper un objet
  equip(idx){
    const it = GameCore.state.inventory[idx];
    if(!it) return;

    if (!GameCore.state.equipment) GameCore.state.equipment = { head:null, amulet:null, weapon:null, chest:null, shield:null, ring:null };
    if (!(it.slot in GameCore.state.equipment)) GameCore.state.equipment[it.slot] = null;

    const current = GameCore.state.equipment[it.slot];
    if (current) {
      if (GameCore.state.inventory.length >= this.maxInv) {
        GameCore.log("Inventaire plein. Impossible d’échanger l’objet.");
        return;
      }
      GameCore.state.str -= current.str||0;
      GameCore.state.dex -= current.dex||0;
      GameCore.state.vit -= current.vit||0;
      GameCore.state.ene -= current.ene||0;
      GameCore.recalcVitals();
      GameCore.state.inventory.push(current);
    }

    GameCore.state.equipment[it.slot] = it;
    GameCore.state.str += it.str||0;
    GameCore.state.dex += it.dex||0;
    GameCore.state.vit += it.vit||0;
    GameCore.state.ene += it.ene||0;
    GameCore.recalcVitals();

    GameCore.state.inventory.splice(idx,1);
    GameCore.log(`🔧 Équipé: ${it.name} sur ${it.slot}.`);
    GameCore.save();
  },

  // ⛔ Retirer un objet équipé
  unequip(slot){
    const it = GameCore.state.equipment?.[slot];
    if(!it) return;
    if (GameCore.state.inventory.length >= this.maxInv) {
      GameCore.log("Inventaire plein. Impossible d’enlever l’objet.");
      return;
    }
    GameCore.state.str -= it.str||0;
    GameCore.state.dex -= it.dex||0;
    GameCore.state.vit -= it.vit||0;
    GameCore.state.ene -= it.ene||0;
    GameCore.recalcVitals();

    GameCore.state.inventory.push(it);
    GameCore.state.equipment[slot] = null;
    GameCore.log(`🗃️ Retiré: ${it.name} (${slot}).`);
    GameCore.save();
    this.renderInventory();
  },

  // 💰 Vente
  sell(idx){
    const it = GameCore.state.inventory[idx];
    if(!it) return;
    const price = this.sellPrice(it.rarity);
    GameCore.state.gold += price;
    GameCore.state.inventory.splice(idx,1);
    GameCore.log(`💰 Vendu: ${it.name} pour ${price} or.`);
    GameCore.save();
  },

  cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); },
  randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
};

/* Hook loot après victoire si Combat.victory existant */
(function patchVictoryForLoot(){
  if (!window.Combat || !Combat.victory) return;
  const oldVictory = Combat.victory.bind(Combat);
  Combat.victory = function(){
    oldVictory();
    try {
      const context = { act:1, boss:false };
      const last = (GameCore.state.logs[0]||"");
      if (/\bAndariel|Duriel|Méphisto|Diablo|Baal\b/.test(last)) context.boss = true;
      const mf = GameCore.mfTotal ? GameCore.mfTotal() : 0;
      Loot.generateLoot(mf, context);
      Loot.renderInventory();
    } catch(e){ console.warn("Loot hook error:", e); }
  };
})();
