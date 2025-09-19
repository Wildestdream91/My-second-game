const state = {
  level: 1, xp: 0,
  statPoints: 0, skillPoints: 0,
  stats: {str:0,dex:0,wil:0},
  skills: {arcane:0,aura:0},
  running: false, zone: "meadow",
  lastTick: 0
};

// Courbe simple (tu pourras remplacer par une table JSON plus tard)
function xpToNext(level){ return Math.floor(60 * Math.pow(level,1.6)); }

function computeXPps(){
  let base = (state.zone==="crypt"?5: state.zone==="sanctum"?10:2);
  let mult = 1 + 0.03*state.stats.str + 0.02*state.stats.wil + 0.01*state.skills.arcane + 0.005*state.skills.aura;
  return base * mult;
}

function updateUI(){
  document.getElementById("level").textContent=state.level;
  document.getElementById("xp").textContent=Math.floor(state.xp);
  document.getElementById("xpToNext").textContent=xpToNext(state.level);
  document.getElementById("xpBar").max=xpToNext(state.level);
  document.getElementById("xpBar").value=state.xp;

  document.getElementById("statPoints").textContent=state.statPoints;
  document.getElementById("skillPoints").textContent=state.skillPoints;
  document.getElementById("strVal").textContent=state.stats.str;
  document.getElementById("dexVal").textContent=state.stats.dex;
  document.getElementById("wilVal").textContent=state.stats.wil;
  document.getElementById("skArcane").textContent=state.skills.arcane;
  document.getElementById("skAura").textContent=state.skills.aura;
  document.getElementById("zone").value=state.zone;

  document.getElementById("xpps").textContent=computeXPps().toFixed(2);
}

function levelUp(){
  state.level++; state.xp=0; state.statPoints++; state.skillPoints++;
  log("Niveau "+state.level+" atteint !");
}

function log(msg){
  const logBox=document.getElementById("log");
  logBox.textContent+=`\n${new Date().toLocaleTimeString()} — ${msg}`;
  logBox.scrollTop=logBox.scrollHeight;
}

function tick(dt){
  if(!state.running) return;
  state.xp += computeXPps()*dt;
  if(state.xp>=xpToNext(state.level)){ levelUp(); }
  updateUI();
}

function loop(ts){
  if(!state.lastTick) state.lastTick=ts;
  const dt=Math.min(1,(ts-state.lastTick)/1000);
  state.lastTick=ts;
  tick(dt);
  requestAnimationFrame(loop);
}

// UI handlers
document.getElementById("start").onclick=()=>{state.running=true; log("Run démarré");};
document.getElementById("stop").onclick=()=>{state.running=false; log("Run stoppé");};
document.getElementById("reset").onclick=()=>{
  Object.assign(state,{
    level:1,xp:0,statPoints:0,skillPoints:0,
    stats:{str:0,dex:0,wil:0},skills:{arcane:0,aura:0},
    zone:"meadow",running:false
  });
  log("Reset progression"); updateUI();
};

document.getElementById("addStr").onclick=()=>{ if(state.statPoints>0){state.statPoints--;state.stats.str++;updateUI();} };
document.getElementById("addDex").onclick=()=>{ if(state.statPoints>0){state.statPoints--;state.stats.dex++;updateUI();} };
document.getElementById("addWil").onclick=()=>{ if(state.statPoints>0){state.statPoints--;state.stats.wil++;updateUI();} };
document.getElementById("addArcane").onclick=()=>{ if(state.skillPoints>0){state.skillPoints--;state.skills.arcane++;updateUI();} };
document.getElementById("addAura").onclick=()=>{ if(state.skillPoints>0){state.skillPoints--;state.skills.aura++;updateUI();} };

document.getElementById("zone").onchange=e=>{ state.zone=e.target.value; updateUI(); };

// Go
updateUI();
requestAnimationFrame(loop);