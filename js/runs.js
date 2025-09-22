/* runs.js — exécutions automatisées par paliers */
const Runs = (function(){
  const PRESETS = [
    {
      id:"run_tristram", name:"Run Tristram (1–15)",
      seq:["A1-1","A1-1","A1-2","A1-2","A1-3"]
    },
    {
      id:"run_tombs", name:"Run Tombs (15–24)",
      seq:["A2-1","A2-2","A2-2","A2-2","A2-3"]
    },
    {
      id:"run_baal", name:"Run Baal (25+)",
      seq:["A5-1","A5-2","A5-2","A5-2","A5-3"]
    },
  ];

  let active = null;      // {id, pos, startedAt}
  let timer = null;

  function save(){
    localStorage.setItem("idleARPG_run", JSON.stringify(active||{}));
  }
  function load(){
    try{ const js=JSON.parse(localStorage.getItem("idleARPG_run")||"{}"); return js && js.id ? js : null; }
    catch{ return null; }
  }

  function start(id){
    const p = PRESETS.find(x=>x.id===id);
    if(!p){ alert("Run inconnu"); return; }
    active = { id: p.id, pos: 0, startedAt: Date.now() };
    save();
    GameCore.log(`▶️ Run démarré: ${p.name}`);
    step();
    loop();
  }

  function stop(silent){
    if(timer){ clearInterval(timer); timer=null; }
    if(active && !silent) GameCore.log(`⏹️ Run arrêté.`);
    active = null; save();
  }

  function loop(){
    if(timer) clearInterval(timer);
    timer = setInterval(()=>{
      if(!active){ clearInterval(timer); timer=null; return; }
      step();
    }, 950);
  }

  function step(){
    if(!active) return;
    const p = PRESETS.find(x=>x.id===active.id);
    if(!p){ stop(); return; }
    if(active.pos >= p.seq.length) active.pos = 0;
    const zoneId = p.seq[active.pos];
    GameCore.state.currentZone = zoneId;
    GameCore.save();
    if(window.Combat){
      if(!document.getElementById("enemyCard")){
        // si on n'est pas sur la page combat, pas de tick (mais on mémorise)
        return;
      }
      if(!document.querySelector("#enemyCard .hpbar")) Combat.spawn();
      Combat.attackOnce();
      if(Math.random() < 0.10) active.pos++; // progression lente dans la séquence
    }
    save();
  }

  function resume(){
    const r = load();
    if(!r) return;
    active = r;
    GameCore.log(`▶️ Run repris: ${PRESETS.find(x=>x.id===active.id)?.name||active.id}`);
    loop();
  }

  function renderButtons(containerId){
    const el = document.getElementById(containerId||"runsBox");
    if(!el) return;
    el.innerHTML = PRESETS.map(p=>`
      <button class="btn" onclick="Runs.start('${p.id}')">${p.name}</button>
    `).join('') + (active ? ` <button class="btn" onclick="Runs.stop()">Stop Run</button>` : '');
  }

  return { start, stop, resume, renderButtons };
})();

// Optionnel: auto-resume au chargement de game.html si présent
document.addEventListener("DOMContentLoaded", ()=>{ try{ Runs.resume(); }catch{} });
