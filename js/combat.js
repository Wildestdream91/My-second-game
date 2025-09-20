/* ================================
   Idle ARPG v7.2 FR - combat.js
   Combats fiables + actes/zones + difficulté
   ================================ */

// ---------- Difficulté ----------
const DIFFICULTIES = {
  "Facile":    { hp:0.8,  dmg:0.8,  def:0.9,  xp:1.0,  gold:1.0 },
  "Normal":    { hp:1.0,  dmg:1.0,  def:1.0,  xp:1.0,  gold:1.0 },
  "Difficile": { hp:1.25, dmg:1.20, def:1.10, xp:1.10, gold:1.10 },
  "Enfer":     { hp:1.6,  dmg:1.50, def:1.25, xp:1.25, gold:1.25 }
};
function D() {
  const d = GameCore?.state?.difficulty || "Normal";
  return DIFFICULTIES[d] || DIFFICULTIES["Normal"];
}
// Init défaut si absent
if (GameCore && !GameCore.state.difficulty) { GameCore.state.difficulty = "Normal"; GameCore.save(); }

const Combat = {
  enemy: null,
  auto: false,
  timer: null,

  // --- Acts & Zones ---
  groups(){
    return [
      { act:1, label:"Acte I — Plaine de Sang", zones:[
        {key:"i1", name:"Campement des Rogues", monsters:["Déchu","Chaman déchu","Quill Rat","Zombie"]},
        {key:"i2", name:"Plaine Sanglante", monsters:["Squelette","Corbeau","Sorcier noir","Araignée des cavernes"]},
        {key:"i3", name:"Catacombes", monsters:["Chauve-souris","Crapaud venimeux","Spectre","Squelette mage"]},
        {key:"iBoss", name:"Repaire d’Andariel", monsters:["Andariel"], boss:true}
      ]},
      { act:2, label:"Acte II — Désert de Lut Gholein", zones:[
        {key:"ii1", name:"Oasis de Far Oasis", monsters:["Ver des sables","Scarabée électrique","Momie desséchée"]},
        {key:"ii2", name:"Égouts de Lut Gholein", monsters:["Squelette du désert","Zombie desséché","Spectre du désert"]},
        {key:"ii3", name:"Canyon des Magi", monsters:["Guerrier momifié","Serpent","Sorcier de sable"]},
        {key:"iiBoss", name:"Tombe de Tal Rasha (Duriel)", monsters:["Duriel"], boss:true}
      ]},
      { act:3, label:"Acte III — Jungle de Kurast", zones:[
        {key:"iii1", name:"Jungle des araignées", monsters:["Araignée venimeuse","Fétiche","Grenouille empoisonnée"]},
        {key:"iii2", name:"Bas-Kurast", monsters:["Petit démon","Grand démon","Vampire"]},
        {key:"iii3", name:"Temple de Kurast", monsters:["Sorcier vampire","Homme-bête","Chauve-souris géante"]},
        {key:"iiiBoss", name:"Sanctuaire de Méphisto", monsters:["Méphisto"], boss:true}
      ]},
      { act:4, label:"Acte IV — Enfers", zones:[
        {key:"iv1", name:"Plaines du Désespoir", monsters:["Chevalier de l’enfer","Spectre ardent","Succube"]},
        {key:"iv2", name:"Rivière de Flammes", monsters:["Balrog mineur","Chien de l’enfer","Vampire de l’enfer"]},
        {key:"iv3", name:"Sanctuaire du Chaos", monsters:["Démon majeur","Spectre corrompu","Diablotin"]},
        {key:"ivBoss", name:"Affrontement avec Diablo", monsters:["Diablo"], boss:true}
      ]},
      { act:5, label:"Acte V — Mont Arreat", zones:[
        {key:"v1", name:"Plateau des Hurlants", monsters:["Barbare corrompu","Sorcier corrompu","Zombie gelé"]},
        {key:"v2", name:"Glacier Arreat", monsters:["Spectre de glace","Chien gelé","Succube du givre"]},
        {key:"v3", name:"Salle des Anciens", monsters:["Balrog gelé","Esprit glacial","Guerrier corrompu"]},
        {key:"vBoss", name:"Baal, Seigneur de la Destruction", monsters:["Baal"], boss:true}
      ]}
    ];
  },

  // Déblocage actes (style D2 simplifié)
  lockInfo(state){
    return {
      req:{2:12,3:20,4:30,5:40},
      access:{
        1:true,
        2:(state.level>=12 && state.bossesDefeated.Andariel),
        3:(state.level>=20 && state.bossesDefeated.Duriel),
        4:(state.level>=30 && state.bossesDefeated.Méphisto),
        5:(state.level>=40 && state.bossesDefeated.Diablo)
      }
    };
  },

  // --- Utils ---
  findZone(zoneKey){
    for(const g of this.groups()){
      const z = g.zones.find(z=>z.key===zoneKey);
      if(z) return {group:g, zone:z};
    }
    return null;
  },

  // --- Rencontre ---
  newEncounter(zoneKey){
    const f = this.findZone(zoneKey);
    if(!f){ GameCore.log("Zone invalide."); return; }
    const {group, zone} = f;
    const act = group.act;

    // Base stats par acte
    const baseLvl  = act*5 + Math.floor(Math.random()*5);
    const baseHP   = 35 + act*28 + Math.floor(Math.random()*10);
    const baseDef  = 4*act + Math.floor(Math.random()*3);
    const faces    = 6 + act*4;

    // Applique difficulté
    const hpMax = Math.max(1, Math.floor(baseHP * D().hp));
    const def   = Math.max(0, Math.floor(baseDef * D().def));
    const name  = zone.monsters[Math.floor(Math.random()*zone.monsters.length)];

    this.enemy = {
      name,
      level: baseLvl,
      hp: hpMax,
      hpMax: hpMax,
      def: def,
      dice: [1, Math.max(2, Math.floor(faces))],
      boss: zone.boss || ["Andariel","Duriel","Méphisto","Diablo","Baal"].includes(name),
      act
    };

    // UI
    const card = document.getElementById("enemyCard");
    if(card) card.hidden = false;
    this._uiEnemySync();
    GameCore.log(`⚔️ Un ${this.enemy.name} apparaît dans ${zone.name} !`);
    GameCore.save();
  },

  _uiEnemySync(){
    const e = this.enemy; if(!e) return;
    const qs = (id)=>document.getElementById(id);
    if(qs("eName")) qs("eName").textContent = e.name;
    if(qs("eLvl")) qs("eLvl").textContent = e.level;
    if(qs("eHP")) qs("eHP").textContent = e.hp;
    if(qs("eHPmax")) qs("eHPmax").textContent = e.hpMax;
    if(qs("eDef")) qs("eDef").textContent = e.def;
    if(qs("eDice")) qs("eDice").textContent = `${e.dice[0]}d${e.dice[1]}`;
    const bar = document.getElementById("eHpBar");
    if(bar){ bar.max = e.hpMax; bar.value = e.hp; }
    const ec = document.getElementById("enemyCard");
    if(ec) ec.classList.toggle("bossFight", !!e.boss);
  },

  // --- Combat ---
  rollDice(nb,faces){
    let sum=0;
    for(let i=0;i<nb;i++) sum += 1 + Math.floor(Math.random()*faces);
    return sum;
  },

  attack(){
    if(!this.enemy) return;
    const s = GameCore.state;
    const e = this.enemy;

    // 1) Dégâts joueur -> ennemi
    const baseRoll = this.rollDice(1, 6);
    const atk = GameCore.atkTotal();
    let playerDmg = baseRoll + Math.floor(atk*1.0);   // un peu plus punchy
    const isCrit = Math.random() < (GameCore.critTotal()/100);
    if(isCrit) playerDmg = Math.floor(playerDmg*2);
    // réduction par DEF ennemie (douce)
    playerDmg = Math.max(1, playerDmg - Math.floor(e.def/8));

    e.hp -= playerDmg;
    if (e.hp < 0) e.hp = 0;
    this._uiEnemySync();

    GameCore.log(`Vous infligez ${playerDmg}${isCrit?" (CRIT)":""} dmg.`);

    // 1-bis) Vérif mort ennemie (garde immédiate)
    if (e.hp <= 0) {
      this._handleEnemyDeath(); // évite les cas "hp=0 mais pas mort"
      return; // on quitte avant l'attaque ennemie
    }

    // 2) Dégâts ennemi -> joueur
    let enemyRaw = this.rollDice(e.dice[0], e.dice[1]) + (e.act*2);
    enemyRaw = Math.floor(enemyRaw * D().dmg); // difficulté
    const def = GameCore.defTotal();
    const enemyDmg = Math.max(1, enemyRaw - Math.floor(def/10));
    s.hp -= enemyDmg;
    if (s.hp < 0) s.hp = 0;

    // UI joueur
    const f = (id)=>document.getElementById(id);
    if(f("barHpFill")) f("barHpFill").style.width = (s.hp/s.hpMax*100)+"%";
    if(f("barHpText")) f("barHpText").textContent = `HP ${s.hp}/${s.hpMax}`;

    GameCore.log(`L’ennemi inflige ${enemyDmg} dmg.`);

    // 2-bis) Vérif mort joueur
    if (s.hp <= 0) {
      GameCore.log("☠️ Vous êtes mort ! Retour au campement (-20 or).");
      s.hp = s.hpMax; s.mana = s.manaMax; s.gold = Math.max(0, s.gold-20);
      this.enemy = null;
      const card = document.getElementById("enemyCard"); if(card) card.hidden = true;
      GameCore.save();
      return;
    }

    GameCore.save();
  },

  // Gestion de la mort de l’ennemi (séparée pour être appelée à plusieurs endroits)
  _handleEnemyDeath(){
    if (!this.enemy) return; // déjà nettoyé
    // Double garde: si quelqu’un veut encore attaquer alors que hp<=0
    if (this.enemy.hp > 0) return;
    this.victory();
  },

  victory(){
    const e = this.enemy; if(!e) return; // garde
    const act = e.act;

    // Récompenses (scaling + difficulté)
    const baseXP = 10 + act*7 + Math.floor(e.level/2);
    const baseGold = 5 + act*4 + Math.floor(e.level/3);
    const xpGain = Math.floor((e.boss ? baseXP*5 : baseXP) * D().xp);
    const goldGain = Math.floor((e.boss ? baseGold*4 : baseGold) * D().gold);

    GameCore.addXP(xpGain);
    GameCore.addGold(goldGain);
    GameCore.log(`🏆 ${e.name} vaincu ! +${xpGain} XP, +${goldGain} or.`);

    // Progression boss
    if(e.boss && ["Andariel","Duriel","Méphisto","Diablo","Baal"].includes(e.name)){
      GameCore.state.bossesDefeated[e.name] = true;
      GameCore.log(`🔥 ${e.name} est tombé ! L’acte suivant est débloqué.`);
    }

    // Loot (si Loot est chargé)
    try {
      if (typeof Loot !== "undefined" && Loot.generateLoot) {
        const mf = GameCore.mfTotal ? GameCore.mfTotal() : 0;
        Loot.generateLoot(mf, {act, boss: !!e.boss});
        if (Loot.renderInventory && document.getElementById("inventoryGrid")) {
          Loot.renderInventory();
        }
      }
    } catch(err){ console.warn("Loot error:", err); }

    // Fin de combat
    this.enemy = null;
    const card = document.getElementById("enemyCard"); if(card) card.hidden = true;

    if (GameCore.uiRefreshStatsIfPresent) GameCore.uiRefreshStatsIfPresent();
    GameCore.save();
  },

  // --- Auto-combat ---
  toggleAuto(val){
    this.auto = val;
    if(val){
      if(this.timer) clearInterval(this.timer);
      this.timer = setInterval(()=>this.attack(), 1700);
      GameCore.log("🌀 Auto-combat activé.");
    } else {
      clearInterval(this.timer);
      this.timer = null;
      GameCore.log("⛔ Auto-combat désactivé.");
    }
    GameCore.save();
  },

  // --- UI actes/zones ---
  populateZonesForAct(act){
    const group = this.groups().find(g=>g.act===act);
    const zoneSelect = document.getElementById("zoneSelect");
    if(!group || !zoneSelect) return;
    zoneSelect.innerHTML = "";
    for(const z of group.zones){
      const opt = document.createElement("option");
      opt.value = z.key;
      opt.textContent = z.name;
      zoneSelect.appendChild(opt);
    }
  },

  renderActMap(){
    const map = document.getElementById("actMap");
    if(!map) return;
    map.innerHTML = "";
    const li = this.lockInfo(GameCore.state);
    for(const g of this.groups()){
      const div = document.createElement("div");
      div.className = "actIcon";
      div.textContent = g.act;
      if(!li.access[g.act]) div.classList.add("locked");
      else div.classList.add("unlocked");
      div.onclick = ()=>{
        if(!li.access[g.act]) return;
        this.populateZonesForAct(g.act);
      };
      map.appendChild(div);
    }
  },

  // --- Init UI ---
  initUI(renderPlayer){
    this.renderActMap();
    this.populateZonesForAct(1);

    const attackBtn = document.getElementById("attackBtn");
    if(attackBtn) attackBtn.onclick = ()=>this.attack();

    const fleeBtn = document.getElementById("fleeBtn");
    if(fleeBtn) fleeBtn.onclick = ()=>{
      GameCore.log("🏃 Vous fuyez !");
      this.enemy = null;
      const card = document.getElementById("enemyCard"); if(card) card.hidden = true;
      GameCore.save();
    };

    const newEnc = document.getElementById("newEncounter");
    if(newEnc) newEnc.onclick = ()=>{
      const z = document.getElementById("zoneSelect")?.value;
      if(!z){ GameCore.log("Choisissez une zone."); return; }
      this.newEncounter(z);
      if (typeof renderPlayer === "function") renderPlayer();
      if (GameCore.uiRefreshStatsIfPresent) GameCore.uiRefreshStatsIfPresent();
    };

    const autoT = document.getElementById("autoToggle");
    if(autoT) autoT.onchange = (e)=>this.toggleAuto(e.target.checked);

    // Diff (si présent dans la page)
    const diffSel = document.getElementById("diffSelect");
    if (diffSel){
      diffSel.value = GameCore.state.difficulty || "Normal";
      diffSel.onchange = ()=>{
        GameCore.state.difficulty = diffSel.value;
        GameCore.save();
        GameCore.log(`⚙️ Difficulté: ${diffSel.value}`);
      };
    }

    if (typeof renderPlayer === "function") renderPlayer();
    if (GameCore.uiRefreshStatsIfPresent) GameCore.uiRefreshStatsIfPresent();
  }
};
