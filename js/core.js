/* ==========================================
   Idle ARPG v7.3 FR - core.js
   Gestion joueur, XP, stats, persistance
   ========================================== */

const GameCore = {
  state: {},

  newGame(name, cls) {
    const st = {};
    st.created = true;
    st.name = name || "Héros";
    st.cls = cls || "Aventurier";
    st.level = 1;
    st.xp = 0;
    st.gold = 0;

    // Stats de base
    st.str = 5; st.dex = 5; st.vit = 5; st.ene = 5;
    st.statPts = 5;

    // Inventaire & équipement
    st.inventory = [];
    st.equipment = { head:null, amulet:null, weapon:null, chest:null, shield:null, ring:null };

    st.hpMax = 1; st.hp = 1;
    st.manaMax = 1; st.mana = 1;

    st.bossesDefeated = {};
    st.zone = null;
    st.logs = [];
    st.difficulty = "Normal";

    this.state = st;
    this.recalcVitals(true);
    this.save();
  },

  save(){ localStorage.setItem("idleARPGsave", JSON.stringify(this.state)); },
  load(){
    try{
      const raw = localStorage.getItem("idleARPGsave");
      if(raw){
        this.state = JSON.parse(raw);
        const eq=this.state.equipment||{};
        for(const s of ["head","amulet","weapon","chest","shield","ring"]) if(!(s in eq)) eq[s]=null;
        this.state.equipment=eq;
        if(!this.state.difficulty) this.state.difficulty="Normal";
      } else this.state={created:false};
    }catch(e){ console.warn("Erreur load",e); this.state={created:false}; }
  },
  reset(force=false){
    if(force||confirm("Effacer la sauvegarde ?")){
      localStorage.removeItem("idleARPGsave"); location.reload();
    }
  },

  // XP
  xpTable:(()=>{const arr=[0];for(let i=1;i<=99;i++){arr[i]=Math.floor(Math.pow(i,2.2)*100);}return arr;})(),
  gainXP(a){
    this.state.xp+=Math.max(0,Math.floor(a||0));
    while(this.state.level<99 && this.state.xp>=this.xpTable[this.state.level]){
      this.state.xp-=this.xpTable[this.state.level];
      this.state.level++; this.state.statPts+=5;
      this.log(`🎉 Niveau ${this.state.level} atteint ! (+5 pts)`);
      this.recalcVitals(true);
    }
    this.save();
  },
  addXP(a){this.gainXP(a);},
  addGold(a){this.state.gold+=Math.max(0,Math.floor(a||0));this.save();},

  // Bonus équipement
  equipBonus(){
    const out={str:0,dex:0,vit:0,ene:0,atk:0,def:0,crit:0,mf:0};
    for(const k in this.state.equipment){
      const it=this.state.equipment[k]; if(!it) continue;
      for(const stat in out) out[stat]+=(it[stat]||0);
    }
    return out;
  },
  effStr(){return this.state.str+this.equipBonus().str;},
  effDex(){return this.state.dex+this.equipBonus().dex;},
  effVit(){return this.state.vit+this.equipBonus().vit;},
  effEne(){return this.state.ene+this.equipBonus().ene;},
  atkTotal(){return this.effStr()+this.state.level+this.equipBonus().atk;},
  defTotal(){return Math.floor(this.effDex())+Math.floor(this.state.level/2)+this.equipBonus().def;},
  critTotal(){return Math.floor(this.effDex()/2)+this.equipBonus().crit;},
  mfTotal(){return this.equipBonus().mf;},

  recalcVitals(full=false){
    const s=this.state;
    s.hpMax=50+this.effVit()*5;
    s.manaMax=20+this.effEne()*3;
    if(full){s.hp=s.hpMax; s.mana=s.manaMax;}
    else {if(s.hp>s.hpMax)s.hp=s.hpMax; if(s.mana>s.manaMax)s.mana=s.manaMax;}
    this.save();
  },

  spendStatPoint(stat){
    if(this.state.statPts<=0) return;
    if(!["str","dex","vit","ene"].includes(stat)) return;
    this.state[stat]++; this.state.statPts--;
    this.recalcVitals(false); this.save();
  },

  log(m){this.state.logs.unshift(m);if(this.state.logs.length>100)this.state.logs.pop();this.save();},
  logsHTML(){return this.state.logs.map(l=>"<div>"+l+"</div>").join("");},
  ensureGameOrRedirect(target){if(!this.state.created) location.href=target;},

  uiRefreshStatsIfPresent(){
    const s=this.state;
    const set=(id,txt)=>{const el=document.getElementById(id);if(el)el.textContent=txt;};
    const setW=(id,v)=>{const el=document.getElementById(id);if(el)el.style.width=v+"%";};
    set("pStr",this.effStr()); set("pDex",this.effDex()); set("pVit",this.effVit()); set("pEne",this.effEne());
    set("pAtk",this.atkTotal()); set("pDef",this.defTotal());
    set("pCrit",this.critTotal()); set("pMF",this.mfTotal()); set("pGold",s.gold);
    setW("barHpFill",s.hp/s.hpMax*100); set("barHpText",`HP ${s.hp}/${s.hpMax}`);
    setW("barManaFill",s.mana/s.manaMax*100); set("barManaText",`Mana ${s.mana}/${s.manaMax}`);
    setW("barXpFill",s.xp/(this.xpTable[s.level]||1)*100); set("barXpText",`XP ${s.xp}/${this.xpTable[s.level]}`);
  }
};

GameCore.load();
