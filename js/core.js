/* ================================
   Idle ARPG v6.0 FR - core.js
   Gestion du héros, sauvegarde, ladder
   ================================ */

const GameCore = {
  state: {
    created: false,
    name: "—",
    cls: "—",
    level: 1,
    xp: 0,
    xpToNext: 100,
    gold: 0,
    str: 5, dex: 5, vit: 5, ene: 5,
    hp: 50, hpMax: 50,
    mana: 20, manaMax: 20,
    zone: null,
    bossesDefeated: {},
    inventory: [],
    equipment: {},
    ladder: [],
    logs: []
  },

  saveKey: "idle-arpg-save-v6",

  /* === Sauvegarde & chargement === */
  save() {
    localStorage.setItem(this.saveKey, JSON.stringify(this.state));
  },
  load() {
    const raw = localStorage.getItem(this.saveKey);
    if(raw){
      try { this.state = JSON.parse(raw); }
      catch(e){ console.error("Erreur de lecture save", e); }
    }
  },
  reset() {
    localStorage.removeItem(this.saveKey);
    location.href="index.html";
  },

  /* === Création du héros === */
  newGame(name, cls){
    this.state.created = true;
    this.state.name = name;
    this.state.cls = cls;
    this.state.logs.push(`Bienvenue ${name} le ${cls} !`);
    this.save();
  },

  ensureGameOrRedirect(toIndex){
    this.load();
    if(!this.state.created){
      location.href=toIndex;
    }
  },

  /* === XP / Level === */
  addXP(amount){
    this.state.xp += amount;
    while(this.state.xp >= this.state.xpToNext){
      this.state.xp -= this.state.xpToNext;
      this.levelUp();
    }
    this.save();
  },
  levelUp(){
    this.state.level++;
    this.state.xpToNext = Math.floor(this.state.xpToNext*1.25);
    this.state.hpMax += 10;
    this.state.manaMax += 5;
    this.state.hp = this.state.hpMax;
    this.state.mana = this.state.manaMax;
    this.state.logs.push(`✨ Niveau ${this.state.level} atteint !`);
  },

  /* === Gold === */
  addGold(amount){
    this.state.gold += amount;
    this.save();
  },

  /* === Logs === */
  log(msg){
    this.state.logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if(this.state.logs.length > 50) this.state.logs.pop();
    this.save();
  },
  logsHTML(){
    return this.state.logs.map(l=>`<div>${l}</div>`).join("");
  },

  /* === Ladder === */
  updateLadder(){
    const entry = {
      name: this.state.name,
      level: this.state.level,
      xp: this.state.xp,
      score: this.state.level*1000+this.state.xp
    };
    let ladder = JSON.parse(localStorage.getItem("idle-arpg-ladder")||"[]");
    ladder = ladder.filter(e=>e.name!==entry.name);
    ladder.push(entry);
    ladder.sort((a,b)=>b.score-a.score);
    if(ladder.length>20) ladder.length=20;
    localStorage.setItem("idle-arpg-ladder",JSON.stringify(ladder));
  },
  getLadder(){
    return JSON.parse(localStorage.getItem("idle-arpg-ladder")||"[]");
  }
};

/* === Exécution auto === */
GameCore.load();
