/* ==========================================
   Idle ARPG v7.2 FR - combat.js
   ========================================== */

// Difficulté
const DIFFICULTIES={
  "Facile":{hp:0.8,dmg:0.8,def:0.9,xp:1.0,gold:1.0},
  "Normal":{hp:1.0,dmg:1.0,def:1.0,xp:1.0,gold:1.0},
  "Difficile":{hp:1.25,dmg:1.2,def:1.1,xp:1.1,gold:1.1},
  "Enfer":{hp:1.6,dmg:1.5,def:1.25,xp:1.25,gold:1.25}
};
function D(){const d=GameCore?.state?.difficulty||"Normal";return DIFFICULTIES[d]||DIFFICULTIES["Normal"];}

const Combat={
  enemy:null, auto:false, timer:null,

  groups(){return[
    {act:1,label:"Acte I — Plaine de Sang",zones:[
      {key:"i1",name:"Campement des Rogues",monsters:["Déchu","Chaman déchu","Quill Rat","Zombie"]},
      {key:"i2",name:"Plaine Sanglante",monsters:["Squelette","Corbeau","Sorcier noir","Araignée des cavernes"]},
      {key:"i3",name:"Catacombes",monsters:["Chauve-souris","Crapaud venimeux","Spectre","Squelette mage"]},
      {key:"iBoss",name:"Repaire d’Andariel",monsters:["Andariel"],boss:true}
    ]},
    {act:2,label:"Acte II — Désert",zones:[
      {key:"ii1",name:"Far Oasis",monsters:["Ver des sables","Scarabée électrique","Momie desséchée"]},
      {key:"ii2",name:"Égouts",monsters:["Squelette du désert","Zombie desséché","Spectre du désert"]},
      {key:"ii3",name:"Canyon des Magi",monsters:["Guerrier momifié","Serpent","Sorcier de sable"]},
      {key:"iiBoss",name:"Duriel",monsters:["Duriel"],boss:true}
    ]},
    {act:3,label:"Acte III — Kurast",zones:[
      {key:"iii1",name:"Jungle des araignées",monsters:["Araignée venimeuse","Fétiche","Grenouille empoisonnée"]},
      {key:"iii2",name:"Bas-Kurast",monsters:["Petit démon","Grand démon","Vampire"]},
      {key:"iii3",name:"Temple de Kurast",monsters:["Sorcier vampire","Homme-bête","Chauve-souris géante"]},
      {key:"iiiBoss",name:"Méphisto",monsters:["Méphisto"],boss:true}
    ]},
    {act:4,label:"Acte IV — Enfers",zones:[
      {key:"iv1",name:"Plaines du Désespoir",monsters:["Chevalier de l’enfer","Spectre ardent","Succube"]},
      {key:"iv2",name:"Rivière de Flammes",monsters:["Balrog mineur","Chien de l’enfer","Vampire de l’enfer"]},
      {key:"iv3",name:"Sanctuaire du Chaos",monsters:["Démon majeur","Spectre corrompu","Diablotin"]},
      {key:"ivBoss",name:"Diablo",monsters:["Diablo"],boss:true}
    ]},
    {act:5,label:"Acte V — Arreat",zones:[
      {key:"v1",name:"Plateau des Hurlants",monsters:["Barbare corrompu","Sorcier corrompu","Zombie gelé"]},
      {key:"v2",name:"Glacier Arreat",monsters:["Spectre de glace","Chien gelé","Succube du givre"]},
      {key:"v3",name:"Salle des Anciens",monsters:["Balrog gelé","Esprit glacial","Guerrier corrompu"]},
      {key:"vBoss",name:"Baal",monsters:["Baal"],boss:true}
    ]}
  ];},

  lockInfo(s){return{
    req:{2:12,3:20,4:30,5:40},
    access:{
      1:true,
      2:(s.level>=12 && s.bossesDefeated.Andariel),
      3:(s.level>=20 && s.bossesDefeated.Duriel),
      4:(s.level>=30 && s.bossesDefeated.Méphisto),
      5:(s.level>=40 && s.bossesDefeated.Diablo)
    }
  };},

  findZone(k){for(const g of this.groups()){const z=g.zones.find(z=>z.key===k); if(z) return {group:g,zone:z};} return null;},

  newEncounter(zoneKey){
    const f=this.findZone(zoneKey); if(!f){GameCore.log("Zone invalide.");return;}
    const {group,zone}=f, act=group.act;
    const baseLvl=act*5+Math.floor(Math.random()*5);
    const baseHP=35+act*28+Math.floor(Math.random()*10);
    const baseDef=4*act+Math.floor(Math.random()*3);
    const faces=6+act*4;
    const hpMax=Math.max(1,Math.floor(baseHP*D().hp));
    const def=Math.max(0,Math.floor(baseDef*D().def));
    const name=zone.monsters[Math.floor(Math.random()*zone.monsters.length)];
    this.enemy={name,level:baseLvl,act,hp:hpMax,hpMax:hpMax,def:def,dice:[1,Math.max(2,Math.floor(faces))],boss:!!zone.boss};
    const card=document.getElementById("enemyCard"); if(card) card.hidden=false;
    this._uiEnemySync(); GameCore.log(`⚔️ Un ${this.enemy.name} apparaît dans ${zone.name} !`); GameCore.save();
  },

  _uiEnemySync(){
    const e=this.enemy;if(!e) return; const q=id=>document.getElementById(id);
    q("eName").textContent=e.name; q("eLvl").textContent=e.level;
    q("eHP").textContent=e.hp; q("eHPmax").textContent=e.hpMax; q("eDef").textContent=e.def;
    q("eDice").textContent=`${e.dice[0]}d${e.dice[1]}`;
    const bar=document.getElementById("eHpBar"); if(bar){bar.max=e.hpMax; bar.value=e.hp;}
  },

  rollDice(n,f){let s=0;for(let i=0;i<n;i++) s+=1+Math.floor(Math.random()*f); return s;},

  attack(){
    if(!this.enemy) return; const s=GameCore.state, e=this.enemy;

    // Joueur -> Ennemi
    const baseRoll=1+Math.floor(Math.random()*6);
    let pDmg=baseRoll+Math.floor(GameCore.atkTotal()*1.0);
    const isCrit = Math.random() < (GameCore.critTotal()/100);
    if(isCrit) pDmg=Math.floor(pDmg*2);
    pDmg=Math.max(1, pDmg - Math.floor(e.def/8));
    e.hp-=pDmg; if(e.hp<0)e.hp=0;
    GameCore.log(`Vous infligez ${pDmg}${isCrit?" (CRIT)":""}.`);
    this._uiEnemySync();
    if(e.hp<=0){ this.victory(); return; }

    // Ennemi -> Joueur
    let enemyRaw=this.rollDice(e.dice[0],e.dice[1])+(e.act*2); enemyRaw=Math.floor(enemyRaw*D().dmg);
    const eDmg=Math.max(1, enemyRaw - Math.floor(GameCore.defTotal()/10));
    s.hp-=eDmg; if(s.hp<0)s.hp=0;
    GameCore.log(`L’ennemi inflige ${eDmg}.`);
    GameCore.save(); GameCore.uiRefreshStatsIfPresent();
    if(s.hp<=0){
      GameCore.log("☠️ Vous êtes mort ! Retour au camp (-20 or).");
      s.hp=s.hpMax; s.mana=s.manaMax; s.gold=Math.max(0, s.gold-20);
      this.enemy=null; const card=document.getElementById("enemyCard"); if(card) card.hidden=true; GameCore.save();
    }
  },

  victory(){
    const e=this.enemy; if(!e) return; const act=e.act;
    const baseXP=10+act*7+Math.floor(e.level/2);
    const baseGold=5+act*4+Math.floor(e.level/3);
    const xpGain=Math.floor((e.boss?baseXP*5:baseXP)*D().xp);
    const goldGain=Math.floor((e.boss?baseGold*4:baseGold)*D().gold);
    GameCore.addXP(xpGain); GameCore.addGold(goldGain);
    GameCore.log(`🏆 ${e.name} vaincu ! +${xpGain} XP, +${goldGain} or.`);
    if(e.boss&&["Andariel","Duriel","Méphisto","Diablo","Baal"].includes(e.name)){
      GameCore.state.bossesDefeated[e.name]=true;
      GameCore.log(`🔥 ${e.name} est tombé ! Acte suivant débloqué.`);
    }
    this.enemy=null; const card=document.getElementById("enemyCard"); if(card) card.hidden=true;
    GameCore.save(); GameCore.uiRefreshStatsIfPresent();
  },

  toggleAuto(val){
    this.auto=val; if(val){ if(this.timer) clearInterval(this.timer);
      this.timer=setInterval(()=>this.attack(),1700); GameCore.log("🌀 Auto-combat activé.");
    } else { clearInterval(this.timer); this.timer=null; GameCore.log("⛔ Auto-combat désactivé."); }
    GameCore.save();
  },

  populateZonesForAct(act){
    const g=this.groups().find(x=>x.act===act), sel=document.getElementById("zoneSelect"); if(!g||!sel) return;
    sel.innerHTML=""; for(const z of g.zones){const o=document.createElement("option");o.value=z.key;o.textContent=z.name; sel.appendChild(o);}
  },
  renderActMap(){
    const map=document.getElementById("actMap"); if(!map) return; map.innerHTML="";
    const li=this.lockInfo(GameCore.state);
    for(const g of this.groups()){
      const d=document.createElement("div"); d.className="actIcon "+(li.access[g.act]?"unlocked":"locked"); d.textContent=g.act;
      d.onclick=()=>{ if(!li.access[g.act]) return; this.populateZonesForAct(g.act); };
      map.appendChild(d);
    }
  },

  initUI(renderPlayer){
    this.renderActMap(); this.populateZonesForAct(1);
    const atk=document.getElementById("attackBtn"), flee=document.getElementById("fleeBtn"),
          enc=document.getElementById("newEncounter"), au=document.getElementById("autoToggle");
    if(atk) atk.onclick=()=>this.attack();
    if(flee) flee.onclick=()=>{GameCore.log("🏃 Vous fuyez !"); this.enemy=null; document.getElementById("enemyCard").hidden=true; GameCore.save();};
    if(enc) enc.onclick=()=>{const z=document.getElementById("zoneSelect").value; if(!z)return GameCore.log("Choisissez une zone."); this.newEncounter(z); renderPlayer();};
    if(au) au.onchange=e=>this.toggleAuto(e.target.checked);
    renderPlayer(); GameCore.uiRefreshStatsIfPresent();
  }
};
