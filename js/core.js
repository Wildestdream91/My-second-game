/* ===================================================
   core.js — Cœur du Idle Diablo-like
   Gère : état global, persistance, classes, XP, stats,
          équipements, logs et progression.
   Avec migration auto pour anciennes sauvegardes.
   =================================================== */

const GameCore = {
  state: null,

  // ---- Table XP (style Diablo 2, adoucie) ----
  xpTable: (() => {
    const arr = [0];
    for (let i = 1; i <= 99; i++) {
      const base =
        i <= 20 ? Math.pow(i, 1.85) * 70 :
        i <= 60 ? Math.pow(i, 1.98) * 85 :
                   Math.pow(i, 2.12) * 100;
      arr[i] = Math.floor(base);
    }
    return arr;
  })(),

  // ---- Sauvegarde / chargement ----
  save() {
    try {
      localStorage.setItem("idleARPG_state", JSON.stringify(this.state));
      const back = localStorage.getItem("idleARPG_state");
      if (!back) throw new Error("write_check_failed");
    } catch (e) {
      alert("⚠️ Impossible d’enregistrer la partie (localStorage). Active le stockage local pour ce site.");
      console.error("Save error:", e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem("idleARPG_state");
      if (!raw) { this.state = null; return null; }
      this.state = JSON.parse(raw);

      // 👉 Migration + recalcul (répare les anciennes saves)
      this.migrateState();
      this.recalcVitals(false);

      return this.state;
    } catch (e) {
      console.error("Load error, clearing corrupted state:", e);
      localStorage.removeItem("idleARPG_state");
      this.state = null;
      return null;
    }
  },

  ensureGameOrRedirect(url) {
    const ok = this.load();
    if (!ok) {
      console.warn("No game state found, redirecting to", url);
      location.href = url;
    }
  },

  // ---- Config Admin ----
  getConfig() {
    try { return JSON.parse(localStorage.getItem("idleARPG_config") || "{}"); }
    catch { return {}; }
  },

  // ---- Presets de classes (inspirés D2) ----
  classPresets: {
    "Barbare":       { str: 9, dex: 4, vit: 7, ene: 3, hp: 60, mana: 18 },
    "Sorcieres":     { str: 3, dex: 5, vit: 4, ene: 11, hp: 42, mana: 28 }, // (sans accent pour simplicité)
    "Paladin":       { str: 7, dex: 6, vit: 6, ene: 4, hp: 56, mana: 20 },
    "Necromancien":  { str: 3, dex: 5, vit: 5, ene: 10, hp: 45, mana: 26 },
    "Amazone":       { str: 5, dex: 9, vit: 5, ene: 4, hp: 50, mana: 22 },
    "Assassin":      { str: 6, dex: 8, vit: 5, ene: 4, hp: 50, mana: 22 },
    "Druide":        { str: 6, dex: 4, vit: 7, ene: 5, hp: 58, mana: 21 }
  },

  // ---- Migration : normalise & complète l’état chargé ----
  migrateState() {
    const s = this.state || {};

    // Normalisation nom de classe (accents/variantes)
    const mapClass = { "Sorcieres": "Sorcieres", "Sorcières": "Sorcieres" };
    s.cls = mapClass[s.cls] || s.cls || "Barbare";

    // Valeurs minimales sûres
    s.name     = s.name || "Héros";
    s.level    = Number.isFinite(s.level) ? s.level : 1;
    s.xp       = Number.isFinite(s.xp)    ? s.xp    : 0;
    s.gold     = Number.isFinite(s.gold)  ? s.gold  : 0;
    s.statPts  = Number.isFinite(s.statPts) ? s.statPts : 5;

    // Caractéristiques
    const preset = this.classPresets[s.cls] || this.classPresets["Barbare"];
    s.str = Number.isFinite(s.str) ? s.str : preset.str;
    s.dex = Number.isFinite(s.dex) ? s.dex : preset.dex;
    s.vit = Number.isFinite(s.vit) ? s.vit : preset.vit;
    s.ene = Number.isFinite(s.ene) ? s.ene : preset.ene;

    // Équipement / inventaire
    s.equipment ||= { head: null, amulet: null, weapon: null, chest: null, shield: null, ring: null };
    s.inventory ||= [];
    s.logs      ||= [];

    // Barres (seront recalculées)
    if (!Number.isFinite(s.hpMax))   s.hpMax = preset.hp;
    if (!Number.isFinite(s.hp))      s.hp    = s.hpMax;
    if (!Number.isFinite(s.manaMax)) s.manaMax = preset.mana;
    if (!Number.isFinite(s.mana))    s.mana    = s.manaMax;

    // Progression/difficulté
    s.difficulty = s.difficulty || "Normal";
    s.progress ||= {
      "Normal":    { bossesDefeated: {}, actReached: 1 },
      "Cauchemar": { bossesDefeated: {}, actReached: 1, locked: true },
      "Enfer":     { bossesDefeated: {}, actReached: 1, locked: true }
    };
    s.currentAct  = Number.isFinite(s.currentAct)  ? s.currentAct  : 1;
    s.currentZone = s.currentZone || "a1-rogue-encampment";

    this.state = s;
  },

  // ---- Création d’un nouveau perso ----
  newGame(name, cls = "Barbare") {
    const mapClass = { "Sorcieres": "Sorcieres", "Sorcières": "Sorcieres" };
    const normCls = mapClass[cls] || cls;
    const p = this.classPresets[normCls] || this.classPresets["Barbare"];

    this.state = {
      name, cls: normCls,
      level: 1, xp: 0, gold: 0,
      str: p.str, dex: p.dex, vit: p.vit, ene: p.ene, statPts: 5,
      hpMax: p.hp, hp: p.hp,
      manaMax: p.mana, mana: p.mana,
      equipment: { head: null, amulet: null, weapon: null, chest: null, shield: null, ring: null },
      inventory: [],
      logs: [],
      // Difficulté & progression
      difficulty: "Normal",
      progress: {
        "Normal":    { bossesDefeated: {}, actReached: 1 },
        "Cauchemar": { bossesDefeated: {}, actReached: 1, locked: true },
        "Enfer":     { bossesDefeated: {}, actReached: 1, locked: true }
      },
      // Position
      currentAct: 1,
      currentZone: "a1-rogue-encampment"
    };
    this.recalcVitals(true);
    this.save();
    this.log(`Création: ${name} (${normCls}).`);
  },

  // ---- Logs ----
  log(msg) {
    if (!this.state?.logs) return;
    this.state.logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
    this.state.logs = this.state.logs.slice(0, 120);
    this.save();
  },
  logsHTML() { return (this.state?.logs || []).map(l => `<div>${l}</div>`).join(""); },

  // ---- Stats dérivées & équipements ----
  equipBonus() {
    const o = { str: 0, dex: 0, vit: 0, ene: 0, atk: 0, def: 0, crit: 0, mf: 0 };
    const eq = this.state?.equipment || {};
    for (const k in eq) {
      const it = eq[k]; if (!it) continue;
      for (const s in o) o[s] += (it[s] || 0);
    }
    return o;
  },

  effStr() { return (this.state?.str || 0) + this.equipBonus().str; },
  effDex() { return (this.state?.dex || 0) + this.equipBonus().dex; },
  effVit() { return (this.state?.vit || 0) + this.equipBonus().vit; },
  effEne() { return (this.state?.ene || 0) + this.equipBonus().ene; },

  atkTotal() { return this.effStr() + (this.state?.level || 0) + this.equipBonus().atk; },
  defTotal() { return Math.floor(this.effDex()) + Math.floor((this.state?.level || 0) / 2) + this.equipBonus().def; },
  critTotal() { return Math.floor((this.effDex() || 0) / 2) + this.equipBonus().crit; },
  mfTotal() { return this.equipBonus().mf; },

  recalcVitals(full = false) {
    const s = this.state; if (!s) return;
    const baseHP   = (this.classPresets[s.cls]?.hp   || 50);
    const baseMana = (this.classPresets[s.cls]?.mana || 20);
    s.hpMax   = baseHP   + this.effVit() * 5;
    s.manaMax = baseMana + this.effEne() * 3;
    if (full) { s.hp = s.hpMax; s.mana = s.manaMax; }
    else { if (s.hp > s.hpMax) s.hp = s.hpMax; if (s.mana > s.manaMax) s.mana = s.manaMax; }
  },

  // ---- XP / montée de niveau ----
  addXP(raw) {
    const s = this.state; if (!s) return;
    s.xp += Math.max(0, Math.floor(raw));
    while (s.level < 99 && s.xp >= this.xpTable[s.level]) {
      s.xp -= this.xpTable[s.level]; s.level++; s.statPts += 5;
      this.log(`🎉 Niveau ${s.level} (+5 pts)`);
      this.recalcVitals(true);
    }
    this.save();
  },
  addGold(a) { this.state.gold += Math.max(0, Math.floor(a || 0)); this.save(); },

  // ---- Points de stats ----
  spendStatPoint(stat) {
    const s = this.state; if (!s || s.statPts <= 0) return;
    if (!["str", "dex", "vit", "ene"].includes(stat)) return;
    s[stat]++; s.statPts--; this.recalcVitals(false); this.save();
  },

  // ---- Difficultés / progression ----
  getDifficulty() { return this.state?.difficulty || "Normal"; },
  isDifficultyUnlocked(diff) {
    if (diff === "Normal") return true;
    return !this.state?.progress?.[diff]?.locked;
  },
  setDifficulty(diff) {
    if (!["Normal", "Cauchemar", "Enfer"].includes(diff)) return false;
    if (!this.isDifficultyUnlocked(diff)) {
      this.log(`⛔ Difficulté ${diff} verrouillée.`); return false;
    }
    this.state.difficulty = diff;
    this.state.currentAct = 1;
    this.state.currentZone = "a1-rogue-encampment";
    this.save();
    this.log(`🗡️ Difficulté: ${diff}`);
    return true;
  },
  onBossDefeated(bossId) {
    const diff = this.getDifficulty();
    const p = this.state.progress[diff];
    p.bossesDefeated[bossId] = true; this.save();
    this.log(`🏆 Boss vaincu (${bossId}) en ${diff}`);

    // Débloque Cauchemar/Enfer en battant Baal
    if (bossId === "baal") {
      if (diff === "Normal" && this.state.progress["Cauchemar"].locked) {
        this.state.progress["Cauchemar"].locked = false;
        this.log("🔓 Cauchemar débloqué !");
      }
      if (diff === "Cauchemar" && this.state.progress["Enfer"].locked) {
        this.state.progress["Enfer"].locked = false;
        this.log("🔓 Enfer débloqué !");
      }
      this.save();
    }
  }
};
