/* ==========================================
   Idle ARPG v7.0 FR - core.js
   Base système: perso, XP (inspiré D2), stats,
   level up, points, persistance, ladder, logs.
   ========================================== */

const GameCore = {
  saveKey: "idle-arpg-save-v7",
  ladderKey: "idle-arpg-ladder-v7",

  // Table XP inspirée de Diablo II, ajustée pour idle (accélérée au début)
  // xpToNext[n] = XP à gagner pour passer de n -> n+1
  xpToNext: (() => {
    const arr = [0]; // index 0 inutilisé
    let base = 200; // niv1->2
    for (let lvl = 1; lvl < 99; lvl++) {
      // croissance progressive (inspirée D2, simplifiée)
      const mult =
        lvl < 10 ? 1.35 :
        lvl < 20 ? 1.28 :
        lvl < 30 ? 1.22 :
        lvl < 40 ? 1.18 :
        lvl < 60 ? 1.15 :
        lvl < 80 ? 1.12 :
        lvl < 90 ? 1.10 :
        1.08;
      base = Math.floor(base * mult);
      arr[lvl] = base;
    }
    arr[99] = 0; // cap
    return arr;
  })(),

  // Classes: stats de départ et gains par niveau (style D2)
  classes: {
    "Barbare":  { str:10, dex:5,  vit:10, ene:5,  hpBase:55, hpPerVit:4, manaBase:10, manaPerEne:1.5, perLvl:{str:2,dex:1,vit:2,ene:1} },
    "Paladin":  { str:9,  dex:6,  vit:9,  ene:6,  hpBase:50, hpPerVit:3, manaBase:12, manaPerEne:1.6, perLvl:{str:2,dex:1,vit:2,ene:1} },
    "Sorcière": { str:5,  dex:7,  vit:6,  ene:12, hpBase:40, hpPerVit:2, manaBase:20, manaPerEne:2.5, perLvl:{str:1,dex:1,vit:1,ene:3} },
    "Nécromancien": { str:6,dex:6, vit:7, ene:10, hpBase:42, hpPerVit:2.2, manaBase:18, manaPerEne:2.2, perLvl:{str:1,dex:1,vit:2,ene:2} },
    "Amazone":  { str:8,  dex:10, vit:7,  ene:6,  hpBase:45, hpPerVit:2.5, manaBase:16, manaPerEne:2.0, perLvl:{str:1,dex:2,vit:1,ene:1} }
  },

  // État du jeu
  state: {
    created: false,
    name: "—",
    cls: "—",
    level: 1,
    xp: 0,
    gold: 0,

    // Caractéristiques
    str: 5, dex: 5, vit: 5, ene: 5,
    hp: 50, hpMax: 50,
    mana: 20, manaMax: 20,

    // Points à dépenser
    statPts: 0, // points d’attributs
    skillPts: 0, // points de compétences (placeholder)

    // Équipement & inventaire
    inventory: [],
    equipment: {}, // {head, amulet, weapon, chest, shield, ring}

    // Progression
    bossesDefeated: {}, // {Andariel:true,...}
    zone: null,

    // Journal
    logs: []
  },

  /* ---------- Persistance ---------- */
  save() {
    try {
      localStorage.setItem(this.saveKey, JSON.stringify(this.state));
    } catch(e){ console.error("Save error", e); }
  },
  load() {
    try {
      const raw = localStorage.getItem(this.saveKey);
      if (raw) this.state = JSON.parse(raw);
    } catch(e){ console.error("Load error", e); }
  },
  reset(confirmAlso=false) {
    if(confirmAlso && !confirm("Effacer la sauvegarde ?")) return;
    localStorage.removeItem(this.saveKey);
    location.href = "index.html";
  },

  /* ---------- Nouvelle partie ---------- */
  newGame(name, cls) {
    const tpl = this.classes[cls] || this.classes["Barbare"];
    const st = this.state;
    st.created = true;
    st.name = name || "Héros";
    st.cls = cls;

    // Stats départ
    st.str = tpl.str; st.dex = tpl.dex; st.vit = tpl.vit; st.ene = tpl.ene;
    this.recalcVitals(); // calc HP/Mana à partir des bases
    st.hp = st.hpMax; st.mana = st.manaMax;

    st.level = 1; st.xp = 0; st.gold = 0;
    st.statPts = 5; // petit bonus initial
    st.skillPts = 1;
    st.inventory = [];
    st.equipment = {};
    st.bossesDefeated = {};
    st.zone = null;
    st.logs = [];
    this.log(`Bienvenue ${st.name} le ${st.cls} !`);
    this.save();
  },

  /* ---------- Recalcul vitaux/derivés ---------- */
  recalcVitals() {
    const st = this.state;
    const tpl = this.classes[st.cls] || this.classes["Barbare"];

    // PV & Mana max selon classe
    st.hpMax = Math.max(1, Math.floor(tpl.hpBase + st.vit * tpl.hpPerVit));
    st.manaMax = Math.max(0, Math.floor(tpl.manaBase + st.ene * tpl.manaPerEne));

    // Clamp actuels
    st.hp = Math.min(st.hp, st.hpMax);
    st.mana = Math.min(st.mana, st.manaMax);
  },

  /* ---------- Helper dérivés d’équipement ---------- */
  // Ces fonctions peuvent être utilisées par l’UI (game.html) pour afficher ATQ/DEF/Crit/MF
  totalFromEquip(stat){
    let v = 0;
    const eq = this.state.equipment || {};
    for (const k of Object.keys(eq)) {
      const it = eq[k];
      if (it && typeof it[stat] === "number") v += it[stat];
    }
    return v;
  },
  atkTotal() {
    // ATQ = STR + bonus arme/équipement
    return this.state.str + this.totalFromEquip("atk");
  },
  defTotal() {
    // DEF = DEX/2 + bonus équipement (simplifié)
    return Math.floor(this.state.dex / 2) + this.totalFromEquip("def");
  },
  critTotal() {
    // Crit de base 2% + bonus DEX/50 + équipement
    return Math.min(75, 2 + Math.floor(this.state.dex / 50) + this.totalFromEquip("crit"));
  },
  mfTotal() {
    return this.totalFromEquip("mf");
  },

  /* ---------- XP & Level ---------- */
  addXP(amount){
    const st = this.state;
    if (st.level >= 99) return; // cap
    st.xp += Math.max(0, Math.floor(amount));
    // Passage de niveau
    while (st.level < 99 && st.xp >= this.xpToNext[st.level]) {
      st.xp -= this.xpToNext[st.level];
      this.levelUp();
    }
    this.save();
  },
  levelUp(){
    const st = this.state;
    const tpl = this.classes[st.cls] || this.classes["Barbare"];
    st.level++;

    // Gains “à la D2” (adaptés)
    st.str += tpl.perLvl.str;
    st.dex += tpl.perLvl.dex;
    st.vit += tpl.perLvl.vit;
    st.ene += tpl.perLvl.ene;

    // Points à distribuer
    st.statPts += 5;   // points d’attributs à dépenser
    st.skillPts += 1;  // points de compétence (placeholder)

    // Recalcule PV/Mana et restaure
    this.recalcVitals();
    st.hp = st.hpMax; st.mana = st.manaMax;

    this.log(`✨ Niveau ${st.level} atteint ! (+5 pts attribut, +1 pt compétence)`);
    this.updateLadder();
    this.save();
  },

  /* ---------- Or ---------- */
  addGold(amount){
    this.state.gold += Math.max(0, Math.floor(amount));
    this.save();
  },

  /* ---------- Dépense de points ---------- */
  spendStatPoint(stat){
    const st = this.state;
    if (st.statPts <= 0) { this.log("Pas assez de points d’attribut."); return; }
    if (!["str","dex","vit","ene"].includes(stat)) return;
    st[stat] += 1;
    st.statPts -= 1;
    this.recalcVitals();
    this.save();
  },
  // Placeholder pour les compétences (à implémenter plus tard)
  spendSkillPoint(skillId){
    const st = this.state;
    if (st.skillPts <= 0) { this.log("Pas assez de points de compétence."); return; }
    // TODO: ajout aux skills
    st.skillPts -= 1;
    this.save();
  },

  /* ---------- Logs ---------- */
  log(msg){
    try {
      this.state.logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
      if (this.state.logs.length > 200) this.state.logs.pop();
      this.save();
    } catch(e){ console.error("Log error", e); }
  },
  logsHTML(){
    return (this.state.logs || []).map(l=>`<div>${l}</div>`).join("");
  },

  /* ---------- Ladder local ---------- */
  updateLadder(){
    const st = this.state;
    const entry = {
      name: st.name,
      level: st.level,
      xp: st.xp,
      score: st.level*100000 + st.xp
    };
    let ladder = [];
    try { ladder = JSON.parse(localStorage.getItem(this.ladderKey) || "[]"); } catch{}
    ladder = ladder.filter(e=>e.name !== entry.name);
    ladder.push(entry);
    ladder.sort((a,b)=>b.score - a.score);
    if (ladder.length > 50) ladder.length = 50;
    localStorage.setItem(this.ladderKey, JSON.stringify(ladder));
  },
  getLadder(){
    try { return JSON.parse(localStorage.getItem(this.ladderKey) || "[]"); }
    catch { return []; }
  },

  /* ---------- Intégration UI (facultatif) ---------- */
  // Appelé depuis game.html pour rafraîchir les champs calculés
  uiRefreshStatsIfPresent(){
    const qs = (id)=>document.getElementById(id);
    const s = this.state;
    if (qs("pAtk")) qs("pAtk").textContent = this.atkTotal();
    if (qs("pDef")) qs("pDef").textContent = this.defTotal();
    if (qs("pCrit")) qs("pCrit").textContent = this.critTotal();
    if (qs("pMF")) qs("pMF").textContent = this.mfTotal();
    if (qs("pStr")) qs("pStr").textContent = s.str;
    if (qs("pDex")) qs("pDex").textContent = s.dex;
    if (qs("pVit")) qs("pVit").textContent = s.vit;
    if (qs("pEne")) qs("pEne").textContent = s.ene;
    if (qs("pGold")) qs("pGold").textContent = s.gold;

    if (qs("barHpFill")) qs("barHpFill").style.width = (s.hp/s.hpMax*100)+"%";
    if (qs("barHpText")) qs("barHpText").textContent = `HP ${s.hp}/${s.hpMax}`;
    if (qs("barManaFill")) qs("barManaFill").style.width = (s.mana/s.manaMax*100)+"%";
    if (qs("barManaText")) qs("barManaText").textContent = `Mana ${s.mana}/${s.manaMax}`;
    if (qs("barXpFill")) qs("barXpFill").style.width = (s.xp/ (GameCore.xpToNext[s.level]||1) *100)+"%";
    if (qs("barXpText")) qs("barXpText").textContent = `XP ${s.xp}/${GameCore.xpToNext[s.level]||0}`;

    if (qs("logBox")) qs("logBox").innerHTML = this.logsHTML();
  }
};

/* Chargement auto au parse */
GameCore.load();
