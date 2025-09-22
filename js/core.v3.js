/* core.v3.js — progression, boss gates, acts */
var GameCore = {
  __version: "v3",
  state: null,

  // Table XP 1→99
  xpTable: (() => { const arr=[0]; for(let i=1;i<=99;i++){ const base=Math.pow(i,2.12)*100; arr[i]=Math.floor(base);} return arr; })(),

  save(){
    try{
      localStorage.setItem("idleARPG_state", JSON.stringify(this.state));
      const back = localStorage.getItem("idleARPG_state");
      if(!back) throw new Error("write_check_failed");
    }catch(e){
      alert("⚠️ Impossible d’enregistrer la partie (localStorage). Active le stockage local pour ce site.");
      console.error("Save error:", e);
    }
  },

  log(msg){
    if(!this.state) return;
    const L = this.state.log || (this.state.log=[]);
    L.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if(L.length>500) L.splice(0, L.length-500);
    try{
      const el = document.getElementById("log");
      if(el) el.innerHTML = L.slice(-200).map(l=>`<div>${l}</div>`).join('');
    }catch(_){}
  },

  migrateState(s){
    if(!s.__version) s.__version = "v2";
    if(!s.progress){
      s.progress = {
        bosses:{},
        actCleared:{A1:false,A2:false,A3:false,A4:false,A5:false},
        currentAct:"A1"
      };
    }else{
      if(!s.progress.bosses) s.progress.bosses = {};
      if(!s.progress.actCleared) s.progress.actCleared = {A1:false,A2:false,A3:false,A4:false,A5:false};
      if(!s.progress.currentAct) s.progress.currentAct = "A1";
    }
    s.__version = "v3";
    return s;
  },

  createNewGame(name, klass){
    const preset = (this.classPresets[klass] || this.classPresets['Barbare']);
    this.state = {
      __version:this.__version,
      name, klass,
      level:1, xp:0, gold:0,
      str:preset.str, dex:preset.dex, vit:preset.vit, ene:preset.ene,
      statPts:0,
      hpMax:preset.hp, manaMax:preset.mana,
      hp:preset.hp, mana:preset.mana,
      currentZone:"A1-WP1",
      inv:[], equip:{}, log:[],
      progress:{
        bosses:{},
        actCleared:{A1:false,A2:false,A3:false,A4:false,A5:false},
        currentAct:"A1"
      },
      __createdAt: Date.now()
    };
    this.save();
  },

  load(){
    try{
      const raw = localStorage.getItem("idleARPG_state");
      if(!raw){ this.state=null; return null; }
      const obj = JSON.parse(raw);
      this.state = this.migrateState(obj);
      if(!this.state.log) this.state.log=[];
      if(typeof this.state.hp!=="number") this.state.hp = Math.max(1, this.state.hpMax||1);
      if(typeof this.state.mana!=="number") this.state.mana = Math.max(0, this.state.manaMax||0);
      return this.state;
    }catch(e){
      console.error("Load error, clearing corrupted state:", e);
      localStorage.removeItem("idleARPG_state");
      this.state=null; return null;
    }
  },
  ensureGameOrRedirect(url){ const ok=this.load(); if(!ok){ location.href=url; } },

  getConfig(){ try{ return JSON.parse(localStorage.getItem("idleARPG_config")||"{}"); }catch{ return {}; } },

  classPresets:{
    "Barbare":       { str:9, dex:4, vit:7, ene:3, hp:60, mana:18 },
    "Sorcieres":     { str:3, dex:5, vit:4, ene:11, hp:40, mana:34 },
    "Paladin":       { str:7, dex:6, vit:7, ene:5, hp:55, mana:24 },
    "Necromancien":  { str:3, dex:4, vit:5, ene:13, hp:42, mana:36 },
    "Amazone":       { str:5, dex:9, vit:5, ene:6, hp:48, mana:26 },
    "Assassin":      { str:6, dex:8, vit:5, ene:6, hp:48, mana:26 },
    "Druide":        { str:6, dex:4, vit:8, ene:6, hp:58, mana:22 },
  },

  atkTotal(){
    const s=this.state;
    const base = Math.floor(s.str*1.2 + s.dex*0.8 + s.level*0.6);
    const eq = 0;
    return base + eq;
  },
  defTotal(){
    const s=this.state;
    const base = Math.floor(s.dex*0.9 + s.vit*1.1 + s.level*0.4);
    const eq = 0;
    return base + eq;
  },
  critTotal(){
    const s=this.state;
    const base = Math.min(50, Math.floor(s.dex*0.3 + s.level*0.2));
    const eq = 0;
    return base + eq;
  },
  mfTotal(){
    const eq=0; const cfg=this.getConfig(); return (eq + (cfg.mfRate||0));
  },

  recalcVitals(full=false){
    const s=this.state;
    const bHp = 30 + s.vit*6 + s.level*5;
    const bMp = 10 + s.ene*5 + s.level*3;
    s.hpMax = bHp; s.manaMax = bMp;
    if(full){ s.hp=s.hpMax; if(s.mana>s.manaMax) s.mana=s.manaMax; }
  },

  addXP(raw){
    const s=this.state; if(!s) return;
    s.xp += Math.max(0, Math.floor(raw));

    let leveled = false;
    while(s.level<99 && s.xp>=this.xpTable[s.level]){
      s.xp -= this.xpTable[s.level];
      s.level++;
      s.statPts+=5;
      leveled = true;
      this.log(`🎉 Niveau ${s.level} (+5 pts)`);
      this.recalcVitals(true);
    }
    if(leveled){
      this.initSFX && this.initSFX();
      this.playSFX && this.playSFX("level");
      try{
        const bar = document.querySelector('.bar.xp');
        if(bar){ bar.classList.add('levelup'); setTimeout(()=>bar.classList.remove('levelup'), 500); }
      }catch(_){}
    }
    this.save();
  },
  addGold(a){ this.state.gold += Math.max(0,Math.floor(a||0)); this.save(); },

  spendStatPoint(stat){
    const s=this.state; if(!s || s.statPts<=0) return;
    if(!["str","dex","vit","ene"].includes(stat)) return;
    s[stat]++; s.statPts--; this.recalcVitals(); this.save();
  },

  // ==== Progression, acts & boss gates ====
  getActByZoneId(zoneId){
    if(!window.Zones) return null;
    return Zones.getActByZoneId(zoneId);
  },

  getActBossForZone(zoneId){
    const z = window.Zones && Zones.getZone(zoneId);
    if(!z || !z.actBoss) return null;
    const act = this.getActByZoneId(zoneId);
    if(!act) return null;
    return { actId: act.id, bossId: z.bossId };
  },

  canTravelTo(zoneId){
    const s = this.state; if(!s) return false;
    const act = this.getActByZoneId(zoneId);
    if(!act) return false;

    const currentAct = s.progress.currentAct || "A1";
    if(act.id !== currentAct){
      // passage à l’acte suivant uniquement si acte courant cleared
      const cleared = s.progress.actCleared[currentAct];
      if(!cleared) return false;
    }

    // verrou par boss du waypoint précédent
    const wp = act.waypoints;
    const idx = wp.findIndex(z=>z.id===zoneId);
    if(idx < 0) return false;
    if(idx === 0) return true; // premier WP libre si acte accessible

    const prev = wp[idx-1];
    return !!s.progress.bosses[prev.bossId]; // il faut le boss du WP précédent
  },

  markZoneBossDefeated(zone){
    const s=this.state; if(!s || !zone || !zone.bossId) return;
    if(!s.progress.bosses[zone.bossId]){
      s.progress.bosses[zone.bossId] = true;
      this.log(`🏆 Boss vaincu: ${zone.bossName}`);
    }
    if(zone.actBoss){
      const act = this.getActByZoneId(zone.id);
      if(act && s.progress.actCleared[act.id]===false){
        s.progress.actCleared[act.id] = true;
        this.log(`🎖️ Acte terminé: ${act.name}`);
        // avancer l’acte courant si on est dessus
        if(s.progress.currentAct === act.id){
          const order = ["A1","A2","A3","A4","A5"];
          const i = order.indexOf(act.id);
          if(i>=0 && i<order.length-1){
            s.progress.currentAct = order[i+1];
          }
        }
      }
    }
    this.save();
  },

  getDifficulty(){ return "Normal"; },

  /* === Reset propre === */
  newGame(){
    if (confirm("Supprimer la sauvegarde et recommencer ?")) {
      localStorage.removeItem("idleARPG_state");
      localStorage.removeItem("idleARPG_auto");
      localStorage.removeItem("idleARPG_lastTick");
      location.href = "index.html";
    }
  },

  /* === Export / Import sauvegarde === */
  exportSave(){
    try{
      const data = localStorage.getItem("idleARPG_state") || "{}";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(data);
        alert("Sauvegarde copiée dans le presse-papiers !");
      } else {
        throw new Error("no_clipboard");
      }
    }catch(e){
      console.error(e);
      alert("Impossible de copier automatiquement. Voici la sauvegarde :\n\n"+(localStorage.getItem("idleARPG_state")||"{}"));
    }
  },
  importSave(){
    const json = prompt("Collez la sauvegarde JSON :");
    if(!json) return;
    try{
      const obj = JSON.parse(json);
      localStorage.setItem("idleARPG_state", JSON.stringify(obj));
      alert("Sauvegarde importée !");
      location.reload();
    }catch(e){
      alert("Sauvegarde invalide.");
    }
  },

  /* === SFX minimalistes === */
  _sfx: null,
  initSFX(){
    if(this._sfx) return;
    try{
      this._sfx = {
        hit:   new Audio("sfx/hit.mp3"),
        level: new Audio("sfx/level.mp3")
      };
      this._sfx.hit.volume = this._sfx.level.volume = 0.2;
    }catch(e){ console.warn("SFX off:", e); }
  },
  playSFX(key){
    if(!this._sfx) return;
    const a = this._sfx[key];
    if(a){ try{ a.currentTime = 0; a.play(); }catch(_){} }
  },
};
