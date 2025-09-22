/* zones.js — Waypoints style Diablo II + boss gate (GLOBAL) */
var Zones = (function () {
  // Helper: fabrique un waypoint
  function wp(id, zl, nameFR, baseXP, baseGold, bossId, bossName, actBoss) {
    return {
      id, zl, nameFR, baseXP, baseGold,
      bossId,            // id du boss à vaincre pour débloquer le suivant
      bossName,          // nom d'affichage
      actBoss: !!actBoss // true si boss de fin d'acte (condition pour passer à l'acte suivant)
    };
  }

  // ===== Acte I (9 waypoints) =====
  const A1 = {
    id: "A1",
    name: "Acte I — Camp des Rogues",
    waypoints: [
      wp("A1-WP1",  1, "Camp des Rogues",           12,  5, "a1_wp1", "Bandit des plaines"),
      wp("A1-WP2",  2, "Plaines froides",           14,  6, "a1_wp2", "Chef déchu"),
      wp("A1-WP3",  3, "Champ de pierres",          16,  7, "a1_wp3", "Gargouille de pierre"),
      wp("A1-WP4",  4, "Bois obscur",               19,  8, "a1_wp4", "Protecteur de l'Arbre"),
      wp("A1-WP5",  5, "Marais noir",               22,  9, "a1_wp5", "La Comtesse"),
      wp("A1-WP6",  6, "Clôitre extérieur",         26, 11, "a1_wp6", "Capitaine de la garde"),
      wp("A1-WP7",  7, "Prison — Niveau 1",         29, 12, "a1_wp7", "Geôlier possédé"),
      wp("A1-WP8",  8, "Clôitre intérieur",         32, 14, "a1_wp8", "Gardien du sanctuaire"),
      wp("A1-WP9",  9, "Catacombes — Niveau 2",     36, 16, "andariel", "Andariel", true)
    ]
  };

  // ===== Acte II (9 waypoints) =====
  const A2 = {
    id: "A2",
    name: "Acte II — Lut Gholein",
    waypoints: [
      wp("A2-WP1", 10, "Lut Gholein",               40, 18, "a2_wp1", "Chef de caravanes corrompu"),
      wp("A2-WP2", 11, "Égouts — Niveau 2",         44, 20, "a2_wp2", "Maître des égouts"),
      wp("A2-WP3", 12, "Collines rocailleuses",     48, 22, "a2_wp3", "Seigneur scarabée"),
      wp("A2-WP4", 13, "Salles des Morts — Niv.2",  52, 24, "a2_wp4", "Garde momifié"),
      wp("A2-WP5", 14, "Oasis lointaine",           56, 26, "a2_wp5", "Seigneur des sables"),
      wp("A2-WP6", 15, "Cité perdue",               60, 28, "a2_wp6", "Gardien du temple"),
      wp("A2-WP7", 16, "Caveau du palais — Niv.1",  64, 30, "a2_wp7", "Vizir du palais"),
      wp("A2-WP8", 17, "Sanctuaire Arcanes",        68, 32, "a2_wp8", "Gardien spectral"),
      wp("A2-WP9", 18, "Canyon des Magi",           72, 34, "duriel", "Duriel", true)
    ]
  };

  // ===== Acte III (9 waypoints) =====
  const A3 = {
    id: "A3",
    name: "Acte III — Kurast",
    waypoints: [
      wp("A3-WP1", 19, "Port de Kurast",            76, 36, "a3_wp1", "Pirate maudit"),
      wp("A3-WP2", 20, "Forêt des araignées",       80, 38, "a3_wp2", "Reine araignée"),
      wp("A3-WP3", 21, "Grand marais",              84, 40, "a3_wp3", "Seigneur des marais"),
      wp("A3-WP4", 22, "Jungle des Fétiches",       88, 42, "a3_wp4", "Chef fétiche"),
      wp("A3-WP5", 23, "Bas-Kurast",                92, 44, "a3_wp5", "Garde de Kurast"),
      wp("A3-WP6", 24, "Bazar de Kurast",           96, 46, "a3_wp6", "Champion Zakarum"),
      wp("A3-WP7", 25, "Haut-Kurast",              100, 48, "a3_wp7", "Templier fanatique"),
      wp("A3-WP8", 26, "Travincal",                104, 50, "a3_wp8", "Conseiller corrompu"),
      wp("A3-WP9", 27, "Haine — Niveau 2",         108, 52, "mephisto", "Mephisto", true)
    ]
  };

  // ===== Acte IV (3 waypoints) =====
  const A4 = {
    id: "A4",
    name: "Acte IV — Pandémonium",
    waypoints: [
      wp("A4-WP1", 28, "Forteresse du Pandémonium", 112, 55, "a4_wp1", "Sentinelle céleste"),
      wp("A4-WP2", 32, "Cité des Damnés",           126, 60, "a4_wp2", "Chevalier de l'enfer"),
      wp("A4-WP3", 36, "Rivière de Flamme",         140, 66, "diablo", "Diablo", true)
    ]
  };

  // ===== Acte V (10 waypoints) =====
  const A5 = {
    id: "A5",
    name: "Acte V — Arreat",
    waypoints: [
      wp("A5-WP1",  40, "Harrogath",                 160,  70, "a5_wp1", "Capitaine de Harrogath"),
      wp("A5-WP2",  41, "Contreforts sanglants",     165,  74, "a5_wp2", "Commandant de siège"),
      wp("A5-WP3",  42, "Hauts-frimas",              170,  78, "a5_wp3", "Chef barbare corrompu"),
      wp("A5-WP4",  43, "Plateau d'Arreat",          176,  82, "a5_wp4", "Seigneur du plateau"),
      wp("A5-WP5",  44, "Passage cristallin",        182,  86, "a5_wp5", "Gardiens d'azur"),
      wp("A5-WP6",  45, "Sentier glacé",             188,  90, "a5_wp6", "Horreur cristallisée"),
      wp("A5-WP7",  46, "Salles de la Souffrance",   194,  96, "a5_wp7", "Nihlathak"),
      wp("A5-WP8",  47, "Toundra gelée",             200, 102, "a5_wp8", "Seigneur de givre"),
      wp("A5-WP9",  48, "Chemin des Anciens",        206, 110, "a5_wp9", "Les Anciens"),
      wp("A5-WP10", 50, "Coeur de la Pierre-Monde",  210, 120, "baal", "Baal", true)
    ]
  };

  const ACTS = [A1, A2, A3, A4, A5];

  // ===== API =====
  function allWaypoints() {
    return ACTS.flatMap(a => a.waypoints);
  }
  function getActById(actId) {
    return ACTS.find(a => a.id === actId) || null;
  }
  function getActByZoneId(zoneId) {
    return ACTS.find(a => a.waypoints.some(z => z.id === zoneId)) || null;
  }
  function getZone(zoneId) {
    return allWaypoints().find(z => z.id === zoneId) || null;
  }
  function getDifficultyScalars(diffName) {
    const DIFF = {
      "Normal":    { enemy:{hp:1.0, dmg:1.0}, reward:{xp:1.0, gold:1.0, drop:1.0}, mfBonus:0 },
      "Cauchemar": { enemy:{hp:1.7, dmg:1.3}, reward:{xp:1.5, gold:1.4, drop:1.35}, mfBonus:10 },
      "Enfer":     { enemy:{hp:2.4, dmg:1.8}, reward:{xp:2.2, gold:1.9, drop:1.8},  mfBonus:20 },
    };
    return DIFF[diffName] || DIFF["Normal"];
  }

  function fillActs(selectEl){
    if(!selectEl) return;
    selectEl.innerHTML = ACTS.map((a,i)=>`<option value="${a.id}" ${i===0?"selected":""}>${a.name}</option>`).join("");
  }

  function fillZonesForAct(selAct, selZone, unlockedChecker){
    if(!selAct || !selZone) return;
    const act = getActById(selAct.value) || ACTS[0];
    selZone.innerHTML = act.waypoints.map((z,i)=>{
      const locked = unlockedChecker ? !unlockedChecker(z.id) : false;
      const lockStr = locked ? " 🔒" : "";
      return `<option value="${z.id}" ${i===0?"selected":""}>${z.nameFR} (Z${z.zl})${lockStr}</option>`;
    }).join("");
  }

  return {
    acts: ACTS,
    getZone,
    getActById,
    getActByZoneId,
    getDifficultyScalars,
    fillActs,
    fillZonesForAct
  };
})();
