/* ladder.js — Classement local (sans backend) */
var Ladder = (function () {
  const KEY = "idleARPG_ladder_board";

  function nowISO() {
    return new Date().toISOString();
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  }

  function save(arr) {
    localStorage.setItem(KEY, JSON.stringify(arr || []));
  }

  // Calcule un score composite
  function computeScore(entry) {
    const lvl = entry.level || 1;
    const xpPct = Math.max(0, Math.min(99, Math.round(entry.xpPct || 0)));
    const bosses = Math.max(0, entry.bossKills || 0);
    const gold = Math.max(0, entry.gold || 0);
    const seconds = Math.max(1, entry.seconds || 1);
    const speedInv = Math.floor(1e6 / Math.min(seconds, 1e6));

    return lvl * 100000 +
           xpPct * 1200 +
           bosses * 7000 +
           Math.min(gold, 500000) +
           speedInv;
  }

  function snapshotFromState(s) {
    if (!s) return null;

    const xpMax = (GameCore.xpTable && GameCore.xpTable[s.level]) || 1;
    const xpPct = xpMax ? (s.xp / xpMax) * 100 : 0;

    let createdAt = s.__createdAt || null;
    if (!createdAt) {
      createdAt = Date.now();
      s.__createdAt = createdAt;
      try { GameCore.save(); } catch (_) {}
    }

    const seconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));

    let bosses = 0;
    if (s.progress?.nightmare?.locked === false) bosses += 1;
    if (s.progress?.hell?.locked === false) bosses += 1;

    const zid = s.currentZone || "";
    const z = (window.Zones && Zones.getZone) ? Zones.getZone(zid) : null;
    const zoneName = z ? z.nameFR : zid;

    const diff = (GameCore.getDifficulty?.() || "Normal");

    const e = {
      name: s.name || "SansNom",
      klass: s.klass || "—",
      level: s.level || 1,
      xpPct: Math.round(xpPct),
      gold: s.gold || 0,
      bossKills: bosses,
      act: (zid || "").split("-")[0] || "",
      zone: zoneName || "—",
      diff,
      seconds,
      date: nowISO()
    };

    e.score = computeScore(e);
    return e;
  }

  function submitFromCurrent() {
    const s = GameCore.state || GameCore.load();
    if (!s) {
      alert("Aucune partie à publier.");
      return;
    }

    const e = snapshotFromState(s);
    if (!e) {
      alert("Impossible de créer l’entrée.");
      return;
    }

    const board = load();
    board.push(e);
    save(board);

    alert(
      `Score publié ! (${e.name} niv.${e.level} — score ${e.score.toLocaleString()})`
    );
    render();
  }

  function clearBoard() {
    if (!confirm("Vider complètement le classement local ?")) return;
    save([]);
    render();
  }

  function exportBoard() {
    const data = JSON.stringify(load());
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(data);
        alert("Classement copié dans le presse-papiers !");
      } else {
        throw new Error("no_clipboard");
      }
    } catch (_) {
      alert("Copie impossible automatiquement. Voici les données :\n\n" + data);
    }
  }

  function importBoard() {
    const js = prompt("Collez le JSON du classement :");
    if (!js) return;
    try {
      const arr = JSON.parse(js);
      if (!Array.isArray(arr)) throw new Error("format");
      save(arr);
      render();
    } catch (e) {
      alert("Données invalides.");
    }
  }

  function formatTime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h${String(m).padStart(2, "0")}m${String(sec).padStart(2, "0")}s`;
    if (m > 0) return `${m}m${String(sec).padStart(2, "0")}s`;
    return `${sec}s`;
  }

  function render() {
    const body = document.getElementById("ladderBody");
    if (!body) return;

    const fltKlass = (document.getElementById("fltClass")?.value || "").trim();
    const sortBy = (document.getElementById("sortBy")?.value || "score");

    let rows = load().slice();

    if (fltKlass) rows = rows.filter(r => r.klass === fltKlass);

    rows.sort((a, b) => {
      if (sortBy === "score") return (b.score || 0) - (a.score || 0);
      if (sortBy === "level") {
        const lv = (b.level || 0) - (a.level || 0);
        if (lv) return lv;
        return (b.xpPct || 0) - (a.xpPct || 0);
      }
      if (sortBy === "gold") return (b.gold || 0) - (a.gold || 0);
      if (sortBy === "time") return (a.seconds || 0) - (b.seconds || 0);
      if (sortBy === "date")
        return String(b.date || "").localeCompare(String(a.date || ""));
      return (b.score || 0) - (a.score || 0);
    });

    if (rows.length === 0) {
      body.innerHTML =
        `<tr><td colspan="12" class="muted">Aucune entrée… publie ta partie !</td></tr>`;
      return;
    }

    const out = rows.slice(0, 100).map((r, i) => `
      <tr>
        <td class="mono">${i + 1}</td>
        <td>${r.name || "—"}</td>
        <td>${r.klass || "—"}</td>
        <td class="mono">${r.level || 1}</td>
        <td class="mono">${Math.max(0, Math.min(99, r.xpPct || 0))}%</td>
        <td class="mono">${(r.gold || 0).toLocaleString()}</td>
        <td class="mono">${r.bossKills || 0}</td>
        <td>${r.zone || "—"}</td>
        <td>${r.diff || "Normal"}</td>
        <td class="mono">${formatTime(r.seconds || 0)}</td>
        <td class="mono">${(r.score || 0).toLocaleString()}</td>
        <td class="mono">${(r.date || "").replace("T", " ").slice(0, 19)}</td>
      </tr>
    `).join("");

    body.innerHTML = out;
  }

  // expose API publique
  return {
    render,
    submitFromCurrent,
    exportBoard,
    importBoard,
    clearBoard
  };
})();
