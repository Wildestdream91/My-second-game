/* ==========================================
   Idle ARPG v7.2 FR - core.js
   Gestion joueur, XP, stats, persistance
   ========================================== */

const GameCore = {
  state: {},

  // 🔹 Création d’un nouveau perso
  newGame(name, cls) {
    const st = {};
    st.created = true;
    st.name = name;
    st.cls = cls;
    st.level = 1;
    st.xp = 0;
    st.gold = 0;

    // Attributs de base
    st.str = 5; st.dex = 5; st.vit = 5; st.ene = 5;
    st.statPts = 0;

    // Vitalité de départ
    st.hpMax = 50; st.hp = st.hpMax;
    st.manaMax = 20; st.mana = st.manaMax;

    // Inventaire & équipement
    st.inventory = [];
    st.equipment = { head:null, amulet:null, weapon:null, chest:null, shield:null, ring:null };

    st.bossesDefeated = {};
    st.zone = null;
    st.logs = [];

    this.state = st;
    this.save();
  },

  // 🔹 Sauvegarde / chargement
  save() {
    localStorage.setItem("idleARPGsave", JSON.stringify(this.state));
  },
  load() {
    try {
      const raw = localStorage.getItem("idleARPGsave");
      if (raw) {
        this.state = JSON.parse(raw);

        // Sécurité : s’assure que les slots existent
        const eq = this.state.equipment || {};
        for(const s of ["head","amulet","weapon","chest","shield","ring"]){
          if(!(s in eq)) eq[s] = null;
        }
        this.state.equipment = eq;
      } else {
        this.state = { created:false };
      }
    } catch(e){
      console.warn("Erreur de chargement:", e);
      this.state = { created:false };
    }
  },
  reset(force=false) {
    if(force || confirm("Effacer la sauvegarde ?")){
      localStorage.removeItem("idleARPGsave");
      location.reload();
    }
  },

  // 🔹 XP
  xpTable: (()=>{ 
    const arr=[0]; 
    for(let i=1;i<=99;i++){ 
      arr[i]=Math.floor(Math.pow(i,2.2)*100); 
    } 
    return arr; 
  })(),

  gainXP(amount){
    this.state.xp += amount;
    while(this.state.level<99 && this.state.xp>=this.xpTable[this.state.level]){
      this.state.level++;
      this.state.statPts+=5;
      this.log(`🎉 Niveau ${this.state.level} atteint !`);
      this.recalcVitals();
    }
    this.save();
  },

  // ✅ Compatibilité combat.js
  addXP(amount){ this.gainXP(amount); },
  addGold(amount){
    this.state.gold += Math.max(0, Math.floor(amount));
    this.save();
  },

  // 🔹 Recalcul PV / Mana après modifs stats/équipement
  recalcVitals(){
    const s=this.state;
    s.hpMax = 50 + s.vit*5;
    s.manaMax = 20 + s.ene*3;
    if(s.hp > s.hpMax) s.hp = s.hpMax;
    if(s.mana > s.manaMax) s.mana = s.manaMax;
    this.save();
  },

  // 🔹 Stats finales avec équipement
  atkTotal(){
    let b = this.state.str + this.state.level;
    for(const k in this.state.equipment){
      const it=this.state.equipment[k];
      if(it) b+=it.atk;
    }
    return b;
  },
  defTotal(){
    let b = this.state.dex + Math.floor(this.state.level/2);
    for(const k in this.state.equipment){
      const it=this.state.equipment[k];
      if(it) b+=it.def;
    }
    return b;
  },
  critTotal(){
    let b = Math.floor(this.state.dex/2);
    for(const k in this.state.equipment){
      const it=this.state.equipment[k];
      if(it) b+=it.crit;
    }
    return b;
  },
  mfTotal(){
    let b=0;
    for(const k in this.state.equipment){
      const it=this.state.equipment[k];
      if(it) b+=it.mf;
    }
    return b;
  },

  spendStatPoint(stat){
    if(this.state.statPts<=0) return;
    this.state[stat]++;
    this.state.statPts--;
    this.recalcVitals();
    this.save();
  },

  // 🔹 Logs
  log(msg){
    this.state.logs.unshift(msg);
    if(this.state.logs.length>50) this.state.logs.pop();
    this.save();
  },
  logsHTML(){
    return this.state.logs.map(l=>"<div>"+l+"</div>").join("");
  },

  // 🔹 Sécurité : si pas de perso -> redirection
  ensureGameOrRedirect(target){
    if(!this.state.created) location.href=target;
  },

  // 🔹 UI refresh rapide
  uiRefreshStatsIfPresent(){
    const s=this.state;
    const hpPct = s.hp/s.hpMax*100;
    const mpPct = s.mana/s.manaMax*100;
    const xpPct = s.xp/this.xpTable[s.level]*100;

    const set=(id,txt)=>{const el=document.getElementById(id); if(el) el.textContent=txt;};
    const setW=(id,val)=>{const el=document.getElementById(id); if(el) el.style.width=val+"%";};

    set("pStr",s.str); set("pDex",s.dex); set("pVit",s.vit); set("pEne",s.ene);
    set("pAtk",this.atkTotal()); set("pDef",this.defTotal());
    set("pCrit",this.critTotal()); set("pMF",this.mfTotal());
    set("pGold",s.gold);

    setW("barHpFill",hpPct); set("barHpText",`HP ${s.hp}/${s.hpMax}`);
    setW("barManaFill",mpPct); set("barManaText",`Mana ${s.mana}/${s.manaMax}`);
    setW("barXpFill",xpPct); set("barXpText",`XP ${s.xp}/${this.xpTable[s.level]}`);
  },

  // 🔹 Ladder local
  getLadder(){
    const saves = JSON.parse(localStorage.getItem("idleARPGladder")||"[]");
    const s = this.state;
    if(s.created){
      const rec = {name:s.name, level:s.level, xp:s.xp};
      const idx = saves.findIndex(e=>e.name===s.name);
      if(idx>=0) saves[idx]=rec; else saves.push(rec);
      saves.sort((a,b)=>b.level-a.level || b.xp-a.xp);
      localStorage.setItem("idleARPGladder", JSON.stringify(saves));
    }
    return saves;
  }
};

// Charger au début
GameCore.load();
