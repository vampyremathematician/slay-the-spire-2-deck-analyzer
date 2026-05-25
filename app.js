/* ==========================================================================
   STS2 Deck Advisor — Application Logic
   ========================================================================== */

// ---------------------------------------------------------------------------
// Character Starting Decks
//
//   basicSt/basicBlk — starter Strikes/Defends
//   extra — unique starters, auto-categorized by card type:
//           Attack → st, Skill → blk or velocity sub
// ---------------------------------------------------------------------------

const CHARACTERS = {
  ironclad: {
    name: "Ironclad",
    basicSt: 5, basicBlk: 4,
    extra: { st: 1 },                    // Bash (Attack → ST)
  },
  silent: {
    name: "Silent",
    basicSt: 5, basicBlk: 5,
    extra: { st: 1, blk: 1 },            // Neutralize (Attack → ST), Survivor (Skill → Block)
  },
  defect: {
    name: "Defect",
    basicSt: 4, basicBlk: 4,
    extra: { velResource: 2 },            // Zap + Dualcast (Skill → Resource)
  },
  regent: {
    name: "Regent",
    basicSt: 4, basicBlk: 4,
    extra: { st: 1, velResource: 1 },     // Falling Star (Attack → ST), Venerate (Skill → Resource)
  },
  necrobinder: {
    name: "Necrobinder",
    basicSt: 4, basicBlk: 4,
    extra: { st: 1, blk: 1 },            // Unleash (Attack → ST), Bodyguard (Skill → Block)
  },
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentAct = 1;
let currentChar = null;
let basicMax = { st: 0, blk: 0 };

const counts = {
  st:          0,
  aoe:         0,
  blk:         0,
  mit:         0,
  velDraw:     0,
  velEnergy:   0,
  velPowers:   0,
  velResource: 0,
  curse:       0,
  quest:       0,
  basicSt:     0,
  basicBlk:    0,
  modSt:       0,
  modBlk:      0,
};

// ---------------------------------------------------------------------------
// Per-Act Configuration
// ---------------------------------------------------------------------------

const ACT_CONFIG = {
  1: {
    deckMin: 12, deckMax: 18,
    offensePct: 0.45, defensePct: 0.35, velocityPct: 0.20,
    aoeFloor: 1, aoeWarnPct: 0.15, blockFloorPct: 0.55,
    tip: `<strong>Act I:</strong> Front-loaded ST damage first.
          At least 1 AoE by mid-act. Block > mitigation early.
          Velocity only if offense + defense already work.`,
  },
  2: {
    deckMin: 18, deckMax: 25,
    offensePct: 0.38, defensePct: 0.38, velocityPct: 0.24,
    aoeFloor: 2, aoeWarnPct: 0.25, blockFloorPct: 0.50,
    tip: `<strong>Act II:</strong> Multi-enemy fights get nasty — need real AoE.
          Balance block + mitigation. Add velocity to cycle.
          Skip if deck is functional.`,
  },
  3: {
    deckMin: 20, deckMax: 27,
    offensePct: 0.35, defensePct: 0.38, velocityPct: 0.27,
    aoeFloor: 2, aoeWarnPct: 0.25, blockFloorPct: 0.45,
    tip: `<strong>Act III:</strong> Deck should be built. Velocity matters most.
          Only strict upgrades. Both block and mitigation online.
          Purge dead cards at every shop.`,
  },
};

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);

function setText(id, text) {
  $(id).textContent = text;
}

function setWidth(id, pct) {
  $(id).style.width = pct + "%";
}

// ---------------------------------------------------------------------------
// Splash + New Run
// ---------------------------------------------------------------------------

document.getElementById("char-grid").addEventListener("click", (e) => {
  const btn = e.target.closest(".char-btn");
  if (!btn) return;
  startRun(btn.dataset.char);
});

document.getElementById("new-run-btn").addEventListener("click", () => {
  $("app").classList.add("hidden");
  $("splash").classList.remove("hidden");
  currentChar = null;
});

function startRun(charKey) {
  const char = CHARACTERS[charKey];
  if (!char) return;

  currentChar = charKey;
  basicMax.st  = char.basicSt;
  basicMax.blk = char.basicBlk;

  // Reset all counts
  for (const key of Object.keys(counts)) counts[key] = 0;

  // Main grid = non-basic cards only (unique starters)
  counts.st          = char.extra.st          || 0;
  counts.blk         = char.extra.blk         || 0;
  counts.velDraw     = char.extra.velDraw     || 0;
  counts.velEnergy   = char.extra.velEnergy   || 0;
  counts.velPowers   = char.extra.velPowers   || 0;
  counts.velResource = char.extra.velResource || 0;

  // Basics tracked separately
  counts.basicSt  = char.basicSt;
  counts.basicBlk = char.basicBlk;

  // Reset act
  currentAct = 1;
  document.querySelectorAll(".act-btn").forEach((b, i) => {
    b.classList.toggle("active", i === 0);
  });

  setText("header-char", char.name);
  $("splash").classList.add("hidden");
  $("app").classList.remove("hidden");
  update();
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

document.getElementById("act-bar").addEventListener("click", (e) => {
  const btn = e.target.closest(".act-btn");
  if (!btn) return;
  currentAct = Number(btn.dataset.act);
  document.querySelectorAll(".act-btn").forEach((b, i) => {
    b.classList.toggle("active", i === currentAct - 1);
  });
  update();
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-key][data-delta]");
  if (!btn) return;
  const key   = btn.dataset.key;
  const delta = Number(btn.dataset.delta);
  if (!(key in counts)) return;

  counts[key] = Math.max(0, counts[key] + delta);

  // Cap basics and mods
  if (key === "basicSt")  counts.basicSt  = Math.min(counts.basicSt,  basicMax.st);
  if (key === "basicBlk") counts.basicBlk = Math.min(counts.basicBlk, basicMax.blk);
  if (key === "modSt")    counts.modSt    = Math.min(counts.modSt,    basicMax.st);
  if (key === "modBlk")   counts.modBlk   = Math.min(counts.modBlk,   basicMax.blk);

  update();
});

// ---------------------------------------------------------------------------
// Velocity total helper
// ---------------------------------------------------------------------------

function velocityTotal() {
  return counts.velDraw + counts.velEnergy + counts.velPowers + counts.velResource;
}

// ---------------------------------------------------------------------------
// Main update
// ---------------------------------------------------------------------------

function update() {
  const cfg = ACT_CONFIG[currentAct];

  const offense    = counts.st + counts.aoe + counts.basicSt + counts.modSt;
  const defense    = counts.blk + counts.mit + counts.basicBlk + counts.modBlk;
  const vel        = velocityTotal();
  const functional = offense + defense + vel;
  const dead       = counts.curse + counts.quest;
  const total      = functional + dead;

  // Counter displays
  for (const key of Object.keys(counts)) {
    const el = $(key + "-count");
    if (el) el.textContent = counts[key];
  }

  // Deck meta
  setText("deck-total", total);
  setText("deck-func", functional);
  setText("deck-target", `Target: ${cfg.deckMin}–${cfg.deckMax}`);

  const deadEl = $("deck-dead");
  if (dead > 0) {
    const pClean = deadDrawProbability(functional, total);
    deadEl.textContent = `${dead} dead (~${Math.round((1 - pClean) * 100)}% per hand)`;
  } else {
    deadEl.textContent = "";
  }

  // Ratio bar
  const pO = total ? (offense / total) * 100 : 0;
  const pD = total ? (defense / total) * 100 : 0;
  const pV = total ? (vel / total) * 100 : 0;
  const pX = total ? (dead / total) * 100 : 0;

  setWidth("bar-offense", pO); setWidth("bar-defense", pD);
  setWidth("bar-velocity", pV); setWidth("bar-dead", pX);
  setText("pct-offense", Math.round(pO) + "%"); setText("pct-defense", Math.round(pD) + "%");
  setText("pct-velocity", Math.round(pV) + "%"); setText("pct-dead", dead ? Math.round(pX) + "%" : "0%");

  // Targets
  const ref = Math.max(functional, Math.round((cfg.deckMin + cfg.deckMax) / 2));
  const tO = Math.round(ref * cfg.offensePct);
  const tD = Math.round(ref * cfg.defensePct);
  const tV = Math.round(ref * cfg.velocityPct);
  const dO = tO - offense, dD = tD - defense, dV = tV - vel;

  renderTargetCell("off", offense, tO, dO);
  renderTargetCell("def", defense, tD, dD);
  renderTargetCell("vel", vel, tV, dV);

  // Alerts
  const alerts = buildAlerts(cfg, offense, defense, dead, total);
  renderAlerts(alerts);

  // Needs
  const needs = [
    { type: "off", label: "Offense",  delta: dO, icon: "⚔️" },
    { type: "def", label: "Defense",  delta: dD, icon: "🛡️" },
    { type: "vel", label: "Velocity", delta: dV, icon: "⚡" },
  ].sort((a, b) => b.delta - a.delta);

  const isOversize  = total > cfg.deckMax;
  const isUndersize = functional < cfg.deckMin;
  const allMet      = dO <= 0 && dD <= 0 && dV <= 0;
  const topNeed     = needs[0];

  renderVerdict(resolveVerdict(cfg, total, isOversize, isUndersize, allMet, topNeed, offense, defense));
  renderPriorityList(needs, allMet);
  renderFlowchart(cfg, total, isOversize, isUndersize, allMet, topNeed, alerts);
  $("tips").innerHTML = cfg.tip;
}

// ---------------------------------------------------------------------------
// Dead-draw probability
// ---------------------------------------------------------------------------

function deadDrawProbability(functional, total) {
  let p = 1;
  for (let i = 0; i < 5; i++) p *= Math.max(0, functional - i) / Math.max(1, total - i);
  return p;
}

// ---------------------------------------------------------------------------
// Target cell
// ---------------------------------------------------------------------------

function renderTargetCell(key, actual, target, delta) {
  setText("target-actual-" + key, actual);
  setText("target-ideal-" + key, target);
  const el = $("target-diff-" + key);
  if (delta > 0)      { el.textContent = "need +" + delta; el.className = "target-cell__diff target-cell__diff--need"; }
  else if (delta < 0) { el.textContent = delta + " over";  el.className = "target-cell__diff target-cell__diff--over"; }
  else                { el.textContent = "✓";               el.className = "target-cell__diff target-cell__diff--ok"; }
}

// ---------------------------------------------------------------------------
// Alerts (max 3)
// ---------------------------------------------------------------------------

function buildAlerts(cfg, offense, defense, dead, total) {
  const alerts = [];
  const vel = velocityTotal();
  const totalBlk = counts.blk + counts.basicBlk + counts.modBlk;
  const totalSt  = counts.st + counts.basicSt + counts.modSt;

  // AoE
  if (offense > 0 && counts.aoe === 0)
    alerts.push({ level: currentAct >= 2 ? "critical" : "warn", icon: "⚔️", text: "No AoE — multi-enemy fights will stall." });
  else if (offense >= 3 && counts.aoe < cfg.aoeFloor)
    alerts.push({ level: "warn", icon: "⚔️", text: `Only ${counts.aoe} AoE in ${offense} offense. Target ${cfg.aoeFloor}+.` });

  // Block
  if (defense > 0 && totalBlk === 0)
    alerts.push({ level: "critical", icon: "🛡️", text: "No block — mitigation alone won't stop damage." });
  else if (defense >= 3 && totalBlk / defense < cfg.blockFloorPct)
    alerts.push({ level: "warn", icon: "🛡️", text: `Block ${Math.round((totalBlk / defense) * 100)}% — need >${Math.round(cfg.blockFloorPct * 100)}%.` });

  // Mitigation
  if (defense > 0 && counts.mit === 0 && currentAct >= 2)
    alerts.push({ level: "warn", icon: "🛡️", text: "No mitigation — pure block overwhelmed late." });

  // Dead
  if (dead > 0) {
    const pct = Math.round((1 - deadDrawProbability(offense + defense + vel, total)) * 100);
    alerts.push({ level: "purge", icon: "🔥",
      text: dead >= 2 ? `${dead} dead cards (~${pct}% per hand) — purge ASAP.` : `1 dead card (~${pct}% per hand) — purge at shop.`
    });
  }

  // Basics remaining
  const basicsLeft = counts.basicSt + counts.basicBlk;
  if (basicsLeft > 0)
    alerts.push({ level: "warn", icon: "🗑️", text: `${basicsLeft} unmodified basic${basicsLeft > 1 ? "s" : ""} (${counts.basicSt}S / ${counts.basicBlk}D)` });

  return alerts;
}

function renderAlerts(alerts) {
  const container = $("alerts");
  if (!alerts.length) { container.innerHTML = ""; return; }
  container.innerHTML = alerts.slice(0, 3).map((a) =>
    `<div class="alert alert--${a.level}"><span class="alert__icon">${a.icon}</span><span>${a.text}</span></div>`
  ).join("");
}

// ---------------------------------------------------------------------------
// Sub-type advice
// ---------------------------------------------------------------------------

function subAdvice(type, cfg, offense, defense) {
  const totalBlk = counts.blk + counts.basicBlk + counts.modBlk;
  if (type === "off") {
    if (counts.aoe === 0) return "Prioritize AoE.";
    if (offense >= 3 && counts.aoe / offense < cfg.aoeWarnPct) return "Lean AoE.";
    return "ST or AoE.";
  }
  if (type === "def") {
    if (totalBlk === 0) return "Need block.";
    if (defense >= 3 && totalBlk / defense < cfg.blockFloorPct) return "Lean block.";
    if (counts.mit === 0 && currentAct >= 2) return "Lean mitigation.";
    return "Block or mitigation.";
  }
  return "Draw, energy, powers, or resource gen.";
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

function resolveVerdict(cfg, total, over, under, allMet, top, offense, defense) {
  if (total === 0) return { cls: "pick-offense", icon: "⚔️", title: "Add Cards", reason: "Empty deck — start with damage." };
  if (over && allMet) return { cls: "skip", icon: "⏭️", title: "Skip", reason: `Over ${cfg.deckMax}, ratios met. Swap only if strictly better.` };
  if (allMet && !under) return { cls: "balanced", icon: "✦", title: "Balanced — Skip", reason: "Ratios solid. Only pick a strict upgrade." };
  if (over) return { cls: "skip", icon: "⏭️", title: "Skip — Trim", reason: `Bloated at ${total}. Need ${top.label.toLowerCase()} but remove first.` };
  if (top.delta <= 0) return { cls: "balanced", icon: "✦", title: "Lean Skip", reason: "Ratios healthy. Only strict upgrades." };
  const m = { off: "offense", def: "defense", vel: "velocity" };
  return { cls: "pick-" + m[top.type], icon: top.icon, title: "Pick " + top.label, reason: `Short ${top.delta}. ${subAdvice(top.type, cfg, offense, defense)}` };
}

function renderVerdict(v) {
  $("verdict").className = `verdict verdict--${v.cls}`;
  setText("verdict-icon", v.icon); setText("verdict-title", v.title); setText("verdict-reason", v.reason);
}

// ---------------------------------------------------------------------------
// Priority list
// ---------------------------------------------------------------------------

function renderPriorityList(needs, allMet) {
  const list = $("priority-list"); list.innerHTML = "";
  const cls = { off: "offense", def: "defense", vel: "velocity" };

  needs.forEach((n, i) => {
    const li = document.createElement("li");
    li.className = n.delta > 0 ? `priority-list__item--${cls[n.type]}` : "";
    const st = n.delta > 0 ? `Need +${n.delta}` : n.delta < 0 ? `${n.delta} over` : "✓ Met";
    let sub = "";
    if (n.delta > 0) {
      if (n.type === "off") sub = counts.aoe === 0 ? " → AoE" : "";
      if (n.type === "def") {
        const tBlk = counts.blk + counts.basicBlk + counts.modBlk;
        sub = tBlk === 0 ? " → Block" : (counts.mit === 0 && currentAct >= 2 ? " → Mit" : "");
      }
    }
    li.innerHTML = `<span class="priority-rank">${i + 1}</span><span class="priority-tag priority-tag--${cls[n.type]}">${n.label}</span><span>${st}${sub}</span>`;
    list.appendChild(li);
  });

  const sl = document.createElement("li"); sl.className = "priority-list__item--skip";
  sl.innerHTML = `<span class="priority-rank">${allMet ? "★" : "—"}</span><span class="priority-tag priority-tag--skip">Skip</span><span>${allMet ? "Needs met — skip unless upgrade" : "Only if all options bad"}</span>`;
  list.appendChild(sl);
}

// ---------------------------------------------------------------------------
// Flowchart
// ---------------------------------------------------------------------------

function renderFlowchart(cfg, total, over, under, allMet, top, alerts) {
  const s = [], ok = total >= cfg.deckMin && total <= cfg.deckMax;
  s.push({ q: `Deck ${total} — ${cfg.deckMin}–${cfg.deckMax}?`, a: over ? `Over by ${total - cfg.deckMax}.` : under ? `Under by ${cfg.deckMin - total}.` : "In range.", n: ok ? "yes" : "no", h: !ok });
  s.push({ q: "Category ratios?", a: allMet ? "All met." : `Gap: ${top.label} +${Math.max(0, top.delta)}`, n: allMet ? "yes" : "no", h: !allMet });
  const real = alerts.filter(a => a.level !== "purge" && a.level !== "warn" || !a.text.includes("unmodified"));
  if (real.length) { const w = real.find(a => a.level === "critical") || real[0]; s.push({ q: "Sub-types?", a: w.text, n: w.level === "critical" ? "no" : "warn", h: true }); }
  else s.push({ q: "Sub-types?", a: "ST/AoE + Block/Mit OK.", n: "yes", h: false });
  if (over && allMet) s.push({ q: "Action?", a: "SKIP. Full and balanced.", n: "active", h: true });
  else if (allMet && !under) s.push({ q: "Action?", a: "SKIP unless strict upgrade.", n: "active", h: true });
  else if (over) s.push({ q: "Action?", a: `Exceptional ${top.label.toLowerCase()} only, then remove.`, n: "active", h: true });
  else if (top.delta > 0) s.push({ q: "Action?", a: `PICK ${top.label.toUpperCase()}.`, n: "active", h: true });
  else s.push({ q: "Action?", a: "SKIP unless upgrade.", n: "active", h: true });

  $("flowchart").innerHTML = s.map((x, i) =>
    `<div class="flow-step"><div class="flow-node flow-node--${x.n}">${i + 1}</div><div><div class="flow-question">${x.q}</div><div class="flow-answer${x.h ? " flow-answer--highlight" : ""}">${x.a}</div></div></div>${i < s.length - 1 ? '<div class="flow-connector"></div>' : ""}`
  ).join("");
}
