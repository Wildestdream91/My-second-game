/* ==========================================
   Idle ARPG v7.2 FR - combat.js
   Combat au tour par tour (idle)
   ========================================== */

const Combat = {
  enemy:null,
  auto:false,

  newEncounter(){
    const act = 1; // TODO: relier aux zones/actes
    const eLvl = act*5 + Math.floor(Math.random()*5);
    const eHPmax = 30+act*20+Math.floor(Math.random()*10);
    const eDef = 3*act+Math.floor(Math.random()*2);
    const diceFaces=6+act*3;

    this.enemy={
      name:"Monstre",
      level:eLvl, act,
      hp:eHPmax,hpMax:eHPmax,
      def:eDef,dice:[1,diceFaces],
      boss:false
    };
    GameCore.log(`⚔️ Un ${this.enemy.name} apparaît !`);
    this.updateUI();
  },

  attack(){
    const s=GameCore.state,e=this.enemy;
    if(!e||e.hp<=0) return;

    // joueur attaque
    const baseRoll=1+Math.floor(Math.random()*6);
    let dmg=baseRoll+Math.floor(GameCore.atkTotal()*0.8);
    dmg=Math.max(1,dmg-Math.floor(e.def/8));
    e.hp-=dmg;
    GameCore.log(`Vous infligez ${dmg} à ${e.name}.`);

    if(e.hp<=0){ this.victory(); return; }

    // ennemi attaque
    let enemyRaw=this.rollDice(e.dice[0],e.dice[1])+(e.act*1);
    enemyRaw=Math.floor(enemyRaw*1.0);
    const enemyDmg=Math.max(1,enemyRaw-Math.floor(GameCore.defTotal()/8));
    s.hp-=enemyDmg; if(s.hp<0)s.hp=0;
    GameCore.log(`${e.name} vous inflige ${enemyDmg}.`);
    if(s.hp<=0){ GameCore.log("💀 Vous êtes mort !"); }
    GameCore.save();
    this.updateUI();
  },

  rollDice(n,f){let t=0;for(let i=0;i<n;i++){t+=1+Math.floor(Math.random()*f);}return t;},

  victory(){
    const e=this.enemy; if(!e) return;
    const baseXP=10+e.act*7+Math.floor(e.level/2);
    const baseGold=5+e.act*4+Math.floor(e.level/3);
    GameCore.addXP(baseXP);
    GameCore.addGold(baseGold);
    GameCore.log(`🏆 ${e.name} vaincu ! +${baseXP} XP, +${baseGold} or.`);
    this.enemy=null; GameCore.save(); this.updateUI();
  },

  updateUI(){
    const e=this.enemy;
    const box=document.getElementById("enemyCard");
    const bar=document.getElementById("eHpBar");
    if(!e){ if(box)box.hidden=true; if(bar){bar.value=0;bar.max=1;} return; }
    if(box){box.hidden=false;
      document.getElementById("eName").textContent=e.name;
      document.getElementById("eLvl").textContent=e.level;
      document.getElementById("eHP").textContent=e.hp;
      document.getElementById("eHPmax").textContent=e.hpMax;
      document.getElementById("eDef").textContent=e.def;
      document.getElementById("eDice").textContent=`${e.dice[0]}d${e.dice[1]}`;
    }
    if(bar){bar.value=e.hp;bar.max=e.hpMax;}
  },

  initUI(refreshPlayer){
    document.getElementById("newEncounter").onclick=()=>this.newEncounter();
    document.getElementById("attackBtn").onclick=()=>this.attack();
    setInterval(()=>{if(this.auto&&this.enemy)this.attack();},1500);
    refreshPlayer();
  }
};
