/* ================================
   Idle ARPG v6.0 FR - combat.js
   Gestion des zones, monstres, combats, boss
   ================================ */

const Combat = {
  enemy: null,
  auto: false,
  timer: null,

  // === Zones et monstres ===
  groups(){
    return [
      { act:1, label:"Acte I — Plaine de Sang", zones:[
        {key:"i1", name:"Campement des Rogues", monsters:["Chaman déchu","Déchu","Squelette","Zombie","Corbeau","Quill Rat","Sorcier noir","Chauve-souris","Araignée des cavernes","Sanglier sauvage","Zombie affamé","Squelette mage","Crapaud venimeux","Chaman squelette","Vermine","Corbeau noir","Chien enragé","Crapaud pesteux","Spectre faible","Sorcier du sang"]},
        {key:"iBoss", name:"Repaire d’Andariel", monsters:["Andariel"], boss:true}
      ]},
      { act:2, label:"Acte II — Désert de Lut Gholein", zones:[
        {key:"ii1", name:"Oasis de Far Oasis", monsters:["Squelette du désert","Scarabée électrique","Scarabée empoisonné","Ver des sables","Guerrier squelette","Zombie desséché","Vautour","Harpie","Momie","Momie desséchée","Chien de sable","Démon mineur","Spectre du désert","Sorcier de sable","Chacal démoniaque","Guerrier momifié","Serpent","Momie empoisonnée","Chien corrupteur","Sorcier des dunes"]},
        {key:"iiBoss", name:"Tombe de Tal Rasha (Duriel)", monsters:["Duriel"], boss:true}
      ]},
      { act:3, label:"Acte III — Jungle de Kurast", zones:[
        {key:"iii1", name:"Jungle des araignées", monsters:["Araignée venimeuse","Fétiche","Sorcier fétiche","Grenouille empoisonnée","Guerrier zombi","Petit démon","Grand démon","Spectre","Vampire","Sorcier vampire","Singe démoniaque","Homme-bête","Chauve-souris géante","Sorcier araignée","Guerrier possédé","Crapaud maudit","Esprit corrompu","Sorcière des marais","Guerrier des marais","Serpent venimeux"]},
        {key:"iiiBoss", name:"Temple de Méphisto", monsters:["Méphisto"], boss:true}
      ]},
      { act:4, label:"Acte IV — Enfers", zones:[
        {key:"iv1", name:"Rivière de Flammes", monsters:["Chevalier de l’enfer","Chevalier de l’effroi","Démon majeur","Spectre ardent","Vampire de l’enfer","Serpent infernal","Succube","Guerrier démoniaque","Balrog mineur","Balrog majeur","Sorcier démoniaque","Aile de chauve-souris","Zombie infernal","Chien de l’enfer","Esprit du feu","Spectre corrompu","Diablotin","Démon araignée","Spectre rouge","Guerrier corrompu"]},
        {key:"ivBoss", name:"Sanctuaire du Chaos (Diablo)", monsters:["Diablo"], boss:true}
      ]},
      { act:5, label:"Acte V — Mont Arreat", zones:[
        {key:"v1", name:"Plateau des Hurlants", monsters:["Barbare corrompu","Sorcier corrompu","Loup corrompu","Chaman corrompu","Archer corrompu","Guerrier squelette","Zombie gelé","Spectre de glace","Sorcier de glace","Chien gelé","Géant du froid","Succube du givre","Esprit glacial","Sorcière corrompue","Corbeau de glace","Balrog gelé","Spectre gelé","Chien démoniaque","Démon du froid","Guerrier corrompu"]},
        {key:"vBoss", name:"Salle du Trône (Baal)", monsters:["Baal"], boss:true}
      ]}
    ];
  },

  defaultZone(){ return "i1"; },

  // Conditions de déblocage des actes
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

  zoneAvailable(state, zoneKey){
    const group = this.groups().find(g=>g.zones.find(z=>z.key===zoneKey));
    if(!group) return false;
    const z = group.zones.find(z=>z.key===zoneKey);
    if(!z) return false;
    const li = this.lockInfo(state);
    return li.access[group.act];
  },

  // Rencontre aléatoire
  newEncounter(zoneKey){
    const group = this.groups().find(g=>g.zones.find(z=>z.key===zoneKey));
    const z = group.zones.find(z=>z.key===zoneKey);
    const name = z.monsters[Math.floor(Math.random()*z.monsters.length)];
    this.enemy = {
      name,
      level: group.act*5 + Math.floor(Math.random()*5),
      hp: 30+group.act*20,
      hpMax: 30+group.act*20,
      def: 5*group.act,
      dice: [1,6+group.act*3],
      boss: z.boss || ["Andariel","Duriel","Méphisto","Diablo","Baal"].includes(name)
    };
    document.getElementById("enemyCard").hidden=false;
    document.getElementById("eName").textContent=this.enemy.name;
    document.getElementById("eLvl").textContent=this.enemy.level;
    document.getElementById("eHP").textContent=this.enemy.hp;
    document.getElementById("eHPmax").textContent=this.enemy.hpMax;
    document.getElementById("eDef").textContent=this.enemy.def;
    document.getElementById("eDice").textContent=`${this.enemy.dice[0]}d${this.enemy.dice[1]}`;
    document.getElementById("eHpBar").max=this.enemy.hpMax;
    document.getElementById("eHpBar").value=this.enemy.hp;
    document.getElementById("enemyCard").classList.toggle("bossFight",this.enemy.boss);
    GameCore.log(`⚔️ Un ${this.enemy.name} apparaît !`);
  },

  // Attaque
  attack(){
    if(!this.enemy) return;
    const s = GameCore.state;
    const playerDmg = this.rollDice(1,6+s.str);
    const enemyDmg = this.rollDice(this.enemy.dice[0],this.enemy.dice[1]) - s.def/5;
    this.enemy.hp -= playerDmg;
    if(this.enemy.hp<0) this.enemy.hp=0;
    s.hp -= Math.max(1,Math.floor(enemyDmg));
    if(s.hp<0) s.hp=0;
    document.getElementById("eHP").textContent=this.enemy.hp;
    document.getElementById("eHpBar").value=this.enemy.hp;
    document.getElementById("barHpFill").style.width=(s.hp/s.hpMax*100)+"%";
    document.getElementById("barHpText").textContent=`HP ${s.hp}/${s.hpMax}`;
    GameCore.log(`Vous infligez ${playerDmg} dégâts. L’ennemi inflige ${Math.max(0,Math.floor(enemyDmg))} dégâts.`);
    if(this.enemy.hp<=0){
      this.victory();
    } else if(s.hp<=0){
      GameCore.log("☠️ Vous êtes mort ! Retour au campement.");
      s.hp=s.hpMax; s.mana=s.manaMax; s.gold=Math.max(0,s.gold-20);
      this.enemy=null;
      document.getElementById("enemyCard").hidden=true;
    }
    GameCore.save();
  },

  victory(){
    const s = GameCore.state;
    GameCore.addXP(20);
    GameCore.addGold(5);
    GameCore.log(`🏆 ${this.enemy.name} est vaincu ! +20 XP, +5 or`);
    if(this.enemy.boss){
      s.bossesDefeated[this.enemy.name]=true;
      document.getElementById("bossVictoryTitle").textContent=`${this.enemy.name} est vaincu !`;
      document.getElementById("bossVictoryMsg").textContent=`L’acte suivant est débloqué !`;
      document.getElementById("bossVictory").hidden=false;
    }
    this.enemy=null;
    document.getElementById("enemyCard").hidden=true;
  },

  rollDice(nb,faces){
    let sum=0;
    for(let i=0;i<nb;i++){ sum+=1+Math.floor(Math.random()*faces); }
    return sum;
  },

  // Auto-combat
  toggleAuto(val){
    this.auto=val;
    if(val){
      this.timer=setInterval(()=>this.attack(),2000);
    } else {
      clearInterval(this.timer);
    }
  },

  // Lore
  loreFor(zoneKey){
    if(zoneKey.includes("Boss")) return "⚠️ Combat de Boss ! Préparez-vous...";
    return "";
  },

  // Mini-carte des actes
  renderActMap(){
    const map = document.getElementById("actMap");
    map.innerHTML="";
    const li = this.lockInfo(GameCore.state);
    for(const g of this.groups()){
      const div=document.createElement("div");
      div.className="actIcon";
      if(!li.access[g.act]) div.classList.add("locked");
      else div.classList.add("unlocked");
      if(GameCore.state.zone && GameCore.state.zone.startsWith(g.act.toString().toLowerCase())) div.classList.add("current");
      div.textContent=g.act;
      map.appendChild(div);
    }
  },

  // Initialisation UI
  initUI(renderPlayer){
    document.getElementById("attackBtn").onclick=()=>this.attack();
    document.getElementById("fleeBtn").onclick=()=>{
      GameCore.log("🏃 Vous fuyez !");
      this.enemy=null;
      document.getElementById("enemyCard").hidden=true;
    };
    document.getElementById("newEncounter").onclick=()=>{
      const z=document.getElementById("zoneSelect").value;
      this.newEncounter(z);
      renderPlayer();
    };
    document.getElementById("autoToggle").onchange=(e)=>this.toggleAuto(e.target.checked);
    renderPlayer();
  },

  // Offline simulation placeholder
  offlineSim(){ return; }
};
