/* ==========================================
   Idle ARPG v7.3 FR - loot.js
   Inventaire en liste + équipement clair
   ========================================== */

const Loot={
  slots:["head","amulet","weapon","chest","shield","ring"],
  maxInv:40,

  /* ---- Affichage équipement en liste ---- */
  renderEquipBoard(){
    const list=document.getElementById("equipList");
    if(!list) return;
    list.innerHTML="";
    for(const s of this.slots){
      const it=GameCore.state.equipment[s];
      const div=document.createElement("div");
      if(it){
        div.textContent=`${s.toUpperCase()} : ${it.name} (ATQ+${it.atk} DEF+${it.def} Crit+${it.crit}% MF+${it.mf}%)`;
        div.onclick=()=>{this.unequip(s);this.renderEquipBoard();};
      } else {
        div.textContent=`${s.toUpperCase()} : —`;
      }
      list.appendChild(div);
    }
  },

  renderInventory(){
    const grid=document.getElementById("inventoryGrid");
    if(!grid) return;
    grid.innerHTML="";
    (GameCore.state.inventory||[]).forEach((it,idx)=>{
      const div=document.createElement("div");
      div.textContent=`${it.name} [ATQ+${it.atk} DEF+${it.def} Crit+${it.crit}% MF+${it.mf}%]`;
      div.onclick=()=>{this.equip(idx);this.renderInventory();};
      grid.appendChild(div);
    });
    this.renderEquipBoard();
    GameCore.uiRefreshStatsIfPresent?.();
  },

  equip(idx){
    const it=GameCore.state.inventory[idx]; if(!it) return;
    const cur=GameCore.state.equipment[it.slot];
    if(cur) GameCore.state.inventory.push(cur);
    GameCore.state.equipment[it.slot]=it;
    GameCore.state.inventory.splice(idx,1);
    GameCore.log(`🔧 Équipé: ${it.name}`);
    GameCore.save();
  },
  unequip(slot){
    const it=GameCore.state.equipment[slot]; if(!it) return;
    if(GameCore.state.inventory.length>=this.maxInv){GameCore.log("Inventaire plein");return;}
    GameCore.state.inventory.push(it);
    GameCore.state.equipment[slot]=null;
    GameCore.log(`🗃️ Retiré: ${it.name}`);
    GameCore.save();
  }
};
