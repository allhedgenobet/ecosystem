const c = document.getElementById('c');
const x = c.getContext('2d');
const r = Math.random;

const BRANCH = 0.022;
const FADE = 0.05;
const STEP = 1.12;
const DENSITY_REF = 5000;

const EATER_BASE = 3;
const EATER_MIN = 2;
const EATER_SAMPLES = 6;
const EATER_REPRO_FOOD = 8;
const EATER_REPRO_BASE = 0.12;
const EATER_REPRO_SMALL_BONUS = 0.22;

const PRED_BASE = 1;
const PRED_MIN = 1;
const PRED_SAMPLES = 8;
const PRED_REPRO_FOOD = 10;
const PRED_REPRO_BASE = 0.1;

const APEX_BASE = 1;
const APEX_MIN = 1;
const APEX_SAMPLES = 8;
const APEX_REPRO_FOOD = 10;
const APEX_REPRO_BASE = 0.1;

const EDGE_PAD = 56;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mut = (v, d, lo, hi) => clamp(v + (r() * 2 - 1) * d, lo, hi);

const resolveFights = (agents, strikeChance, rangeMul, foodGain, color) => {
  if (agents.length < 2) return agents;

  const dead = new Uint8Array(agents.length);
  for (let i = 0; i < agents.length; i += 1) {
    if (dead[i] || r() > 0.24) continue;

    const j = (r() * agents.length) | 0;
    if (j === i || dead[j]) continue;

    const a = agents[i];
    const b = agents[j];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const range = (a.rad + b.rad) * rangeMul;
    if (dx * dx + dy * dy > range * range) continue;
    if (r() > strikeChance) continue;

    const pa = a.rad * 0.95 + a.sp * 0.7 + Math.max(0, a.food) * 0.06 + r() * 0.7;
    const pb = b.rad * 0.95 + b.sp * 0.7 + Math.max(0, b.food) * 0.06 + r() * 0.7;
    const aWins = pa >= pb;

    const winner = aWins ? a : b;
    const loserIndex = aWins ? j : i;
    const loser = aWins ? b : a;
    dead[loserIndex] = 1;
    winner.food += foodGain + loser.rad * 0.08;

    x.strokeStyle = color;
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(a.x, a.y);
    x.lineTo(b.x, b.y);
    x.stroke();
  }

  const survivors = [];
  for (let i = 0; i < agents.length; i += 1) {
    if (!dead[i]) survivors.push(agents[i]);
  }
  return survivors;
};

let w = 0;
let h = 0;
let cx = 0;
let cy = 0;
let wind = 0;

let minX = 0;
let minY = 0;
let maxX = 0;
let maxY = 0;

let tips = [];
let eaters = [];
let predators = [];
let apexes = [];

const inBounds2D = (px, py) => px >= minX && px <= maxX && py >= minY && py <= maxY;

const spawn = (scale = 1, px = minX + r() * (maxX - minX), py = minY + r() * (maxY - minY)) => {
  tips.push({
    x: px,
    y: py,
    a: r() * Math.PI * 2,
    w: (1.8 + r() * 1.3) * scale,
    h: 100 + r() * 45,
    br: 0.8 + r() * 0.6,
    j: 0.014 + r() * 0.03,
    sp: 0.9 + r() * 0.45,
    cv: (r() * 2 - 1) * 0.022,
  });
};

const spawnEater = () => {
  eaters.push({
    x: minX + r() * (maxX - minX),
    y: minY + r() * (maxY - minY),
    a: r() * Math.PI * 2,
    sp: 1.6 + r() * 1.6,
    rad: 6 + r() * 7,
    food: 0,
    tb: (r() * 2 - 1) * 0.035,
  });
};

const spawnPred = () => {
  predators.push({
    x: minX + r() * (maxX - minX),
    y: minY + r() * (maxY - minY),
    a: r() * Math.PI * 2,
    sp: 2.1 + r() * 1.5,
    rad: 6 + r() * 5,
    food: 0,
    tb: (r() * 2 - 1) * 0.03,
  });
};

const spawnApex = () => {
  apexes.push({
    x: minX + r() * (maxX - minX),
    y: minY + r() * (maxY - minY),
    a: r() * Math.PI * 2,
    sp: 2.2 + r() * 1.6,
    rad: 6 + r() * 6,
    food: 0,
    tb: (r() * 2 - 1) * 0.028,
  });
};

function init() {
  const dpr = window.devicePixelRatio || 1;
  w = window.innerWidth;
  h = window.innerHeight;
  cx = w * 0.5;
  cy = h * 0.5;

  c.width = Math.floor(w * dpr);
  c.height = Math.floor(h * dpr);
  x.setTransform(dpr, 0, 0, dpr, 0, 0);

  minX = EDGE_PAD;
  minY = EDGE_PAD;
  maxX = w - EDGE_PAD;
  maxY = h - EDGE_PAD;

  x.fillStyle = '#000';
  x.fillRect(0, 0, w, h);

  wind = 0;
  tips = [];
  eaters = [];
  predators = [];
  apexes = [];

  for (let i = 0; i < 4; i += 1) spawn(0.8 + r() * 0.4);
  for (let i = 0; i < EATER_BASE; i += 1) spawnEater();
  for (let i = 0; i < PRED_BASE; i += 1) spawnPred();
  for (let i = 0; i < APEX_BASE; i += 1) spawnApex();
}

function loop() {
  x.fillStyle = `rgba(0,0,0,${FADE})`;
  x.fillRect(0, 0, w, h);

  wind *= 0.985;
  wind += (r() * 2 - 1) * 0.00045;
  wind = clamp(wind, -0.06, 0.06);

  if (r() < 0.004 || tips.length < 12) {
    spawn(0.55 + r() * 0.7);
  }

  if (tips.length > DENSITY_REF * 0.75 && r() < 0.012) {
    spawnEater();
  }
  if (eaters.length < EATER_MIN) spawnEater();
  if (predators.length < PRED_MIN) spawnPred();
  if (apexes.length < APEX_MIN) spawnApex();

  const load = clamp(tips.length / DENSITY_REF, 0, 2);
  const branchScale = clamp(1 - load * 0.75, 0.08, 1);

  const next = [];
  for (const t of tips) {
    t.cv = mut(t.cv, 0.00035, -0.04, 0.04);
    t.a += t.cv * 1.2 + (r() * 2 - 1) * (t.j * 0.85) + wind * 0.28;

    let nx = t.x + Math.cos(t.a) * STEP * t.sp;
    let ny = t.y + Math.sin(t.a) * STEP * t.sp;

    if (!inBounds2D(nx, ny)) {
      const towardCenter = Math.atan2(cy - t.y, cx - t.x);
      t.a = t.a * 0.7 + towardCenter * 0.3;
      nx = clamp(nx, minX, maxX);
      ny = clamp(ny, minY, maxY);
    }

    x.strokeStyle = `hsla(${t.h},100%,65%,0.76)`;
    x.lineWidth = Math.max(0.25, t.w);
    x.beginPath();
    x.moveTo(t.x, t.y);
    x.lineTo(nx, ny);
    x.stroke();

    t.x = nx;
    t.y = ny;

    if (r() < BRANCH * t.br * branchScale) {
      const split = Math.PI * (0.18 + r() * 0.22);
      const tw = t.w * 0.8;
      const th = mut(t.h, 8, 85, 150);
      const br = mut(t.br, 0.08, 0.45, 1.8);
      const j = mut(t.j, 0.0025, 0.006, 0.05);
      const sp = mut(t.sp, 0.03, 0.7, 1.8);
      let cv = mut(t.cv, 0.002, -0.05, 0.05);
      if (r() < 0.18) cv *= -1;

      x.fillStyle = 'rgba(220,255,220,0.9)';
      x.beginPath();
      x.arc(t.x, t.y, Math.max(1.2, 1.8 + tw * 0.35), 0, Math.PI * 2);
      x.fill();

      next.push({ x: t.x, y: t.y, a: t.a - split, w: tw, h: th, br, j, sp, cv });
      next.push({ x: t.x, y: t.y, a: t.a + split, w: tw, h: th, br, j, sp, cv });
    }

    next.push(t);
  }

  const eaterLoad = clamp(next.length / DENSITY_REF, 0.9, 2.8);
  for (const g of eaters) {
    g.food = g.food * 0.996 - 0.02;
    g.a += g.tb + (r() * 2 - 1) * 0.06 + wind * 0.05;
    if (r() < 0.006) g.tb *= -1;

    if (next.length > 0 && r() < 0.7) {
      let target = next[(r() * next.length) | 0];
      let bestD2 = Infinity;
      for (let si = 0; si < EATER_SAMPLES; si += 1) {
        const candidate = next[(r() * next.length) | 0];
        const dx = candidate.x - g.x;
        const dy = candidate.y - g.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          target = candidate;
        }
      }
      const tx = target.x - g.x;
      const ty = target.y - g.y;
      const ta = Math.atan2(ty, tx);
      const delta = Math.atan2(Math.sin(ta - g.a), Math.cos(ta - g.a));
      g.a += delta * 0.2;
    }

    g.x += Math.cos(g.a) * g.sp * eaterLoad;
    g.y += Math.sin(g.a) * g.sp * eaterLoad;

    if (!inBounds2D(g.x, g.y)) {
      const towardCenter = Math.atan2(cy - g.y, cx - g.x);
      g.a = g.a * 0.55 + towardCenter * 0.45;
      g.x = clamp(g.x, minX, maxX);
      g.y = clamp(g.y, minY, maxY);
    }

    x.fillStyle = 'rgba(255,120,120,0.78)';
    x.beginPath();
    x.arc(g.x, g.y, Math.max(1.2, g.rad * 0.24), 0, Math.PI * 2);
    x.fill();
  }

  const survivors = [];
  for (const t of next) {
    let eaten = false;
    for (let gi = 0; gi < eaters.length; gi += 1) {
      const g = eaters[gi];
      const dx = t.x - g.x;
      const dy = t.y - g.y;
      const eatR = g.rad * eaterLoad * (t.w < 1.05 ? 1.35 : 1.05);
      if (dx * dx + dy * dy < eatR * eatR) {
        eaten = true;
        g.food += t.w < 1.05 ? 1.3 : 0.8;
        break;
      }
    }
    if (!eaten) survivors.push(t);
  }

  const babies = [];
  for (const g of eaters) {
    const smallBias = clamp((12 - g.rad) / 7, 0, 1);
    const reproChance = EATER_REPRO_BASE + smallBias * EATER_REPRO_SMALL_BONUS;
    if (g.food > EATER_REPRO_FOOD && r() < reproChance) {
      g.food *= 0.55;
      babies.push({
        x: clamp(g.x + (r() * 2 - 1) * 12, minX, maxX),
        y: clamp(g.y + (r() * 2 - 1) * 12, minY, maxY),
        a: g.a + (r() * 2 - 1) * 0.6,
        sp: clamp(g.sp + (r() * 2 - 1) * 0.18, 1.2, 4.2),
        rad: clamp(g.rad - 0.25 + (r() * 2 - 1) * 0.7, 3.8, 12),
        food: g.food * 0.35,
        tb: clamp(g.tb + (r() * 2 - 1) * 0.01, -0.06, 0.06),
      });

      x.strokeStyle = 'rgba(255,180,180,0.85)';
      x.lineWidth = 1.2;
      x.beginPath();
      x.arc(g.x, g.y, Math.max(2, g.rad * 0.7), 0, Math.PI * 2);
      x.stroke();
    }
  }
  if (babies.length > 0) eaters.push(...babies);

  const predLoad = clamp(eaters.length / 120, 0.8, 2.4);
  for (const p of predators) {
    p.food = p.food * 0.995 - 0.018;
    p.a += p.tb + (r() * 2 - 1) * 0.055 + wind * 0.035;
    if (r() < 0.005) p.tb *= -1;

    if (eaters.length > 0 && r() < 0.78) {
      let target = eaters[(r() * eaters.length) | 0];
      let bestD2 = Infinity;
      for (let si = 0; si < PRED_SAMPLES; si += 1) {
        const candidate = eaters[(r() * eaters.length) | 0];
        const dx = candidate.x - p.x;
        const dy = candidate.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          target = candidate;
        }
      }
      const tx = target.x - p.x;
      const ty = target.y - p.y;
      const ta = Math.atan2(ty, tx);
      const delta = Math.atan2(Math.sin(ta - p.a), Math.cos(ta - p.a));
      p.a += delta * 0.24;
    }

    p.x += Math.cos(p.a) * p.sp * predLoad;
    p.y += Math.sin(p.a) * p.sp * predLoad;

    if (!inBounds2D(p.x, p.y)) {
      const towardCenter = Math.atan2(cy - p.y, cx - p.x);
      p.a = p.a * 0.5 + towardCenter * 0.5;
      p.x = clamp(p.x, minX, maxX);
      p.y = clamp(p.y, minY, maxY);
    }

    x.fillStyle = 'rgba(120,170,255,0.85)';
    x.beginPath();
    x.arc(p.x, p.y, Math.max(1.3, p.rad * 0.3), 0, Math.PI * 2);
    x.fill();
  }

  const eaterSurvivors = [];
  for (const g of eaters) {
    let killed = false;
    for (let pi = 0; pi < predators.length; pi += 1) {
      const p = predators[pi];
      const dx = g.x - p.x;
      const dy = g.y - p.y;
      const killR = p.rad * (g.rad < 6.5 ? 1.55 : 1.25);
      if (dx * dx + dy * dy < killR * killR) {
        killed = true;
        p.food += 1.6;
        break;
      }
    }
    if (!killed) eaterSurvivors.push(g);
  }
  eaters = eaterSurvivors;

  const predBabies = [];
  for (const p of predators) {
    const reproChance = PRED_REPRO_BASE + clamp((10 - p.rad) / 10, 0, 1) * 0.12;
    if (p.food > PRED_REPRO_FOOD && r() < reproChance) {
      p.food *= 0.58;
      predBabies.push({
        x: clamp(p.x + (r() * 2 - 1) * 10, minX, maxX),
        y: clamp(p.y + (r() * 2 - 1) * 10, minY, maxY),
        a: p.a + (r() * 2 - 1) * 0.7,
        sp: clamp(p.sp + (r() * 2 - 1) * 0.16, 1.5, 4.4),
        rad: clamp(p.rad - 0.15 + (r() * 2 - 1) * 0.6, 4.2, 12),
        food: p.food * 0.34,
        tb: clamp(p.tb + (r() * 2 - 1) * 0.01, -0.06, 0.06),
      });

      x.strokeStyle = 'rgba(160,200,255,0.9)';
      x.lineWidth = 1.1;
      x.beginPath();
      x.arc(p.x, p.y, Math.max(2, p.rad * 0.65), 0, Math.PI * 2);
      x.stroke();
    }
  }
  if (predBabies.length > 0) predators.push(...predBabies);

  const apexLoad = clamp(predators.length / 80, 0.8, 2.6);
  for (const a of apexes) {
    a.food = a.food * 0.995 - 0.02;
    a.a += a.tb + (r() * 2 - 1) * 0.05 + wind * 0.03;
    if (r() < 0.004) a.tb *= -1;

    if (predators.length > 0 && r() < 0.82) {
      let target = predators[(r() * predators.length) | 0];
      let bestD2 = Infinity;
      for (let si = 0; si < APEX_SAMPLES; si += 1) {
        const candidate = predators[(r() * predators.length) | 0];
        const dx = candidate.x - a.x;
        const dy = candidate.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          target = candidate;
        }
      }
      const tx = target.x - a.x;
      const ty = target.y - a.y;
      const ta = Math.atan2(ty, tx);
      const delta = Math.atan2(Math.sin(ta - a.a), Math.cos(ta - a.a));
      a.a += delta * 0.27;
    }

    a.x += Math.cos(a.a) * a.sp * apexLoad;
    a.y += Math.sin(a.a) * a.sp * apexLoad;

    if (!inBounds2D(a.x, a.y)) {
      const towardCenter = Math.atan2(cy - a.y, cx - a.x);
      a.a = a.a * 0.5 + towardCenter * 0.5;
      a.x = clamp(a.x, minX, maxX);
      a.y = clamp(a.y, minY, maxY);
    }

    x.fillStyle = 'rgba(210,120,255,0.9)';
    x.beginPath();
    x.arc(a.x, a.y, Math.max(1.6, a.rad * 0.34), 0, Math.PI * 2);
    x.fill();
  }

  const predatorSurvivors = [];
  for (const p of predators) {
    let killed = false;
    for (let ai = 0; ai < apexes.length; ai += 1) {
      const a = apexes[ai];
      const dx = p.x - a.x;
      const dy = p.y - a.y;
      const killR = a.rad * (p.rad < 6.8 ? 1.5 : 1.25);
      if (dx * dx + dy * dy < killR * killR) {
        killed = true;
        a.food += 1.8;
        break;
      }
    }
    if (!killed) predatorSurvivors.push(p);
  }
  predators = predatorSurvivors;

  const apexBabies = [];
  for (const a of apexes) {
    const reproChance = APEX_REPRO_BASE + clamp((11 - a.rad) / 11, 0, 1) * 0.1;
    if (a.food > APEX_REPRO_FOOD && r() < reproChance) {
      a.food *= 0.58;
      apexBabies.push({
        x: clamp(a.x + (r() * 2 - 1) * 10, minX, maxX),
        y: clamp(a.y + (r() * 2 - 1) * 10, minY, maxY),
        a: a.a + (r() * 2 - 1) * 0.65,
        sp: clamp(a.sp + (r() * 2 - 1) * 0.15, 1.6, 4.8),
        rad: clamp(a.rad - 0.1 + (r() * 2 - 1) * 0.55, 4.4, 13),
        food: a.food * 0.35,
        tb: clamp(a.tb + (r() * 2 - 1) * 0.01, -0.06, 0.06),
      });

      x.strokeStyle = 'rgba(235,175,255,0.95)';
      x.lineWidth = 1.1;
      x.beginPath();
      x.arc(a.x, a.y, Math.max(2.2, a.rad * 0.62), 0, Math.PI * 2);
      x.stroke();
    }
  }
  if (apexBabies.length > 0) apexes.push(...apexBabies);

  const keptApex = [];
  for (const a of apexes) {
    if (keptApex.length < APEX_MIN || a.food > -7.5 || r() < 0.02) keptApex.push(a);
  }
  apexes = resolveFights(keptApex, 0.26, 0.95, 0.9, 'rgba(255,210,255,0.35)');

  const keptPredators = [];
  for (const p of predators) {
    if (keptPredators.length < PRED_MIN || p.food > -7 || r() < 0.02) keptPredators.push(p);
  }
  predators = resolveFights(keptPredators, 0.23, 0.92, 0.75, 'rgba(175,220,255,0.3)');

  const keptEaters = [];
  for (const g of eaters) {
    if (keptEaters.length < EATER_MIN || g.food > -6.5 || r() < 0.02) keptEaters.push(g);
  }
  eaters = resolveFights(keptEaters, 0.2, 0.9, 0.6, 'rgba(255,190,190,0.26)');

  tips = survivors;
  requestAnimationFrame(loop);
}

window.addEventListener('resize', init);
init();
requestAnimationFrame(loop);
