/* admin.js — gestion des réglages (XP/Or/Drop/MF) */
(function(){
  function loadCfg(){
    try{ return JSON.parse(localStorage.getItem("idleARPG_config")||"{}"); }
    catch{ return {}; }
  }
  function saveCfg(cfg){
    localStorage.setItem("idleARPG_config", JSON.stringify(cfg||{}));
  }
  document.addEventListener("DOMContentLoaded", ()=>{
    const cfg = loadCfg();
    const elXp   = document.getElementById("cfgXp");
    const elGold = document.getElementById("cfgGold");
    const elDrop = document.getElementById("cfgDrop");
    const elMF   = document.getElementById("cfgMF");
    if(elXp)   elXp.value   = (cfg.xpRate   ?? 100);
    if(elGold) elGold.value = (cfg.goldRate ?? 100);
    if(elDrop) elDrop.value = (cfg.dropRate ?? 100);
    if(elMF)   elMF.value   = (cfg.mfRate   ?? 0);

    const btnSave = document.getElementById("btnSaveCfg");
    const btnReset= document.getElementById("btnResetCfg");

    if(btnSave) btnSave.onclick = ()=>{
      const next = {
        xpRate:   Math.max(10, Math.min(500, Number(elXp?.value || 100))),
        goldRate: Math.max(10, Math.min(500, Number(elGold?.value || 100))),
        dropRate: Math.max(10, Math.min(500, Number(elDrop?.value || 100))),
        mfRate:   Math.max(0,  Math.min(100, Number(elMF?.value || 0))),
      };
      saveCfg(next);
      alert("Réglages sauvegardés !");
    };
    if(btnReset) btnReset.onclick = ()=>{
      if(!confirm("Réinitialiser les réglages ?")) return;
      saveCfg({});
      if(elXp) elXp.value=100; if(elGold) elGold.value=100; if(elDrop) elDrop.value=100; if(elMF) elMF.value=0;
      alert("Réglages par défaut restaurés.");
    };
  });
})();
