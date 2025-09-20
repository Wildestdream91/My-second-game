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
        {key:"v1", name:"Plateau des Hurlants", monsters:["Bar
