/* ================================
   Idle ARPG v7.0 FR - combat.js
   Refonte combats + actes/zones
   ================================ */

const Combat = {
  enemy: null,
  auto: false,
  timer: null,

  // === Acts & Zones (3 zones + 1 boss par acte) ===
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

  // Conditions de déblocage (style D2 simplifié)
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

  /* ---------- Utilitaires ---------- */
  findZone(zoneKey){
    for(const g of this.groups()){
      const z = g.zones.find(z=>z.key===zoneKey);
      if(z) return {group:g, zone:z};
    }
    return null;
  },
  actOfZone(zoneKey){
    const f = this.findZone(zoneKey);
    return f ? f.group.act : 1;
  },

  /* ---------- Rencontre ---------- */
  newEncounter(zoneKey){
    const f = this.findZone(zoneKey);
    if(!f) return;
    const {group, zone} = f;

    const name = zone.monsters[Math.floor(Math.random()*zone.monsters.length)];
    const act = group.act;

    // Échelle de stats par acte
    const eLvl = act*5 + Math.floor(Math.random()*5);
    const eHPmax = 35 + act*28 + Math.floor(Math.random()*10);
    const eDef = 4*act + Math.floor(Math.random()*3);
    const diceFaces = 6 + act*4; // dégâts ennemis bruts

    this.enemy = {
      name,
      level: eLvl,
      hp: eHPmax,
      hpMax: eHPmax,
      def: eDef,
      dice: [1, diceFaces],
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
    const e = this.enemy;
    if(!e) return;
    const qs = (id)=>document.getElementById(id);
    if(qs("eName")) qs("eName").textContent = e.name;
    if(qs("eLvl")) qs("eLvl").textContent = e.level;
    if(qs("eHP")) qs("eHP").textContent = e.hp;
    if(qs("eHPmax")) qs("eHPmax").textContent = e.hpMax;
    if(qs("eDef")) qs("eDef").textContent = e.def;
    if(qs("eDice")) qs("eDice").textContent = `${e.dice[0]}d${e.dice[1]}`;
    if(qs("eHpBar")) { qs("eHpBar").max = e.hpMax; qs("eHpBar").value = e.hp; }
    const ec = document.getElementById("enemyCard");
    if(ec) ec.classList.toggle("bossFight", !!e.boss);
  },

  /* ---------- Combat ---------- */
  rollDice(nb,faces){
    let sum=0;
    for(let i=0;i<nb;i++) sum += 1 + Math.floor(Math.random()*faces);
    return sum;
  },

  attack(){
    if(!this.enemy) return;
    const s = GameCore.state;
    const e = this.enemy;

    // --- dégâts joueur ---
    const baseRoll = this.rollDice(1, 6);
    const atk = GameCore.atkTotal(); // STR + bonus équipement
    let playerDmg = baseRoll + Math.floor(atk*0.8); // base
    // Critique (x2) selon GameCore.critTotal()
    const critChance = GameCore.critTotal()/100;
    const isCrit = Math.random() < critChance;
    if(isCrit) playerDmg = Math.floor(playerDmg*2);

    // Réduction par DEF ennemie (douce)
    playerDmg = Math.max(1, playerDmg - Math.floor(e.def/6));
    e.hp -= playerDmg;
    if(e.hp < 0) e.hp = 0;

    // --- dégâts ennemis ---
    let enemyRaw = this.rollDice(e.dice[0], e.dice[1]) + (e.act*2);
    // Réduction par DEF du joueur, mais minimum 1
    const def = GameCore.defTotal();
    const enemyDmg = Math.max(1, enemyRaw - Math.floor(def/10));
    s.hp -= enemyDmg;
    if(s.hp < 0) s.hp = 0;

    // UI sync
    this._uiEnemySync();
    if(document.getElementById("barHpFill")){
      document.getElementById("barHpFill").style.width = (s.hp/s.hpMax*100)+"%";
      document.getElementById("barHpText").textContent = `HP ${s.hp}/${s.hpMax}`;
    }

    GameCore.log(`Vous infligez ${playerDmg}${isCrit?" (CRIT)":""} dmg. L’ennemi inflige ${enemyDmg} dmg.`);

    if(e.hp <= 0){
      this.victory();
    } else if(s.hp <= 0){
      GameCore.log("☠️ Vous êtes mort ! Retour au campement (-10 or).");
      s.hp = s.hpMax; s.mana = s.manaMax; s.gold = Math.max(0, s.gold-10);
      this.enemy = null;
      const card = document.getElementById("enemyCard"); if(card) card.hidden = true;
      GameCore.save();
    } else {
      GameCore.save();
    }
  },

  victory(){
    const e = this.enemy;
    const act = e.act;

    // Récompenses (scaling par acte + boss bonus)
    const baseXP = 10 + act*7 + Math.floor(e.level/2);
    const baseGold = 5 + act*4 + Math.floor(e.level/3);
    const xpGain = e.boss ? Math.floor(baseXP*5) : baseXP;
    const goldGain = e.boss ? Math.floor(baseGold*4) : baseGold;

    GameCore.addXP(xpGain);
    GameCore.addGold(goldGain);
    GameCore.log(`🏆 ${e.name} vaincu ! +${xpGain} XP, +${goldGain} or.`);

    // Progression boss → débloque acte suivant
    if(e.boss && ["Andariel","Duriel","Méphisto","Diablo","Baal"].includes(e.name)){
      GameCore.state.bossesDefeated[e.name] = true;
      GameCore.log(`🔥 ${e.name} est tombé ! L’acte suivant est débloqué.`);
    }

    // Loot (si Loot.generateLoot existe)
    try {
      if (typeof Loot !== "undefined" && Loot.generateLoot) {
        Loot.generateLoot(GameCore.mfTotal ? GameCore.mfTotal() : 0);
        if (Loot.renderInventory && document.getElementById("inventoryGrid")) {
          Loot.renderInventory();
        }
      }
    } catch(err){ console.warn("Loot error:", err); }

    // Fin de combat
    this.enemy = null;
    const card = document.getElementById("enemyCard"); if(card) card.hidden = true;

    // Rafraîchit l’UI
    if (GameCore.uiRefreshStatsIfPresent) GameCore.uiRefreshStatsIfPresent();
    GameCore.save();
  },

  /* ---------- Auto-combat ---------- */
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

  /* ---------- UI Actes & Zones ---------- */
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

  /* ---------- Initialisation UI ---------- */
  initUI(renderPlayer){
    // Actes
    this.renderActMap();
    // Par défaut, affiche Acte I zones
    this.populateZonesForAct(1);

    // Boutons
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

    // Premier rendu joueur
    if (typeof renderPlayer === "function") renderPlayer();
    if (GameCore.uiRefreshStatsIfPresent) GameCore.uiRefreshStatsIfPresent();
  }
};
