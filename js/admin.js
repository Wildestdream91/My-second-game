/* admin.js — panneau d’admin simple (front-only) */
const Admin = {
  // Clé localStorage
  KEY_CFG: "idleARPG_config",
  KEY_PW:  "idleARPG_admin_pw",

  // Connexion
  checkPass(){
    const pwInput = document.getElementById("adminPass").value;
    const stored = localStorage.getItem(this.KEY_PW) || "admin";
    if(pwInput === stored){
      document.getElementById("loginBox").style.display="none";
      document.getElementById("adminPanel").style.display="block";
      this.load();
    } else {
      document.getElementById("loginMsg").textContent = "⛔ Mot de passe incorrect.";
    }
  },

  // Charger les valeurs dans le formulaire
  load(){
    const cfg = JSON.parse(localStorage.getItem(this.KEY_CFG) || "{}");
    document.getElementById("xpRate").value   = cfg.xpRate   ?? 100;
    document.getElementById("goldRate").value = cfg.goldRate ?? 100;
    document.getElementById("dropRate").value = cfg.dropRate ?? 100;
    document.getElementById("mfRate").value   = cfg.mfRate   ?? 0;
  },

  // Sauvegarder les valeurs saisies
  save(){
    const cfg = {
      xpRate:   parseInt(document.getElementById("xpRate").value,10)   || 100,
      goldRate: parseInt(document.getElementById("goldRate").value,10) || 100,
      dropRate: parseInt(document.getElementById("dropRate").value,10) || 100,
      mfRate:   parseInt(document.getElementById("mfRate").value,10)   || 0
    };
    localStorage.setItem(this.KEY_CFG, JSON.stringify(cfg));
    document.getElementById("saveMsg").textContent = "✅ Paramètres enregistrés.";
    setTimeout(()=>{document.getElementById("saveMsg").textContent="";}, 1500);
  },

  // Reset aux valeurs par défaut
  reset(){
    localStorage.removeItem(this.KEY_CFG);
    this.load();
    document.getElementById("saveMsg").textContent = "♻️ Réinitialisé.";
    setTimeout(()=>{document.getElementById("saveMsg").textContent="";}, 1500);
  },

  // Changer le mot de passe
  changePass(){
    const npw = document.getElementById("newPass").value.trim();
    if(!npw){ alert("Veuillez entrer un nouveau mot de passe."); return; }
    localStorage.setItem(this.KEY_PW, npw);
    document.getElementById("newPass").value="";
    document.getElementById("saveMsg").textContent = "🔒 Mot de passe mis à jour.";
    setTimeout(()=>{document.getElementById("saveMsg").textContent="";}, 1500);
  }
};
