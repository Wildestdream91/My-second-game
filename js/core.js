/* ======================
   core.js : gestion état
   - Difficultés: Normal / Cauchemar / Enfer
   - Déblocage: battre Baal dans la diff courante
   ====================== */
const GameCore={
  state:null,

  // ---- Base I/O ----
  save(){ localStorage.setItem("idleARPG_state", JSON.stringify(this.state)); },
  load(){ this.state=JSON.parse(localStorage.getItem("idleARPG_state")||"null"); return this.state; },
  ensureGameOrRedirect(url){ if(!this.load()) location.href=url; },

  // 👉 NEW: charger config admin (taux)
  getConfig(){ return JSON.parse(localStorage.getItem("idleARPG_config")||"{}"); },

  // ---- Init / new game ----
  newGame(name, cls="Aventurier"){
    this.state={
      name, cls,
      level:1, xp:0, gold:0,
      str:5,dex:5,vit:5,ene:5, statPts:5,
      hpMax:50, hp:50, manaMax:20, mana:20,
      inventory:[], equipment:{head:null,amulet:null,weapon:null,chest:null,shield:null,ring:null},
      logs:[],
      // difficultés
      difficulty:"Normal",
      progress:{
        "Normal":   { bossesDefeated:{}, actReached:1 },
        "Cauchemar":{ bossesDefeated:{}, actReached:1, locked:true },
        "Enfer":    { bossesDefeated:{}, actReached:1, locked:true }
      },
      // carte/zone active
      currentAct:1,
      currentZone:"a1-rogue-encampment"
    };
    this.recalcVitals(true);
    this.save();
  },

  // ---- Logs ----
  log(msg){
    if(!this.state?.logs) return;
    this.state.logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
    this.state.logs=this.state.logs.slice(0,120);
    this.save();
  },
  logsHTML(){ return (this.state?.logs||[]).map(l=>`<div>${l}</div>`).join(""); },

  // ---- Stats / dérivés ----
  equipBonus(){const o={str:0,dex:0,vit:0,ene:0,atk:0,def:0,crit:0,mf:0};
    const eq=this.state?.equipment||{}; for(const k in eq){const it=eq[k]; if(!it) continue; for(const s in o)o[s]+=(it[s]||0);} return o;},
  effStr(){return (this.state?.str||0)+this.equipBonus().str;},
  effDex(){return (this.state?.dex||0)+this.equipBonus().dex;},
  effVit(){return (this.state?.vit||0)+this.equipBonus().vit;},
  effEne(){return (this.state?.ene||0)+this.equipBonus().ene;},
  atkTotal(){return (this.effStr()||0)+(this.state?.level||0)+this.equipBonus().atk;},
  defTotal(){return Math.floor(this.effDex())+Math.floor((this.state?.level||0)/2)+this.equipBonus().def;},
  critTotal(){return Math.floor((this.effDex()||0)/2)+this.equipBonus().crit;},
  mfTotal(){return this.equipBonus().mf;},
  recalcVitals(full=false){
    const s=this.state; if(!s) return;
    s.hpMax=50+this.effVit()*5; s.manaMax=20+this.effEne()*3;
    if(full){s.hp=s.hpMax; s.mana=s.manaMax;} else { if(s.hp>s.hpMax)s.hp=s.hpMax; if(s.mana>s.manaMax)s.mana=s.manaMax; }
  },
  spendStatPoint(stat){
    const s=this.state; if(!s || s.statPts<=0) return;
    if(!["str","dex","vit","ene"].includes(stat)) return;
    s[stat]++; s.statPts--; this.recalcVitals(false); this.save();
  },

  // ---- XP table & gain ----
  xpTable:(()=>{ const arr=[0]; for(let i=1;i<=99;i++){ const base = i<=20 ? Math.pow(i,1.85)*70 : i<=60 ? Math.pow(i,1.98)*85 : Math.pow(i,2.12)*100; arr[i] = Math.floor(base);} return arr; })(),
  addXP(raw){
    const s=this.state; if(!s) return;
    s.xp += Math.max(0, Math.floor(raw));
    while(s.level<99 && s.xp>=this.xpTable[s.level]){
      s.xp -= this.xpTable[s.level]; s.level++; s.statPts+=5;
      this.log(`🎉 Niveau ${s.level} (+5 pts)`);
      this.recalcVitals(true);
    }
    this.save();
  },
  addGold(a){ this.state.gold += Math.max(0,Math.floor(a||0)); this.save(); },

  // ---- Difficulté & progression ----
  getDifficulty(){ return this.state?.difficulty || "Normal"; },
  isDifficultyUnlocked(diff){
    if(diff==="Normal") return true;
    return !this.state?.progress?.[diff]?.locked;
  },
  setDifficulty(diff){
    if(!["Normal","Cauchemar","Enfer"].includes(diff)) return false;
    if(!this.isDifficultyUnlocked(diff)){ this.log(`⛔ Difficulté ${diff} verrouillée.`); return false; }
    this.state.difficulty = diff;
    this.state.currentAct = 1;
    this.state.currentZone = "a1-rogue-encampment";
    this.save();
    this.log(`🗡️ Difficulté: ${diff}`);
    return true;
  },
  onBossDefeated(bossId){
    const diff=this.getDifficulty();
    const p = this.state.progress[diff];
    p.bossesDefeated[bossId]=true; this.save();
    this.log(`🏆 Boss vaincu (${bossId}) en ${diff}`);
    if(bossId==="baal"){
      if(diff==="Normal"   && this.state.progress["Cauchemar"].locked){ this.state.progress["Cauchemar"].locked=false; this.log("🔓 Cauchemar débloqué !"); }
      if(diff==="Cauchemar"&& this.state.progress["Enfer"].locked){ this.state.progress["Enfer"].locked=false; this.log("🔓 Enfer débloqué !"); }
      this.save();
    }
  }
};
