const GameCore = {
  state: null,
  xpTable: Array.from({length:100}, (_,i)=> Math.floor(50 * Math.pow(i+1,1.5)) ),

  // ---- Création d’un nouveau jeu ----
  newGame(name){
    this.state = {
      name,
      cls:"Aventurier",
      level:1, xp:0, gold:0,
      hp:50, hpMax:50, mana:20, manaMax:20,
      str:5, dex:5, vit:5, ene:5,
      statPts:0,
      equipment:{},
      inventory:[],
      currentAct:1,
      currentZone:"1-1",
      difficulty:"Normal",
      logs:[]
    };
    this.save();
  },

  // ---- Sauvegarde / chargement ----
  save(){
    try{
      localStorage.setItem("idleARPG_state", JSON.stringify(this.state));
      const back = localStorage.getItem("idleARPG_state");
      if(!back) throw new Error("write_check_failed");
    }catch(e){
      alert("⚠️ Impossible d’enregistrer la partie (localStorage).");
      console.error("Save error:", e);
    }
  },
  load(){
    try{
      const raw = localStorage.getItem("idleARPG_state");
      if(!raw) return (this.state=null);
      this.state = JSON.parse(raw);
      return this.state;
    }catch(e){
      console.error("Load error, clearing corrupted state:", e);
      localStorage.removeItem("idleARPG_state");
      this.state=null;
      return null;
    }
  },
  ensureGameOrRedirect(url){
    const ok=this.load();
    if(!ok){
      console.warn("No game state found, redirecting to", url);
      location.href=url;
    }
  },

  // ---- Logs ----
  log(msg){
    if(!this.state.logs) this.state.logs=[];
    this.state.logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
    this.state.logs = this.state.logs.slice(0,100);
    this.save();
  },
  logsHTML(){
    return (this.state.logs||[]).map(l=>`<div>${l}</div>`).join("");
  },

  // ---- Stats dérivées ----
  effStr(){ return this.state.str; },
  effDex(){ return this.state.dex; },
  effVit(){ return this.state.vit; },
  effEne(){ return this.state.ene; },

  atkTotal(){ return this.effStr() + this.state.level; },
  defTotal(){ return this.effDex() + Math.floor(this.state.level/2); },
  critTotal(){ return Math.floor(this.effDex()/2); },
  mfTotal(){ return 0; },

  // ---- Utilitaires XP ----
  grantXP(amount){
    const s=this.state;
    s.xp += amount;
    let need=this.xpTable[s.level];
    while(s.xp>=need){
      s.xp -= need;
      s.level++;
      s.statPts += 5;
      s.hpMax += 10; s.hp = s.hpMax;
      s.manaMax += 5; s.mana = s.manaMax;
      this.log(`Niveau ${s.level} atteint !`);
      need=this.xpTable[s.level]||Infinity;
    }
    this.save();
  },

  // ---- Points de caractéristiques ----
  spendStatPoint(stat){
    const s=this.state;
    if(s.statPts<=0) return;
    s[stat]++; s.statPts--;
    this.save();
  },

  // ---- Config Admin ----
  getConfig(){
    try{
      return JSON.parse(localStorage.getItem("idleARPG_config")||"{}");
    }catch(e){ return {}; }
  },
  getDifficulty(){ return this.state?.difficulty || "Normal"; }
};
