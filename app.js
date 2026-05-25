/* ==========================================================================
   STS2 Deck Advisor — Application Logic
   ========================================================================== */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentAct = 1;

const counts = {
  st:    5,
  aoe:   0,
  blk:   5,
  mit:   0,
  vel:   0,
  curse: 0,
  quest: 0,
};

// ---------------------------------------------------------------------------
// Per-Act Configuration
//
//   deckMin / deckMax   — target functional deck size range
//   offensePct / etc.   — ideal ratio of functional cards
//   aoeFloor            — minimum AoE cards before warning
//   aoeWarnPct          — AoE share of offense below which we warn
//   blockFloorPct       — block share of defense below which we warn
// ---------------------------------------------------------------------------

const ACT_CONFIG = {
  1: {
    deckMin: 12,
    deckMax: 18,
    offensePct:  0.45,
    defensePct:  0.35,
    velocityPct: 0.20,
    aoeFloor:     1,
    aoeWarnPct:   0.15,
    blockFloorPct: 0.55,
    tip: `<strong>Act I:</strong> Front-loaded ST damage first.
          At least 1 AoE by mid-act. Block > mitigation early.
          Velocity only if offense + defense already work.`,
  },
  2: {
    deckMin: 18,
    deckMax: 25,
    offensePct:  0.38,
    defensePct:  0.38,
    velocityPct: 0.24,
    aoeFloor:     2,
    aoeWarnPct:   0.25,
    blockFloorPct: 0.50,
    tip: `<strong>Act II:</strong> Multi-enemy fights get nasty — need real AoE.
          Balance block + mitigation. Add velocity to cycle.
          Skip if deck is functional.`,
  },
  3: {
    deckMin: 20,
    deckMax: 27,
    offensePct:  0.35,
    defensePct:  0.38,
    velocityPct: 0.27,
    aoeFloor:     2,
    aoeWarnPct:   0.25,
    blockFloorPct: 0.45,
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
  const btn = e.target.closest(".stepper__btn");
  if (!btn) return;
  const key   = btn.dataset.key;
  const delta = Number(btn.dataset.delta);
  counts[key] = Math.max(0, counts[key] + delta);
  update();
});

// ---------------------------------------------------------------------------
// Main update
// ---------------------------------------------------------------------------

function update() {
  const cfg = ACT_CONFIG[currentAct];

  // Derived totals
  const offense    = counts.st + counts.aoe;
  const defense    = counts.blk + counts.mit;
  const functional = offense + defense + counts.vel;
  const dead       = counts.curse + counts.quest;
  const total      = functional + dead;

  // ---- Counter displays ----
  for (const key of Object.keys(counts)) {
    setText(key + "-count", counts[key]);
  }

  // ---- Deck size meta ----
  setText("deck-total", total);
  setText("deck-func", functional);
  setText("deck-target", `Target: ${cfg.deckMin}–${cfg.deckMax}`);

  const deadEl = $("deck-dead");
  if (dead > 0) {
    const probClean = deadDrawProbability(functional, total);
    deadEl.textContent = `${dead} dead (~${Math.round((1 - probClean) * 100)}% per hand)`;
  } else {
    deadEl.textContent = "";
  }

  // ---- Purge reminder ----
  const purgeBox = $("purge-reminder");
  if (dead > 0) {
    purgeBox.classList.remove("hidden");
    $("purge-text").textContent = dead >= 2
      ? `${dead} dead cards — purge at shop ASAP. Every dead draw costs you.`
      : "1 dead card in deck — purge at next shop opportunity.";
  } else {
    purgeBox.classList.add("hidden");
  }

  // ---- Ratio bar ----
  const pctOff = total ? (offense / total) * 100 : 0;
  const pctDef = total ? (defense / total) * 100 : 0;
  const pctVel = total ? (counts.vel / total) * 100 : 0;
  const pctDed = total ? (dead / total) * 100 : 0;

  setWidth("bar-offense",  pctOff);
  setWidth("bar-defense",  pctDef);
  setWidth("bar-velocity", pctVel);
  setWidth("bar-dead",     pctDed);

  setText("pct-offense",  Math.round(pctOff) + "%");
  setText("pct-defense",  Math.round(pctDef) + "%");
  setText("pct-velocity", Math.round(pctVel) + "%");
  setText("pct-dead",     dead ? Math.round(pctDed) + "%" : "0%");

  // ---- Ideal targets ----
  const idealMid = Math.round((cfg.deckMin + cfg.deckMax) / 2);
  const reference = Math.max(functional, idealMid);

  const targetOff = Math.round(reference * cfg.offensePct);
  const targetDef = Math.round(reference * cfg.defensePct);
  const targetVel = Math.round(reference * cfg.velocityPct);

  const deltaOff = targetOff - offense;
  const deltaDef = targetDef - defense;
  const deltaVel = targetVel - counts.vel;

  renderTargetCell("off", offense,    targetOff, deltaOff);
  renderTargetCell("def", defense,    targetDef, deltaDef);
  renderTargetCell("vel", counts.vel, targetVel, deltaVel);

  // ---- Sub-type warnings ----
  const warnings = buildSubWarnings(cfg, offense, defense, dead, total);
  renderSubWarnings(warnings);

  // ---- Needs sorted by greatest gap ----
  const needs = [
    { type: "off", label: "Offense",  delta: deltaOff, icon: "⚔️" },
    { type: "def", label: "Defense",  delta: deltaDef, icon: "🛡️" },
    { type: "vel", label: "Velocity", delta: deltaVel, icon: "⚡" },
  ].sort((a, b) => b.delta - a.delta);

  const isOversize = total > cfg.deckMax;
  const isUndersize = functional < cfg.deckMin;
  const allMet = deltaOff <= 0 && deltaDef <= 0 && deltaVel <= 0;
  const topNeed = needs[0];

  // ---- Verdict ----
  const verdict = resolveVerdict(cfg, total, isOversize, isUndersize, allMet, topNeed);
  renderVerdict(verdict);

  // ---- Priority list ----
  renderPriorityList(needs, allMet);

  // ---- Flowchart ----
  renderFlowchart(cfg, total, isOversize, isUndersize, allMet, topNeed, warnings);

  // ---- Tips ----
  $("tips").innerHTML = cfg.tip;
}

// ---------------------------------------------------------------------------
// Dead-draw probability (hypergeometric: P(all 5 draws are clean))
// ---------------------------------------------------------------------------

function deadDrawProbability(functional, total) {
  let pClean = 1;
  for (let i = 0; i < 5; i++) {
    pClean *= Math.max(0, functional - i) / Math.max(1, total - i);
  }
  return pClean;
}

// ---------------------------------------------------------------------------
// Target cell renderer
// ---------------------------------------------------------------------------

function renderTargetCell(key, actual, target, delta) {
  setText("target-actual-" + key, actual);
  setText("target-ideal-" + key, target);

  const el = $("target-diff-" + key);
  if (delta > 0) {
    el.textContent = "need +" + delta;
    el.className = "target-cell__diff target-cell__diff--need";
  } else if (delta < 0) {
    el.textContent = delta + " over";
    el.className = "target-cell__diff target-cell__diff--over";
  } else {
    el.textContent = "✓";
    el.className = "target-cell__diff target-cell__diff--ok";
  }
}

// ---------------------------------------------------------------------------
// Sub-type warnings
// ---------------------------------------------------------------------------

function buildSubWarnings(cfg, offense, defense, dead, total) {
  const w = [];

  // AoE checks
  if (offense > 0 && counts.aoe === 0) {
    w.push({ text: "No AoE — multi fights will stall.", critical: currentAct >= 2 });
  } else if (offense >= 3 && counts.aoe < cfg.aoeFloor) {
    w.push({ text: `Only ${counts.aoe} AoE in ${offense} offense. Target ${cfg.aoeFloor}+.`, critical: false });
  } else if (offense >= 4 && counts.aoe / offense < cfg.aoeWarnPct) {
    w.push({ text: `AoE ${Math.round((counts.aoe / offense) * 100)}% — below ~${Math.round(cfg.aoeWarnPct * 100)}%.`, critical: false });
  }

  // Block checks
  if (defense > 0 && counts.blk === 0) {
    w.push({ text: "No block — mitigation alone won't stop hits.", critical: true });
  } else if (defense >= 3 && counts.blk / defense < cfg.blockFloorPct) {
    w.push({ text: `Block ${Math.round((counts.blk / defense) * 100)}% of defense — need >${Math.round(cfg.blockFloorPct * 100)}%.`, critical: false });
  }

  // Mitigation check
  if (defense > 0 && counts.mit === 0 && currentAct >= 2) {
    w.push({ text: "No mitigation — pure block overwhelmed late.", critical: false });
  }

  // Dead cards
  if (dead > 0) {
    w.push({ text: `${dead} dead card${dead > 1 ? "s" : ""} diluting draws.`, critical: dead >= 2 || total <= 15 });
  }

  return w;
}

function renderSubWarnings(warnings) {
  $("sub-warnings").innerHTML = warnings.map((w) =>
    `<div class="sub-warning${w.critical ? " sub-warning--critical" : ""}">
       <span class="sub-warning__icon">${w.critical ? "✕" : "⚠"}</span>
       <span>${w.text}</span>
     </div>`
  ).join("");
}

// ---------------------------------------------------------------------------
// Sub-type advice (used in verdict reason text)
// ---------------------------------------------------------------------------

function subAdvice(type, cfg, offense, defense) {
  if (type === "off") {
    if (counts.aoe === 0) return "Prioritize AoE.";
    if (offense >= 3 && counts.aoe / offense < cfg.aoeWarnPct) return "Lean AoE.";
    return "ST or AoE.";
  }
  if (type === "def") {
    if (counts.blk === 0) return "Need block.";
    if (defense >= 3 && counts.blk / defense < cfg.blockFloorPct) return "Lean block.";
    if (counts.mit === 0 && currentAct >= 2) return "Lean mitigation.";
    return "Block or mitigation.";
  }
  return "Draw, energy, powers, resource gen.";
}

// ---------------------------------------------------------------------------
// Verdict logic — always returns a pick or skip, never "purge"
// ---------------------------------------------------------------------------

function resolveVerdict(cfg, total, isOversize, isUndersize, allMet, topNeed) {
  const offense = counts.st + counts.aoe;
  const defense = counts.blk + counts.mit;

  if (total === 0) {
    return { cls: "pick-offense", icon: "⚔️", title: "Add Cards", reason: "Empty deck — start with damage." };
  }
  if (isOversize && allMet) {
    return { cls: "skip", icon: "⏭️", title: "Skip", reason: `Over ${cfg.deckMax}, ratios met. Only swap if strictly better.` };
  }
  if (allMet && !isUndersize) {
    return { cls: "balanced", icon: "✦", title: "Balanced — Skip", reason: "Ratios solid. Only pick a strict upgrade." };
  }
  if (isOversize) {
    return { cls: "skip", icon: "⏭️", title: "Skip — Trim", reason: `Bloated at ${total}. Need ${topNeed.label.toLowerCase()} but remove weak cards first.` };
  }
  if (topNeed.delta <= 0) {
    return { cls: "balanced", icon: "✦", title: "Lean Skip", reason: "Ratios healthy. Only strict upgrades." };
  }

  const typeMap = { off: "offense", def: "defense", vel: "velocity" };
  return {
    cls:    "pick-" + typeMap[topNeed.type],
    icon:   topNeed.icon,
    title:  "Pick " + topNeed.label,
    reason: `Short ${topNeed.delta}. ${subAdvice(topNeed.type, cfg, offense, defense)}`,
  };
}

function renderVerdict(v) {
  $("verdict").className = `verdict verdict--${v.cls}`;
  setText("verdict-icon", v.icon);
  setText("verdict-title", v.title);
  setText("verdict-reason", v.reason);
}

// ---------------------------------------------------------------------------
// Priority list
// ---------------------------------------------------------------------------

function renderPriorityList(needs, allMet) {
  const list = $("priority-list");
  list.innerHTML = "";

  const typeClasses = { off: "offense", def: "defense", vel: "velocity" };

  needs.forEach((need, i) => {
    const li = document.createElement("li");
    li.className = need.delta > 0 ? `priority-list__item--${typeClasses[need.type]}` : "";

    const statusText = need.delta > 0
      ? `Need +${need.delta}`
      : need.delta < 0
        ? `${need.delta} over`
        : "✓ Met";

    let subHint = "";
    if (need.delta > 0) {
      if (need.type === "off") subHint = counts.aoe === 0 ? " → AoE" : "";
      if (need.type === "def") subHint = counts.blk === 0 ? " → Block" : (counts.mit === 0 && currentAct >= 2 ? " → Mit" : "");
    }

    li.innerHTML = `
      <span class="priority-rank">${i + 1}</span>
      <span class="priority-tag priority-tag--${typeClasses[need.type]}">${need.label}</span>
      <span>${statusText}${subHint}</span>`;
    list.appendChild(li);
  });

  // Skip entry
  const skipLi = document.createElement("li");
  skipLi.className = "priority-list__item--skip";
  skipLi.innerHTML = `
    <span class="priority-rank">${allMet ? "★" : "—"}</span>
    <span class="priority-tag priority-tag--skip">Skip</span>
    <span>${allMet ? "Needs met — skip unless upgrade" : "Only if all options bad"}</span>`;
  list.appendChild(skipLi);
}

// ---------------------------------------------------------------------------
// Flowchart
// ---------------------------------------------------------------------------

function renderFlowchart(cfg, total, isOversize, isUndersize, allMet, topNeed, warnings) {
  const steps = [];
  const sizeOk = total >= cfg.deckMin && total <= cfg.deckMax;

  // Step 1: Deck size
  steps.push({
    question: `Deck ${total} — ${cfg.deckMin}–${cfg.deckMax}?`,
    answer:   isOversize ? `Over by ${total - cfg.deckMax}.` : isUndersize ? `Under by ${cfg.deckMin - total}.` : "In range.",
    node:     sizeOk ? "yes" : "no",
    highlight: !sizeOk,
  });

  // Step 2: Category ratios
  steps.push({
    question: "Category ratios?",
    answer:   allMet ? "All met." : `Gap: ${topNeed.label} +${Math.max(0, topNeed.delta)}`,
    node:     allMet ? "yes" : "no",
    highlight: !allMet,
  });

  // Step 3: Sub-type balance
  if (warnings.length > 0) {
    const worst = warnings.find((w) => w.critical) || warnings[0];
    steps.push({ question: "Sub-types?", answer: worst.text, node: worst.critical ? "no" : "warn", highlight: true });
  } else {
    steps.push({ question: "Sub-types?", answer: "ST/AoE + Block/Mit OK.", node: "yes", highlight: false });
  }

  // Step 4: Action
  if (isOversize && allMet) {
    steps.push({ question: "Action?", answer: "SKIP. Full and balanced.", node: "active", highlight: true });
  } else if (allMet && !isUndersize) {
    steps.push({ question: "Action?", answer: "SKIP unless strict upgrade.", node: "active", highlight: true });
  } else if (isOversize) {
    steps.push({ question: "Action?", answer: `Exceptional ${topNeed.label.toLowerCase()} only, then remove.`, node: "active", highlight: true });
  } else if (topNeed.delta > 0) {
    steps.push({ question: "Action?", answer: `PICK ${topNeed.label.toUpperCase()}.`, node: "active", highlight: true });
  } else {
    steps.push({ question: "Action?", answer: "SKIP unless upgrade.", node: "active", highlight: true });
  }

  // Render
  $("flowchart").innerHTML = steps.map((step, i) => `
    <div class="flow-step">
      <div class="flow-node flow-node--${step.node}">${i + 1}</div>
      <div>
        <div class="flow-question">${step.question}</div>
        <div class="flow-answer${step.highlight ? " flow-answer--highlight" : ""}">${step.answer}</div>
      </div>
    </div>
    ${i < steps.length - 1 ? '<div class="flow-connector"></div>' : ""}`
  ).join("");
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

update();
