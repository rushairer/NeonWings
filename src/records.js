/* Device-local ranked run history and milestones (no network, no accounts). */
(function (root) {
  "use strict";

  const STORAGE_KEY = "neon_wings_arcade_records_v26";
  const MODES = ["classic", "bossRush"];
  const LIMIT = 5;
  const BADGES = Object.freeze([
    {id:"firstFlight", title:"FIRST FLIGHT", description:"Finish an Arcade or Boss Rush run"},
    {id:"bossHunter", title:"BOSS HUNTER", description:"Defeat three bosses in one run"},
    {id:"firstDawn", title:"FIRST DAWN", description:"Clear the five Classic stages"},
    {id:"titanSlayer", title:"TITAN SLAYER", description:"Clear Boss Rush"},
    {id:"grazeAce", title:"GRAZE ACE", description:"Graze 25 enemy shots in a ranked run"},
    {id:"chainMaster", title:"CHAIN MASTER", description:"Reach a 20-kill chain in a ranked run"},
    {id:"overdrivePilot", title:"OVERDRIVE PILOT", description:"Trigger Overdrive three times in one run"},
    {id:"untouchable", title:"UNTOUCHABLE", description:"Clear Boss Rush without taking damage"}
  ].map(Object.freeze));

  const finiteInteger = value => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.min(999999999, Math.floor(n)) : 0;
  };
  const safeDate = value => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(n)) : 0;
  };
  const ranked = id => MODES.includes(id);
  function grade(mode, run, clear = false) {
    if (!ranked(mode)) return "PRACTICE";
    const bosses = finiteInteger(run?.bossesDefeated);
    const damage = finiteInteger(run?.damageTaken);
    if (mode === "bossRush") {
      if (clear && bosses >= 5 && damage === 0) return "S";
      if (clear && bosses >= 5) return "A";
      if (bosses >= 3) return "B";
      return "C";
    }
    const loop = finiteInteger(run?.loop);
    const stage = finiteInteger(run?.reachedStage);
    if (loop >= 2 || (clear && damage === 0)) return "S";
    if (stage >= 5 || bosses >= 4) return "A";
    if (stage >= 3 || bosses >= 2) return "B";
    return "C";
  }

  function normalizeEntry(entry) {
    if (!entry || !ranked(entry.mode) || !Number.isFinite(entry.score) || entry.score < 0) return null;
    return {
      mode: entry.mode,
      score: finiteInteger(entry.score),
      grade: ["S","A","B","C"].includes(entry.grade) ? entry.grade : "C",
      ship: entry.ship === "vanguard" ? "vanguard" : "falcon",
      bossesDefeated: finiteInteger(entry.bossesDefeated),
      reachedStage: finiteInteger(entry.reachedStage),
      date: safeDate(entry.date)
    };
  }

  function initialData() {
    return { classic:[], bossRush:[], achievements:[] };
  }

  function createStore(storage) {
    let data = initialData();
    try {
      const raw = storage?.getItem?.(STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        for (const mode of MODES) {
          if (!Array.isArray(saved[mode])) continue;
          data[mode] = saved[mode].map(normalizeEntry).filter(Boolean)
            .sort((a,b) => b.score-a.score || b.date-a.date).slice(0,LIMIT);
        }
        if (Array.isArray(saved.achievements)) {
          const valid = new Set(BADGES.map(b=>b.id));
          data.achievements = [...new Set(saved.achievements.filter(id=>valid.has(id)))];
        }
      }
    } catch (_) {
      // Blocked or malformed localStorage only affects persistence.
    }

    function persist() {
      try { storage?.setItem?.(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
    }

    function add(run, timestamp = Date.now()) {
      if (!ranked(run?.mode)) return null;
      const entry = normalizeEntry({
        ...run,
        date: timestamp,
        grade: run.grade ?? grade(run.mode,run,run.clear)
      });
      if (!entry) return null;
      data[entry.mode].push(entry);
      data[entry.mode].sort((a,b) => b.score-a.score || b.date-a.date);
      data[entry.mode] = data[entry.mode].slice(0,LIMIT);
      persist();
      return { ...entry };
    }

    function top(mode) {
      if (!ranked(mode)) return [];
      return data[mode].map(entry=>({ ...entry }));
    }

    function unlock(run, {firstClear = false, rushClear = false} = {}) {
      if (!ranked(run?.mode)) return [];
      const achieved = [];
      const addBadge = (id, condition) => {
        if (condition && !data.achievements.includes(id)) {
          data.achievements.push(id);
          achieved.push(id);
        }
      };
      addBadge("firstFlight", true);
      addBadge("bossHunter", finiteInteger(run.bossesDefeated) >= 3);
      addBadge("firstDawn", run.mode === "classic" && firstClear);
      addBadge("titanSlayer", run.mode === "bossRush" && rushClear);
      addBadge("grazeAce", finiteInteger(run.grazes) >= 25);
      addBadge("chainMaster", finiteInteger(run.maxCombo) >= 20);
      addBadge("overdrivePilot", finiteInteger(run.activations) >= 3);
      addBadge("untouchable", run.mode === "bossRush" && rushClear && finiteInteger(run.damageTaken) === 0);
      if (achieved.length) persist();
      return achieved;
    }

    function achievements() {
      return BADGES.map(badge => ({ ...badge, unlocked:data.achievements.includes(badge.id) }));
    }

    return Object.freeze({add, top, unlock, achievements});
  }

  const api = Object.freeze({ STORAGE_KEY, LIMIT, BADGES, grade, createStore });
  root.NeonRecords = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
