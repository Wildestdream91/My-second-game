/* ==========================================
   Idle ARPG v7.3 FR - loot.js
   ========================================== */
const Loot={
  slots:["head","amulet","weapon","chest","shield","ring"],
  maxInv:40,

  // Simple générateur (appelé depuis combat via hook optionnel)
  rarities:[
    {key:"commun",base:60},{key:"magique",base:30},{key:"rare",base:8},{key:"unique",base:2},{key:"set",base:0.5}
  ],
  namesBySlot:{
    head:["Heaume","Capuche","Couronne"], amulet:["Amulette","Talisman","Glyphe"],
    weapon:["Épée","Masse","Hache","Baguette","Dague"], chest:["Armure","Plastron","Robe","Cotte"],
    shield:["Bouclier","Tour","Pavois"], ring:["Anneau","Sceau","Bague"]
  },
  bonusByRarity:{
    commun:{atk:[0,2],def:[0,2],crit:[0,1],mf:[0,1],stats:[0,1]},
    magique:{atk:[1,4],def:[1,4],crit:[1,3],mf:[1,4],stats:[0,2]},
    rare:{atk:[3,7],def:[3,7],crit:[2,6],mf:[3,7],stats:[1,3]},
    unique:{atk:[6,12],def:[6,12],crit:[5,10],mf:[7,12],stats:[2,4]},
    set:{atk:[5,10],def:[5,10],crit:[4,9],mf:[8,14],stats:[2,4]}
  },
  sellPrice(r){return r==="commun"?5:r==="magique"?15:r==="rare"?50:r==="unique"?150:300;},
  randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a;}, cap(s){return s.charAt(0).toUpperCase()+s.slice(1);},

  rollRarity(mf=0,ctx={boss:false}){const W=this.rarities.map(x=>({...x}));
    const mfF=Math.min(300,mf); const bR=1+mfF*0.004, bU=1+mfF*0.006, bS=1+mfF*0.008;
    for(const w of W){if(w.key==="rare")w.base*=bR; if(w.key==="unique")w.base*=bU; if(w.key==="set")w.base*=bS;}
    if(ctx.boss){for(const w of W){if(w.key==="unique")w.base*=2; if(w.key==="set")w.base*=2.5;}}
    const sum=W.reduce((a,b)=>a+b.base,0); let r=Math.random()*sum;
    for(const w of W){ if(r<w.base) return w.key; r-=w.base; } return "commun";
  },

  generateLoot(mf=0, ctx={boss:false}){
    const baseDrop=ctx.boss?1.0:0.25; if(Math.random()>baseDrop) return null;
    const rarity=this.rollRarity(mf,ctx);
    const slot=this.slots[Math.floor(Math.random()*this.slots.length)];
    const base=(this.namesBySlot[slot]||["Objet"])[Math.floor(Math.random()*(this.namesBySlot[slot]||["Objet"]).length)];
    const b=this.bonusByRarity[rarity]||this.bonusByRarity.commun;
    const it={id:"it_"+Date.now()+"_"+Math.floor(Math.random()*1e6), name:`${base} ${this.cap(rarity)}`, slot, rarity,
      atk:this.randInt(b.atk[0],b.atk[1]), def:this.randInt(b.def[0],b.def[1]), crit:this.randInt(b.crit[0],b.crit[1]),
      mf:this.randInt(b.mf[0],b.mf[1]), str:0,dex:0,vit:0,ene:0};
    const extras=this.randInt(b.stats[0],b.stats[1]);
    for(let i=0;i<extras;i++){ const k=["str","dex","vit","ene"][Math.floor(Math.random()*4)]; it[k]+=1; }

    GameCore.state.inventory ||= []; 
    if(GameCore.state.inventory.length>=this.maxInv){ GameCore.log("Inventaire plein. Objet perdu."); return null; }
    GameCore.state.inventory.push(it); GameCore.log(`💎 Vous trouvez: ${it.name} (${rarity}).`); GameCore.save(); this.renderInventory(); return it;
  },

  // ===== Affichage en LISTE =====
  renderEquipBoard(){
    const list=document.getElementById("equipList"); if(!list) return; list.innerHTML="";
    for(const s of this.slots){
      const it=GameCore.state.equipment?.[s]||null;
      const row=document.createElement("div");
      if(it){
        row.innerHTML=`<b>${s.toUpperCase()}</b> — ${it.name} 
          <span class="muted">[ATQ+${it.atk} DEF+${it.def} Crit+${it.crit}% MF+${it.mf}% | FOR+${it.str} DEX+${it.dex} VIT+${it.vit} ÉNE+${it.ene}]</span>
          <button class="btn" style="float:right">Retirer</button>`;
        row.querySelector("button").onclick=()=>{this.unequip(s); this.renderInventory();};
      } else {
        row.innerHTML=`<b>${s.toUpperCase()}</b> — <span class="muted">—</span>`;
      }
      list.appendChild(row);
    }
  },

  renderInventory(){
    const grid=document.getElementById("inventoryGrid"); if(!grid) return; grid.innerHTML="";
    (GameCore.state.inventory||[]).forEach((it,idx)=>{
      const row=document.createElement("div");
      row.innerHTML=`<span>${it.name}</span>
        <span class="muted">[${it.slot} | ATQ+${it.atk} DEF+${it.def} Crit+${it.crit}% MF+${it.mf}% | FOR+${it.str} DEX+${it.dex} VIT+${it.vit} ÉNE+${it.ene}]</span>
        <span style="float:right;display:flex;gap:6px">
          <button class="btn">Équiper</button>
          <button class="btn">Vendre</button>
          <button class="btn">Jeter</button>
        </span>`;
      const [bEquip,bSell,bDrop]=row.querySelectorAll("button");
      bEquip.onclick=()=>{this.equip(idx); this.renderInventory();};
      bSell.onclick =()=>{this.sell(idx);  this.renderInventory();};
      bDrop.onclick =()=>{GameCore.state.inventory.splice(idx,1); GameCore.save(); this.renderInventory();};
      grid.appendChild(row);
    });
    this.renderEquipBoard();
    GameCore.recalcVitals(false); GameCore.uiRefreshStatsIfPresent?.();
    const st=document.getElementById("charStats"); if(st) st.innerHTML=
      `ATQ ${GameCore.atkTotal()} • DEF ${GameCore.defTotal()} • Crit ${GameCore.critTotal()}% • MF ${GameCore.mfTotal()}%`;
    const log=document.getElementById("logBox"); if(log) log.innerHTML=GameCore.logsHTML();
  },

  equip(idx){
    const it=GameCore.state.inventory?.[idx]; if(!it) return;
    GameCore.state.equipment ||= {head:null,amulet:null,weapon:null,chest:null,shield:null,ring:null};
    if(!(it.slot in GameCore.state.equipment)) GameCore.state.equipment[it.slot]=null;
    const cur=GameCore.state.equipment[it.slot];
    if(cur){ if(GameCore.state.inventory.length>=this.maxInv){GameCore.log("Inventaire plein."); return;}
      GameCore.state.inventory.push(cur);
    }
    GameCore.state.equipment[it.slot]=it; GameCore.state.inventory.splice(idx,1);
    GameCore.log(`🔧 Équipé: ${it.name}`); GameCore.save(); GameCore.recalcVitals(false);
  },

  unequip(slot){
    const it=GameCore.state.equipment?.[slot]; if(!it) return;
    if((GameCore.state.inventory||[]).length>=this.maxInv){GameCore.log("Inventaire plein."); return;}
    GameCore.state.inventory.push(it); GameCore.state.equipment[slot]=null;
    GameCore.log(`🗃️ Retiré: ${it.name}`); GameCore.save(); GameCore.recalcVitals(false);
  },

  sell(idx){
    const it=GameCore.state.inventory?.[idx]; if(!it) return;
    const price=this.sellPrice(it.rarity); GameCore.state.gold+=price;
    GameCore.state.inventory.splice(idx,1); GameCore.log(`💰 Vendu: ${it.name} pour ${price} or.`); GameCore.save();
  }
};
