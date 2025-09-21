/* admin.js — panneau admin (taux, MF, mot de passe) */
const Admin = (() => {
  const PASS_KEY = "idleARPG_adminPass";
  const CONF_KEY = "idleARPG_config";
  const DEFAULT_PASS = "admin";

  function getPass(){ return localStorage.getItem(PASS_KEY) || DEFAULT_PASS; }
  function setPass(p){ localStorage.setItem(PASS_KEY, p); }

  function checkPass(){
    const input = document.getElementById("adminPass").value;
    if(input === getPass()){
      document.getElementById("loginBox").style.display="none";
      document.getElementById("adminPanel").style.display="block";
      loadConfigToUI();
      document.getElementById("loginMsg").textContent="";
    }else{
      document.getElementById("loginMsg").textContent="Mot de passe incorrect.";
    }
  }

  function loadConfig(){
    try{ return JSON.parse(localStorage.getItem(CONF_KEY) || "{}"); }
    catch{ return {}; }
  }
  function saveConfig(cfg){
    localStorage.setItem(CONF_KEY, JSON.stringify(cfg));
  }

  function loadConfigToUI(){
    const cfg = loadConfig();
    document.getElementById("xpRate").value   = cfg.xpRate   ?? 100;
    document.getElementById("goldRate").value = cfg.goldRate ?? 100;
    document.getElementById("dropRate").value = cfg.dropRate ?? 100;
    document.getElementById("mfRate").value   = cfg.mfRate   ?? 0;
  }

  function save(){
    const cfg = {
      xpRate:   Number(document.getElementById("xpRate").value),
      goldRate: Number(document.getElementById("goldRate").value),
      dropRate: Number(document.getElementById("dropRate").value),
      mfRate:   Number(document.getElementById("mfRate").value)
    };
    saveConfig(cfg);
    document.getElementById("saveMsg").textContent = "Sauvegardé.";
    setTimeout(()=>{ document.getElementById("saveMsg").textContent=""; }, 1500);
  }

  function reset(){
    localStorage.removeItem(CONF_KEY);
    loadConfigToUI();
    document.getElementById("saveMsg").textContent = "Réinitialisé.";
    setTimeout(()=>{ document.getElementById("saveMsg").textContent=""; }, 1500);
  }

  function changePass(){
    const np = document.getElementById("newPass").value.trim();
    if(!np){ alert("Entre un nouveau mot de passe."); return; }
    setPass(np);
    alert("Mot de passe mis à jour.");
    document.getElementById("newPass").value="";
  }

  // Auto-show panel si déjà loggé (optionnel simple : on ne garde pas de session)
  return { checkPass, save, reset, changePass };
})();
