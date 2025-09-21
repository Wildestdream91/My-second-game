/* ==========================================
   Idle ARPG v7.7 FR - loot.js
   - Couleurs de rareté
   - iLevel (ilvl) par item
   - Niveau requis auto en fonction de l’ilvl + rareté
   - Bouton "Équiper" désactivé si niveau insuffisant
   ========================================== */
const Loot={
  slots:["head","amulet","weapon","chest","shield","ring"],
  maxInv:40,

  rarities:[
    {key:"commun", base:60},
    {key:"magique",base:30},
    {key:"rare",   base:8},
    {key:"unique", base:2},
    {key:"set",    base:0.5}
  ],
  rarityClass(key){
    return key==="commun" ? "r-commun"
         : key==="magique"? "r-magique"
         : key==="rare"   ? "r-rare"
         : key==="unique" ? "r-unique"
         : key==="set"    ? "r-set"
         : "";
  },
  namesBySlot:{
    head:["Heaume","Capuche","Couronne"],
    amulet:["Amulette","Talisman","Glyphe"],
    weapon:["Épée","Masse","Hache","Baguette","Dague"],
    chest:["Armure","Plastron","Robe","Cotte"],
    shield:["Bouclier","Tour","Pavois"],
    ring:["Anneau","Sceau","Bague"]
  },
  bonusByRarity:{
    commun:{atk:[0,2],def:[0,2],crit:[0,1],mf:[0,1],stats:[0,1]},
    magique:{atk:[1,4],def:[1,4],crit:[1,3],mf:[1,4],stats:[0,2]},
    rare:{atk:[3,7],def:[3,7],crit:[2,6],mf:[3,7],stats:[1,3]},
    unique:{atk:[6,12],def:[6,12],crit:[5,10],mf:[7,12],stats:[2,4]},
    set:{atk:[5,10],def:[5,10],crit:[4,9],mf:[8,14],stats:[2,4]}
  },
  sellPrice(r){ return r==="commun"?5 : r==="magique"?15 : r==="rare"?50 : r==="unique"?150 : 300; },

  randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a;},
  cap(s){return s.charAt(0).toUpperCase()+s.slice(1);},

  rollIlvl(ctx){
    const s = GameCore.state||{};
    let base = 1;
    if (ctx?.source==="shop")       base = s.level || 1;
    else if (ctx?.enemyLevel)       base = ctx.enemyLevel;
    else if (ctx?.act)              base = ctx.act*6 + 3;
    else                            base = s.level || 1;
    const variance = this.randInt(-2, +3);
    return Math.max(1, base + variance);
  },

  requiredLevel(ilvl, rarity){
    const base = Math.floor(ilvl * 0.8);
    const bonus =
      rarity==="commun"  ? 0 :
      rarity==="magique" ? 1 :
      rarity==="rare"    ? 3 :
      rarity==="unique"  ? 5 :
      rarity==="set"     ? 4 : 0;
    return Math.min(99, Math.max(1, base + bonus));
  },

  rollRarity(mf=0,ctx={boss:false}){
    const W=this.rarities.map(x=>({...x}));
    const mfF=Math.min(300,mf);
    const bR=1+mfF*0.004, bU=1+mfF*0.006, bS=1+mfF*0.008;
    for(const w of W){
      if(w.key==="rare")   w.base*=bR;
      if(w.key==="unique") w.base*=bU;
      if(w.key==="set")    w.base*=bS;
    }
    if(ctx?.boss){
      for(const w of W){ if(w.key==="unique") w.base*=2; if(w.key==="set") w.base*=2.5; }
    }
    const sum=W.reduce((a,b)=>a+b.base,0); let r=Math.random()*sum;
    for(const w of W){ if(r<w.base) return w.key; r-=w.base; }
    return "commun";
  },

  generateLoot(mf=0, ctx={boss:false, act:1, enemyLevel:1}){
    const baseDrop = ctx.boss ? 1.0 : 0.25;
    if(Math.random()>baseDrop) return null;

    const rarity = this.rollRarity(mf, ctx);
    const slot   = this.slots[Math.floor(Math.random()*this.slots.length)];
    const baseN  = (this.namesBySlot[slot]||["Objet"])[Math.floor(Math.random()*(this.namesBySlot[slot]||["Objet"]).length)];
    const b      = this.bonusByRarity[rarity]||this.bonusByRarity.commun;

    const ilvl   = this.rollIlvl(ctx);
    const req    = this.requiredLevel(ilvl, rarity);

    const it={
      id:"it_"+Date.now()+"_"+Math.floor(Math.random()*1e6),
      name:`${baseN} ${this.cap(rarity)}`,
      slot, rarity, ilvl, reqLvl:req,
      atk:this.randInt(b.atk[0],b.atk[1]),
      def:this.randInt(b.def[0],b.def[1]),
      crit:this.randInt(b.crit[0],b.crit[1]),
      mf:this.randInt(b.mf[0],b.mf[1]),
      str:0,dex:0,vit:0,ene:0
    };

    const extras=this.randInt(b.stats[0],b.stats[1]);
    for(let i=0;i<extras;i++){
      const k=["str","dex","vit","ene"][Math.floor(Math.random()*4)];
      it[k]+=1;
    }

    GameCore.state.inventory ||= [];
    if(GameCore.state.inventory.length>=this.maxInv){ GameCore.log("Inventaire plein. Objet perdu."); return null; }
    GameCore.state.inventory.push(it);
    GameCore.log(`💎 Vous trouvez: ${it.name} (ilvl ${it.ilvl}, Req Nv ${it.reqLvl}).`);
    GameCore.save();
    this.renderInventory();
    return it;
  },

  renderEquipBoard(){/* ... contenu complet comme avant ... */},
  renderInventory(){/* ... contenu complet comme avant ... */},
  equip(idx){/* ... contenu complet comme avant ... */},
  unequip(slot){/* ... contenu complet comme avant ... */},
  sell(idx){/* ... contenu complet comme avant ... */}
};