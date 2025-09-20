/* ================================
   Idle ARPG v6.0 FR - loot.js
   Gestion du loot, inventaire, équipement
   ================================ */

const Loot = {
  slots: ["head","amulet","weapon","chest","shield","ring"],
  maxInv: 40,

  // Chances de loot (en %)
  lootChances: [
    {type:"commun", chance:70},
    {type:"rare", chance:20},
    {type:"unique", chance:8},
    {type:"set", chance:2}
  ],

  // Génération loot
  generateLoot(){
    if(Math.random()<0.4){ // 40% de chance qu’un loot tombe
      const roll=Math.random()*100;
      let rarity="commun";
      let acc=0;
      for(const r of this.lootChances){
        acc+=r.chance;
        if(roll<=acc){ rarity=r.type; break; }
      }
      const item={
        name:`${rarity} ${["Épée","Heaume","Anneau","Bouclier","Amulette","Armure"][Math.floor(Math.random()*6)]}`,
        slot:this.slots[Math.floor(Math.random()*this.slots.length)],
        rarity,
        atk: Math.floor(Math.random()*5),
        def: Math.floor(Math.random()*5),
        crit: rarity==="rare"?5:rarity==="unique"?10:rarity==="set"?15:0,
        mf: rarity==="rare"?3:rarity==="unique"?7:rarity==="set"?10:0
      };
      GameCore.state.inventory.push(item);
      GameCore.log(`💎 Vous trouvez un objet : ${item.name} (${item.rarity})`);
      GameCore.save();
    }
  },

  // Rendu inventaire
  renderInventory(){
    const grid=document.getElementById("inventoryGrid");
    if(!grid) return;
    grid.innerHTML="";
    GameCore.state.inventory.forEach((it,idx)=>{
      const div=document.createElement("div");
      div.className="item "+it.rarity;
      div.textContent=it.name[0];
      div.title=`${it.name}\nATQ+${it.atk} DEF+${it.def} Crit+${it.crit}% MF+${it.mf}%`;
      div.onclick=(e)=>this.openMenu(e,it,idx);
      grid.appendChild(div);
    });
    this.renderEquip();
    document.getElementById("charStats").innerHTML=`ATQ ${this.totalAttack()} DEF ${this.totalDefense()} Crit ${this.totalCrit()}% MF ${this.totalMF()}%`;
    document.getElementById("logBox").innerHTML=GameCore.logsHTML();
  },

  // Rendu équipement
  renderEquip(){
    this.slots.forEach(s=>{
      const span=document.getElementById("slot"+s.charAt(0).toUpperCase()+s.slice(1));
      if(!span) return;
      const eq=GameCore.state.equipment[s];
      span.textContent=eq? eq.name[0]:"—";
      span.title=eq? `${eq.name}\nATQ+${eq.atk} DEF+${eq.def} Crit+${eq.crit}% MF+${eq.mf}%`:"";
    });
  },

  // Menu contextuel
  openMenu(e,it,idx){
    e.preventDefault();
    const menu=document.getElementById("ctxMenu");
    menu.innerHTML="";
    const eqBtn=document.createElement("button");
    eqBtn.textContent="Équiper";
    eqBtn.onclick=()=>{ this.equip(idx); menu.hidden=true; this.renderInventory(); };
    menu.appendChild(eqBtn);

    const sellBtn=document.createElement("button");
    sellBtn.textContent="Vendre (+"+ (it.rarity==="commun"?5:it.rarity==="rare"?20:it.rarity==="unique"?50:100) +" or)";
    sellBtn.onclick=()=>{ this.sell(idx); menu.hidden=true; this.renderInventory(); };
    menu.appendChild(sellBtn);

    const dropBtn=document.createElement("button");
    dropBtn.textContent="Jeter";
    dropBtn.onclick=()=>{ GameCore.state.inventory.splice(idx,1); GameCore.save(); menu.hidden=true; this.renderInventory(); };
    menu.appendChild(dropBtn);

    menu.style.left=e.pageX+"px";
    menu.style.top=e.pageY+"px";
    menu.hidden=false;
  },

  equip(idx){
    const it=GameCore.state.inventory[idx];
    if(!it) return;
    GameCore.state.equipment[it.slot]=it;
    GameCore.state.inventory.splice(idx,1);
    GameCore.log(`🔧 ${it.name} équipé sur ${it.slot}`);
    GameCore.save();
  },

  sell(idx){
    const it=GameCore.state.inventory[idx];
    if(!it) return;
    const price=it.rarity==="commun"?5:it.rarity==="rare"?20:it.rarity==="unique"?50:100;
    GameCore.state.gold+=price;
    GameCore.state.inventory.splice(idx,1);
    GameCore.log(`💰 Vous vendez ${it.name} pour ${price} or`);
    GameCore.save();
  },

  // Totaux
  totalAttack(){
    return this.sumEq("atk")+GameCore.state.str;
  },
  totalDefense(){
    return this.sumEq("def")+GameCore.state.dex;
  },
  totalCrit(){
    return this.sumEq("crit");
  },
  totalMF(){
    return this.sumEq("mf");
  },
  sumEq(stat){
    let v=0;
    for(const s of this.slots){
      const it=GameCore.state.equipment[s];
      if(it) v+=it[stat];
    }
    return v;
  }
};

/* === Hook combat: drop après victoire === */
const oldVictory=Combat.victory.bind(Combat);
Combat.victory=function(){
  oldVictory();
  Loot.generateLoot();
  if(document.getElementById("inventoryGrid")) Loot.renderInventory();
};
