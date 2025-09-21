/* ==========================================
   Idle ARPG v7.5 FR - runs.js
   - Continue même si tu changes de page
   - Persiste dans localStorage
   - Reprise + fast-forward
   - Journal auto-live déjà géré par core.js
   ========================================== */

const Runs={
  active:null,timer:null,lootPatched:null,STORAGE_KEY:"idleARPG_run_state",
  presets:[
    {key:"trist",label:"Run Tristram (1–15)",act:1,zoneKey:"i3",attackEveryMs:900,noLoot:true,xpBonusMul:1.15},
    {key:"tombs",label:"Run Tombs (15–24)",act:2,zoneKey:"ii3",attackEveryMs:900,noLoot:true,xpBonusMul:1.25},
    {key:"baal",label:"Run Baal (25+)",act:5,zoneKey:"vBoss",attackEveryMs:950,noLoot:false,xpBonusMul:1.35}
  ],
  start(pkey){
    if(this.active){GameCore.log("Un run est déjà en cours.");return;}
    const p=this.presets.find(x=>x.key===pkey); if(!p){GameCore.log("Preset introuvable.");return;}
    const li=Combat.lockInfo(GameCore.state);
    if(!li.access[p.act]){GameCore.log(`🔒 Acte ${p.act} non dispo.`);return;}
    this.active={...p,fights:0,kills:0,deaths:0,xpRawAwarded:0,gold:0,since:Date.now(),lastTick:Date.now()};
    this._persist(); this._patchLoot(); this._patchVictory(); this._loopStart();
    GameCore.log(`🚀 ${p.label} démarré.`); this.renderUI();
  },
  stop(){
    if(!this.active)return; this._loopStop(); this._unpatchLoot(); const r=this.active; this.active=null; this._persist(); this.renderUI();
    const mins=Math.max(1,Math.round((Date.now()-r.since)/60000));
    GameCore.log(`✅ Fin du run: ${r.label}`);
    GameCore.log(`• Kills:${r.kills} • Fights:${r.fights} • Or:+${r.gold} • Durée:${mins}m`);
  },
  bootstrap(){
    const saved=this._load(); if(saved){this.active=saved;this._patchLoot();this._patchVictory();this._fastForward();this._loopStart();}
    this.renderUI();
  },
  _loopStart(){
    if(!this.active)return;
    if(Combat.auto) Combat.toggleAuto(false);
    if(!Combat.enemy) Combat.newEncounter(this.active.zoneKey);
    this._loopStop();
    const pace=Math.max(400,this.active.attackEveryMs||900);
    this.timer=setInterval(()=>this._tick(pace),pace);
  },
  _loopStop(){if(this.timer){clearInterval(this.timer);this.timer=null;}},
  _tick(pace){
    if(!this.active)return;
    if(!Combat.enemy){Combat.newEncounter(this.active.zoneKey);this.active.fights++;this.active.lastTick=Date.now();this._persist();this.renderUI();return;}
    Combat.attack(); this.active.lastTick=Date.now();this._persist();this.renderUI();
  },
  _fastForward(){
    if(!this.active)return; const pace=Math.max(400,this.active.attackEveryMs||900);
    const now=Date.now(); let ticks=Math.floor((now-(this.active.lastTick||now))/pace);
    if(ticks<=0)return; ticks=Math.min(ticks,500);
    for(let i=0;i<ticks;i++){ if(!Combat.enemy){Combat.newEncounter(this.active.zoneKey);this.active.fights++;} else {Combat.attack();} }
    this.active.lastTick=now; this._persist();
  },
  _patchLoot(){ if(!this.active?.noLoot)return; if(typeof Loot==="undefined"||!Loot.generateLoot)return; if(this.lootPatched)return;
    this.lootPatched=Loot.generateLoot; Loot.generateLoot=function(){return null;}; GameCore.log("📦 Loot OFF pendant ce run."); },
  _unpatchLoot(){ if(this.lootPatched&&typeof Loot!=="undefined"){Loot.generateLoot=this.lootPatched;this.lootPatched=null;GameCore.log("📦 Loot ON.");} },
  _patchVictory(){ if(this._victoryPatched)return; const orig=Combat.victory.bind(Combat); const self=this;
    Combat.victory=function(){const snap=this.enemy?{...this.enemy}:null;orig();if(snap)self._onVictorySnap(snap);}; this._victoryPatched=true; },
  _onVictorySnap(e){
    if(!this.active)return; this.active.kills++;
    const act=e.act||1, baseXP=Math.round(12+act*8+e.level*0.9);
    const extraRaw=Math.floor(baseXP*(e.boss?6:1)*D().xp*((this.active.xpBonusMul||1)-1));
    if(extraRaw>0){this.active.xpRawAwarded+=extraRaw;GameCore.addXP(extraRaw);}
  },
  renderUI(){
    const box=document.getElementById("runsBox"),btns=document.getElementById("runsButtons"),stop=document.getElementById("runsStop");
    if(!box||!btns||!stop)return;
    if(!this.active){box.innerHTML="<div class='muted'>Aucun run</div>";btns.classList.remove("disabled");stop.disabled=true;return;}
    const r=this.active,elapsed=Math.max(1,Math.round((Date.now()-r.since)/1000));
    box.innerHTML=`<div><b>${r.label}</b></div><div>Fights:${r.fights} • Kills:${r.kills}</div><div>XP bonus brut:${r.xpRawAwarded}</div><div>Temps:${Math.floor(elapsed/60)}m${elapsed%60}s</div>`;
    btns.classList.add("disabled");stop.disabled=false;
  },
  initUI(){
    const btns=document.getElementById("runsButtons"),stop=document.getElementById("runsStop");
    if(btns){btns.innerHTML="";this.presets.forEach(p=>{const b=document.createElement("button");b.className="btn";b.textContent=p.label;b.onclick=()=>this.start(p.key);btns.appendChild(b);});}
    if(stop)stop.onclick=()=>this.stop(); this.renderUI();
  },
  _persist(){try{localStorage.setItem(this.STORAGE_KEY,JSON.stringify(this.active));}catch(_){ }},
  _load(){try{const raw=localStorage.getItem(this.STORAGE_KEY);if(raw)return JSON.parse(raw);}catch(_){ }return null;}
};
