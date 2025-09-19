// --- Initialisation personnage ---
const classes = {
  Guerrier: { hp:150, str:2, dex:1, wil:1 },
  Arcaniste: { hp:100, str:1, dex:1, wil:3 },
  Rodeur: { hp:120, str:1, dex:3, wil:1 }
};

let pseudo = prompt("Choisis un pseudo pour ton héros :");
let chosenClass = prompt("Choisis une classe (Guerrier, Arcaniste, Rodeur):");
if(!classes[chosenClass]) chosenClass="Guerrier";

const state = {
  name: pseudo, cls: chosenClass,
  level:1, xp:0,
  statPoints:0, skillPoints:0,
  stats:{str:classes[chosenClass].str,dex:classes[chosenClass].dex,wil:classes[chosenClass].wil},
  skills:{arcane:0,aura:0},
  maxHp: classes[chosenClass].hp,
  hp: classes[chosenClass].hp,
  running:false, zone:"meadow", lastTick:0,
  inventory:[], equipped:null, lootTimer:0
};

// --- XP ---
function xpToNext(level){ return Math.floor(60 * Math.pow(level,1.6)); }

function computeXPps(){
  let base = (state.zone==="crypt"?5: state.zone==="sanctum"?10:2);
  let mult = 1 + 0.03*state.stats.str + 0.02*state.stats.wil + 0.01*state.skills.arcane + 0.005*state.skills.aura;
  if(state.equipped && state.equipped.type==="xp"){ mult += state.equipped.value; }
  return base * mult;
}

// --- Dés pour les dégâts ennemis ---
function rollDamage(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

function enemyAttack(){
  if(state.zone==="meadow") return rollDamage(1,3);
  if(state.zone==="crypt") return rollDamage(1,6);
  if(state.zone==="sanctum") return rollDamage(2,12);
  return 0;
}

// --- Loot table ---
const lootTable = [
  { rarity:"Commun", chance:70, bonus:0.05 },
  { rarity:"Rare", chance:25, bonus:0.15 },
  { rarity:"Unique", chance:5, bonus:0.30 }
];

function randomLoot(){
  let roll=Math.random()*100, cumulative=0;
  for(let entry of lootTable){
    cumulative+=entry.chance;
    if(roll<=cumulative){
      const item={ name:entry.rarity+" Amulette", type:"xp", value:entry.bonus, rarity:entry.rarity };
      state.inventory.push(item);
      log("Loot : "+item.name+" (+"+(item.value*100).toFixed(0)+"% XP/s)");
      updateInventory();
      return;
    }
  }
}

function updateInventory(){
  const invDiv=document.getElementById("inventory");
  invDiv.innerHTML="";
  state.inventory.forEach((item)=>{
    const btn=document.createElement("button");
    btn.textContent=item.name;
    btn.onclick=()=>{ state.equipped=item; document.getElementById("equipped").textContent="Équipé : "+item.name; updateUI(); };
    invDiv.appendChild(btn);
  });
}

// --- UI ---
function updateUI(){
  document.getElementById("charName").textContent=state.name;
  document.getElementById("charClass").textContent=state.cls;
  document.getElementById("hp").textContent=Math.max(0,Math.floor(state.hp));
  document.getElementById("maxHp").textContent=state.maxHp;
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
  state.maxHp+=10; state.hp=state.maxHp;
  log("Niveau "+state.level+" atteint !");
}

function gameOver(){
  state.running=false;
  log("💀 "+state.name+" est mort en "+state.zone+" ! Retour au camp.");
  state.hp=state.maxHp;
  state.xp=0;
}

// --- Journal ---
function log(msg){
  const logBox=document.getElementById("log");
  logBox.textContent+=`\n${new Date().toLocaleTimeString()} — ${msg}`;
  logBox.scrollTop=logBox.scrollHeight;
}

// --- Boucle principale ---
function tick(dt){
  if(!state.running) return;

  // Attaque ennemie aléatoire
  state.hp -= enemyAttack()*dt;
  if(state.hp<=0){ gameOver(); updateUI(); return; }

  // XP
  state.xp += computeXPps()*dt;
  if(state.xp>=xpToNext(state.level)){ levelUp(); }

  // Loot toutes les ~20s
  state.lootTimer += dt;
  if(state.lootTimer>=20){
    randomLoot();
    state.lootTimer=0;
  }

  updateUI();
}

function loop(ts){
  if(!state.lastTick) state.lastTick=ts;
  const dt=Math.min(1,(ts-state.lastTick)/1000);
  state.lastTick=ts; tick(dt);
  requestAnimationFrame(loop);
}

// --- Boutons ---
document.getElementById("start").onclick=()=>{state.running=true; log("Run lancé");};
document.getElementById("stop").onclick=()=>{state.running=false; log("Run stoppé");};
document.getElementById("reset").onclick=()=>{
  state.level=1; state.xp=0; state.statPoints=0; state.skillPoints=0;
  state.stats={str:classes[state.cls].str,dex:classes[state.cls].dex,wil:classes[state.cls].wil};
  state.skills={arcane:0,aura:0};
  state.maxHp=classes[state.cls].hp; state.hp=state.maxHp;
  state.inventory=[]; state.equipped=null; state.running=false;
  document.getElementById("inventory").innerHTML="";
  document.getElementById("equipped").textContent="Aucun objet équipé";
  log("Reset progression"); updateUI();
};

document.getElementById("addStr").onclick=()=>{if(state.statPoints>0){state.statPoints--;state.stats.str++;updateUI();}};
document.getElementById("addDex").onclick=()=>{if(state.statPoints>0){state.statPoints--;state.stats.dex++;updateUI();}};
document.getElementById("addWil").onclick=()=>{if(state.statPoints>0){state.statPoints--;state.stats.wil++;state.maxHp+=5;updateUI();}};
document.getElementById("addArcane").onclick=()=>{if(state.skillPoints>0){state.skillPoints--;state.skills.arcane++;updateUI();}};
document.getElementById("addAura").onclick=()=>{if(state.skillPoints>0){state.skillPoints--;state.skills.aura++;updateUI();}};

document.getElementById("zone").onchange=e=>{state.zone=e.target.value; updateUI();};

// --- Start ---
updateUI(); requestAnimationFrame(loop);
