/* zones.js — actes, zones et multiplicateurs de difficulté */
const Zones = (function(){
  // Acts/areas simplifiés (inspirés D2) — ajuste librement
  const ACTS = [
    {
      id:"A1", name:"Acte I — Camp des Rogues", zones:[
        { id:"A1-1", zl:1,  nameFR:"Plaines Sanglantes", baseXP:12, baseGold:5 },
        { id:"A1-2", zl:3,  nameFR:"Caveau Humide",       baseXP:16, baseGold:6 },
        { id:"A1-3", zl:5,  nameFR:"Tristram",            baseXP:22, baseGold:9, boss:true, bossId:"griswold" },
      ]
    },
    {
      id:"A2", name:"Acte II — Lut Gholein", zones:[
        { id:"A2-1", zl:8,  nameFR:"Désert Rochailleux",  baseXP:30, baseGold:13 },
        { id:"A2-2", zl:12, nameFR:"Tombeaux de Tal",     baseXP:45, baseGold:20 },
        { id:"A2-3", zl:14, nameFR:"Sanctuaire Arcanes",  baseXP:56, baseGold:24, boss:true, bossId:"duriel" },
      ]
    },
    {
      id:"A3", name:"Acte III — Kurast", zones:[
        { id:"A3-1", zl:18, nameFR:"Berges de Kurast",    baseXP:72, baseGold:32 },
        { id:"A3-2", zl:22, nameFR:"Égouts",              baseXP:88, baseGold:40 },
        { id:"A3-3", zl:25, nameFR:"Sanctuaire du Chaos", baseXP:100, baseGold:46, boss:true, bossId:"mephisto" },
      ]
    },
    {
      id:"A4", name:"Acte IV — Pandémonium", zones:[
        { id:"A4-1", zl:28, nameFR:"Plaines du Désespoir", baseXP:112, baseGold:52 },
        { id:"A4-2", zl:32, nameFR:"Rivière de Flamme",    baseXP:126, baseGold:60 },
        { id:"A4-3", zl:36, nameFR:"Sanctuaire du Chaos",  baseXP:140, baseGold:70, boss:true, bossId:"diablo" },
      ]
    },
    {
      id:"A5", name:"Acte V — Arreat", zones:[
        { id:"A5-1", zl:40, nameFR:"Plateau d'Arreat",    baseXP:160, baseGold:84 },
        { id:"A5-2", zl:46, nameFR:"Salle du Trône",       baseXP:190, baseGold:100 },
        { id:"A5-3", zl:50, nameFR:"Baal",                 baseXP:210, baseGold:120, boss:true, bossId:"baal" },
      ]
    },
  ];

  // Multiplicateurs par difficulté (ennemis & récompenses)
  const DIFF = {
    "Normal":   { enemy:{hp:1.0, dmg:1.0}, reward:{xp:1.0, gold:1.0, drop:1.0}, mfBonus:0 },
    "Cauchemar":{ enemy:{hp:1.7, dmg:1.3}, reward:{xp:1.5, gold:1.4, drop:1.35}, mfBonus:10 },
    "Enfer":    { enemy:{hp:2.4, dmg:1.8}, reward:{xp:2.2, gold:1.9, drop:1.8},  mfBonus:20 },
  };

  function findZone(id){
    for(const a of ACTS){
      for(const z of a.zones){
        if(z.id===id) return z;
      }
    }
    return null;
  }

  return {
    acts: ACTS,
    diffs: DIFF,
    getZone: findZone,
    getDifficultyScalars(diffName){
      return DIFF[diffName] || DIFF["Normal"];
    },
    fillActs(selectEl){
      if(!selectEl) return;
      selectEl.innerHTML = ACTS.map((a,i)=>`<option value="${a.id}" ${i===0?'selected':''}>${a.name}</option>`).join('');
    },
    fillZonesForAct(selAct, selZone){
      if(!selAct || !selZone) return;
      const act = ACTS.find(a=>a.id===selAct.value) || ACTS[0];
      selZone.innerHTML = act.zones.map((z,i)=>`<option value="${z.id}" ${i===0?'selected':''}>${z.nameFR} (Z${z.zl})</option>`).join('');
    }
  };
})();
