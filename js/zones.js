/* zones.js — Acts/Zones et scalars de difficulté */
const Zones = (() => {
  // Niveau recommandé + base XP/gold par zone
  const ACTS = [
    { id:1, nameFR:"Acte I", zones:[
      { id:"a1-rogue-encampment", nameFR:"Camp des Rogues",    zl:1,  baseXP:8,  baseGold:6,  boss:false },
      { id:"a1-blood-moor",      nameFR:"Plaine Sanglante",    zl:2,  baseXP:12, baseGold:8,  boss:false },
      { id:"a1-cold-plains",     nameFR:"Plaines Glacées",     zl:3,  baseXP:16, baseGold:10, boss:false },
      { id:"a1-stony-field",     nameFR:"Champ de Pierres",    zl:5,  baseXP:20, baseGold:12, boss:false },
      { id:"a1-dark-wood",       nameFR:"Bois Obscur",         zl:7,  baseXP:26, baseGold:14, boss:false },
      { id:"a1-black-marsh",     nameFR:"Marais Noir",         zl:9,  baseXP:34, baseGold:18, boss:false },
      { id:"a1-catacombs-4",     nameFR:"Catacombes (Andariel)", zl:12, baseXP:60, baseGold:35, boss:true, bossId:"andariel" },
    ]},
    { id:2, nameFR:"Acte II", zones:[
      { id:"a2-lut-gholein",     nameFR:"Lut Gholein",         zl:14, baseXP:40, baseGold:25, boss:false },
      { id:"a2-far-oasis",       nameFR:"Lointaine Oasis",     zl:18, baseXP:55, baseGold:32, boss:false },
      { id:"a2-arcane-sanctuary",nameFR:"Sanctuaire Arcanique",zl:20, baseXP:70, baseGold:40, boss:false },
      { id:"a2-duriels-lair",    nameFR:"Repaire (Duriel)",    zl:24, baseXP:120, baseGold:70, boss:true, bossId:"duriel" },
    ]},
    { id:3, nameFR:"Acte III", zones:[
      { id:"a3-kurast-bazaar",   nameFR:"Bazar de Kurast",     zl:26, baseXP:80, baseGold:45, boss:false },
      { id:"a3-travincal",       nameFR:"Travincal",           zl:28, baseXP:95, baseGold:55, boss:false },
      { id:"a3-durance-3",       nameFR:"Durance (Mephisto)",  zl:30, baseXP:160, baseGold:90, boss:true, bossId:"mephisto" },
    ]},
    { id:4, nameFR:"Acte IV", zones:[
      { id:"a4-plains-of-despair", nameFR:"Plaines du Désespoir", zl:32, baseXP:110, baseGold:65, boss:false },
      { id:"a4-river-of-flame",    nameFR:"Rivière de Feu",      zl:34, baseXP:130, baseGold:80, boss:false },
      { id:"a4-chaos-sanctuary",   nameFR:"Sanctuaire du Chaos (Diablo)", zl:36, baseXP:220, baseGold:120, boss:true, bossId:"diablo" },
    ]},
    { id:5, nameFR:"Acte V", zones:[
      { id:"a5-bloody-foothills",  nameFR:"Contreforts Sanglants", zl:38, baseXP:140, baseGold:90, boss:false },
      { id:"a5-worldstone-keep",   nameFR:"Forteresse de Pierre-Monde", zl:40, baseXP:170, baseGold:110, boss:false },
      { id:"a5-throne-destruction",nameFR:"Salle de Destruction (Baal)", zl:42, baseXP:260, baseGold:160, boss:true, bossId:"baal" },
    ]}
  ];

  // Scalars de difficulté (récompenses & ennemis)
  const DIFF = {
    Normal:    { reward:{ xp:1.0, gold:1.0, drop:1.0, mfBonus:0 }, enemy:{ hp:1.0, dmg:1.0 } },
    Cauchemar: { reward:{ xp:1.3, gold:1.3, drop:1.2, mfBonus:25 }, enemy:{ hp:1.7, dmg:1.6 } },
    Enfer:     { reward:{ xp:1.7, gold:1.7, drop:1.4, mfBonus:60 }, enemy:{ hp:2.5, dmg:2.3 } },
  };

  function listActs(){ return ACTS.map(a=>({id:a.id, nameFR:a.nameFR})); }
  function listZones(actId){
    const a = ACTS.find(x=>x.id===Number(actId)) || ACTS[0];
    return a.zones;
  }
  function getZone(id){
    for(const a of ACTS){ const z=a.zones.find(z=>z.id===id); if(z) return z; }
    return null;
  }
  function isActUnlocked(actId){
    // Simple: acte débloqué si précédent boss battu (sauf Acte I)
    if(actId===1) return true;
    const prev = ACTS.find(a=>a.id===actId-1);
    const last = prev?.zones.find(z=>z.boss);
    if(!last) return true;
    const diff = GameCore.getDifficulty();
    const pd = GameCore.state.progress[diff];
    return !!pd.bossesDefeated[last.bossId];
  }
  function getDifficultyScalars(diff){ return DIFF[diff] || DIFF.Normal; }

  return { listActs, listZones, getZone, isActUnlocked, getDifficultyScalars };
})();
