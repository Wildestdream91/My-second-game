/* ==========================================
   Idle ARPG v7.4 FR - runs.js
   Runs XP inspirés de Diablo II (Tristram / Tombs / Baal)
   - Auto-chaîne les combats dans une zone cible
   - Option "noLoot" pour run pure XP
   - Compteurs en direct + résumé
   - AUCUNE modif requise dans combat.js : monkey patch propre
   ========================================== */

const Runs = {
  active: null,
  timer: null,
  lootPatched: null,

  // Presets type D2 (zoneKey existants dans Combat.groups)
  presets: [
    {
      key: "trist",
      label: "Run Tristram (1–15)",
      act: 1,
      zoneKey: "i3",             // "Catacombes" (proche en esprit)
      attackEveryMs: 900,
      noLoot: true,              // pur XP
      xpBonusMul: 1.15           // +15% d’XP brute (se cumulera avec D().xp et XP_RATE)
    },
    {
      key: "tombs",
      label: "Run Tombs (15–24)",
      act: 2,
      zoneKey: "ii3",            // "Canyon des Magi" (tombeaux)
      attackEveryMs: 900,
      noLoot: true,
      xpBonusMul: 1.25
    },
    {
      key: "baal",
      label: "Run Baal (25+)",
      act: 5,
      zoneKey: "vBoss",          // Boss Baal (sbires simulés en chaîne par mobs de la zone si boss rare)
      attackEveryMs: 950,
      noLoot: false,
      xpBonusMul: 1.35
    }
  ],

  // Démarre un run
  start(presetKey){
    if (this.active) { GameCore.log("Un run est déjà en cours."); return; }
    const preset = this.presets.find(p=>p.key===presetKey);
    if(!preset){ GameCore.log("Preset de run introuvable."); return; }

    // Permissions d'acte (réutilise la même logique de verrouillage que le combat)
    const li = Combat.lockInfo(GameCore.state);
    const {act} = preset;
    if (!li.access[act]) {
      const req = li.req[act] ? ` (niveau requis: ${li.req[act]})` : "";
      GameCore.log(`🔒 Acte ${act} non débloqué${req}.`);
      return;
    }

    // État de run
    this.active = {
      ...preset,
      fights: 0,
      kills: 0,
      deaths: 0,
      xpRawAwarded: 0,   // avant multiplicateurs du core (pour l’info)
      gold: 0,
      since: Date.now()
    };

    // Patch loot si noLoot
    this.patchLootIfNeeded();

    // Hook victoire (monkey-patch non destructif)
    this.patchVictory();

    // Lance la machine
    this.loopStart();
    GameCore.log(`🚀 ${preset.label} démarré.`);
    this.renderUI();
  },

  stop(){
    if(!this.active) return;
    this.loopStop();
    this.unpatchLootIfNeeded();
    this.unpatchVictory();

    const r = this.active;
    this.active = null;
    this.renderUI();

    // Résumé
    const mins = Math.max(1, Math.round((Date.now()-r.since)/60000));
    GameCore.log(`✅ Fin du run: ${r.label}`);
    GameCore.log(`• Kills: ${r.kills} • Morts: ${r.deaths} • Fights: ${r.fights} • Or: +${r.gold} • Durée: ~${mins} min`);
  },

  loopStart(){
    if(!this.active) return;
    // Désactive l’auto-combat natif pour éviter conflit
    if (Combat.auto) Combat.toggleAuto(false);

    // On prépare une première rencontre si besoin
    if (!Combat.enemy) Combat.newEncounter(this.active.zoneKey);

    const pace = Math.max(400, this.active.attackEveryMs||900);
    this.timer = setInterval(()=>{
      // Si pas d’ennemi → nouvelle rencontre dans la même zone
      if (!Combat.enemy) {
        Combat.newEncounter(this.active.zoneKey);
        this.active.fights++;
        this.renderUI();
        return;
      }
      // Sinon, on attaque
      Combat.attack();
      this.renderUI();
    }, pace);
  },

  loopStop(){
    if(this.timer){ clearInterval(this.timer); this.timer = null; }
  },

  // --------- Hooks / Patches ---------
  patchLootIfNeeded(){
    if(!this.active?.noLoot) return;
    if (typeof Loot === "undefined" || typeof Loot.generateLoot !== "function") return;
    if (this.lootPatched) return;
    this.lootPatched = Loot.generateLoot;
    Loot.generateLoot = function(){ return null; }; // no-op pendant le run
    GameCore.log("📦 Loot désactivé pendant ce run (pur XP).");
  },
  unpatchLootIfNeeded(){
    if(this.lootPatched && typeof Loot !== "undefined"){
      Loot.generateLoot = this.lootPatched;
      this.lootPatched = null;
      GameCore.log("📦 Loot réactivé.");
    }
  },

  patchVictory(){
    if (this._victoryPatched) return;
    if (!Combat || typeof Combat.victory !== "function") return;
    const original = Combat.victory.bind(Combat);
    const self = this;
    Combat.victory = function(){
      const snap = this.enemy ? {...this.enemy} : null; // capture avant clear
      original();
      try { if (snap) self._onVictorySnap(snap); } catch(e){ console.warn("Runs victory hook error", e); }
    };
    this._victoryPatched = true;
  },
  unpatchVictory(){
    if (!this._victoryPatched || !Combat || !Combat.victory) return;
    // Impossible de récupérer l’original de façon sûre sans le stocker :
    // on repatche "doucement" en rechargeant la page — ou on accepte le patch permanent (inoffensif).
    // Ici : on laisse le patch (il ne fait rien si pas de run actif).
  },

  // Après victoire d’un ennemi (snapshot pré-clear)
  _onVictorySnap(e){
    if(!this.active) return;

    this.active.kills++;

    // Reproduit le calcul d’XP de Combat.victory pour ajouter un bonus "runs"
    const act = e.act || 1;
    const baseXP   = Math.round(12 + act*8 + e.level*0.9);
    const bonusMul = (this.active.xpBonusMul || 1.0) - 1.0;
    if (bonusMul > 0) {
      // D().xp et XP_RATE seront appliqués automatiquement dans core.gainXP
      const extraRaw = Math.floor(baseXP * (e.boss ? 6 : 1) * D().xp * bonusMul);
      if (extraRaw > 0) {
        this.active.xpRawAwarded += extraRaw;
        GameCore.addXP(extraRaw);
      }
    }

    // Or : on n’ajoute pas de bonus ici (déjà géré côté combat)
    // Enchaînement : la boucle remettra un ennemi
  },

  // UI
  renderUI(){
    const box = document.getElementById("runsBox");
    const btns = document.getElementById("runsButtons");
    const stopBtn = document.getElementById("runsStop");
    if (!box || !btns || !stopBtn) return;

    if (!this.active){
      box.innerHTML = `<div class="muted">Aucun run en cours.</div>`;
      btns.classList.remove("disabled");
      stopBtn.disabled = true;
      return;
    }
    const r = this.active;
    const elapsed = Math.max(1, Math.round((Date.now()-r.since)/1000));
    box.innerHTML = `
      <div><b>${r.label}</b></div>
      <div>Fights: ${r.fights} • Kills: ${r.kills} • Morts: ${r.deaths}</div>
      <div>XP brut bonus ajouté: ${r.xpRawAwarded}</div>
      <div>Temps: ${Math.floor(elapsed/60)}m ${elapsed%60}s</div>
    `;
    btns.classList.add("disabled");
    stopBtn.disabled = false;
  },

  // Wiring boutons
  initUI(){
    const btns = document.getElementById("runsButtons");
    const stopBtn = document.getElementById("runsStop");
    if(!btns || !stopBtn) return;

    // Crée les boutons à partir des presets
    btns.innerHTML = "";
    this.presets.forEach(p=>{
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = p.label;
      b.onclick = ()=>this.start(p.key);
      btns.appendChild(b);
    });
    stopBtn.onclick = ()=>this.stop();
    this.renderUI();
  }
};

// Enregistre une mort joueur pendant un run (hook léger)
(function hookPlayerDeath(){
  const oldAttack = Combat.attack.bind(Combat);
  Combat.attack = function(){
    const hpBefore = GameCore.state.hp;
    oldAttack();
    if (Runs.active){
      if (hpBefore > 0 && GameCore.state.hp === GameCore.state.hpMax && !Combat.enemy){
        // Healed after death → on considère une mort
        Runs.active.deaths++;
        Runs.renderUI();
      }
    }
  };
})();
