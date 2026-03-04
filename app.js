/**
 * ═══════════════════════════════════════════════════════════════
 *  SimTDP — app.js
 *  Scrollytelling interactivo para el Simulador de la
 *  Transformación Digital Productiva (DLAB / CEPAL)
 * ═══════════════════════════════════════════════════════════════
 *
 *  ESTRUCTURA:
 *  1. Utilidades (helpers para SVG, colores, datos)
 *  2. Módulo de animaciones scroll (IntersectionObserver)
 *  3. Navegación (menú móvil, scroll-spy)
 *  4. Timeline & Dashboard (sección "Cómo funciona")
 *  5. Heatmap interactivo (sección "Priorización")
 *  6. Escenarios & Charts SVG (sección "Escenarios")
 *  7. Modal de video
 *  8. Init
 *
 *  No usa librerías externas. Vanilla JS, ES6+.
 * ═══════════════════════════════════════════════════════════════
 */

// ────────────────────────────────────────────────────────
// 1. UTILIDADES
// ────────────────────────────────────────────────────────

/** Create an SVG element with given attributes */
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/** Linear interpolation */
function lerp(a, b, t) { return a + (b - a) * t; }

/** Map value from one range to another */
function mapRange(val, inMin, inMax, outMin, outMax) {
  return outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/** Heatmap color: value 0–1 → css color */
function heatColor(t) {
  // cold (blue-ish) → warm (amber) → hot (red-ish)
  const r = Math.round(lerp(37, 232, Math.min(t * 1.3, 1)));
  const g = Math.round(lerp(74, t > .6 ? lerp(168, 88, (t - .6) / .4) : 168, t));
  const b = Math.round(lerp(111, 56, t));
  return `rgb(${r},${g},${b})`;
}

// ────────────────────────────────────────────────────────
// 2. SCROLL ANIMATIONS
// ────────────────────────────────────────────────────────

function initScrollAnimations() {
  const els = document.querySelectorAll('.anim');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        obs.unobserve(e.target); // fire once
      }
    });
  }, { threshold: 0.15 });
  els.forEach(el => obs.observe(el));
}

// ────────────────────────────────────────────────────────
// 3. NAVIGATION
// ────────────────────────────────────────────────────────

function initNav() {
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');

  toggle.addEventListener('click', () => {
    links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', links.classList.contains('is-open'));
  });

  // Close nav on link click
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('is-open'));
  });

  // Scroll-spy: highlight active section link
  const sections = document.querySelectorAll('.section, footer');
  const navAnchors = links.querySelectorAll('a');
  const spyObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        navAnchors.forEach(a => {
          a.style.color = a.getAttribute('href') === `#${id}` ? '#fff' : '';
        });
      }
    });
  }, { threshold: 0.35 });
  sections.forEach(s => spyObs.observe(s));
}

// ────────────────────────────────────────────────────────
// 4. TIMELINE & DASHBOARD
// ────────────────────────────────────────────────────────

function initTimeline() {
  const steps   = document.querySelectorAll('.timeline__step');
  const panels  = document.querySelectorAll('.dashboard__panel');
  const progress = document.getElementById('timelineProgress');
  let current = 0;
  let autoTimer = null;

  function goToStep(idx) {
    current = idx;
    // Update steps
    steps.forEach((s, i) => {
      s.classList.toggle('is-active', i <= idx);
      s.setAttribute('aria-pressed', i === idx);
    });
    // Update progress bar
    const pct = idx / (steps.length - 1) * 100;
    progress.style.width = `${pct}%`;
    // Switch panels
    panels.forEach((p, i) => p.classList.toggle('is-visible', i === idx));
  }

  steps.forEach((s, i) => {
    s.addEventListener('click', () => {
      goToStep(i);
      clearInterval(autoTimer); // stop auto on interaction
    });
    // Keyboard support
    s.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToStep(Math.min(i + 1, steps.length - 1));
        steps[Math.min(i + 1, steps.length - 1)].focus();
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToStep(Math.max(i - 1, 0));
        steps[Math.max(i - 1, 0)].focus();
      }
    });
  });

  // Auto-advance every 4s when section is visible
  const sectionEl = document.getElementById('funciona');
  const sectionObs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      autoTimer = setInterval(() => {
        goToStep((current + 1) % steps.length);
      }, 4000);
    } else {
      clearInterval(autoTimer);
    }
  }, { threshold: 0.4 });
  sectionObs.observe(sectionEl);

  // Render dashboard content
  renderDiagChart();
  renderPolicySliders();
  renderImpactChart();
  renderCompareChart();
}

/* Panel 0 — Diagnostic radar-like bars */
function renderDiagChart() {
  const container = document.getElementById('diagChart');
  const dims = [
    { label: 'Conectividad',       val: 72 },
    { label: 'Capital humano',     val: 55 },
    { label: 'Adopción empresas',  val: 48 },
    { label: 'Innovación',         val: 38 },
    { label: 'Gobierno digital',   val: 64 },
    { label: 'Regulación',         val: 42 },
  ];
  dims.forEach(d => {
    const bar = document.createElement('div');
    bar.style.cssText = `
      display:flex; flex-direction:column; align-items:center; flex:1;
      gap:.35rem; font-size:.7rem; color:var(--text-muted);
    `;
    const fill = document.createElement('div');
    fill.style.cssText = `
      width:100%; max-width:40px; border-radius:4px 4px 0 0;
      background: linear-gradient(to top, var(--accent), var(--accent-hover));
      height:${d.val}%; transition: height .6s var(--ease-out);
    `;
    const lbl = document.createElement('span');
    lbl.textContent = d.label;
    lbl.style.cssText = 'writing-mode:vertical-rl; transform:rotate(180deg); font-size:.65rem; white-space:nowrap;';
    const val = document.createElement('span');
    val.textContent = d.val;
    val.style.cssText = 'font-weight:700; color:var(--accent); font-size:.8rem;';
    bar.appendChild(fill);
    bar.appendChild(val);
    bar.appendChild(lbl);
    container.appendChild(bar);
  });
}

/* Panel 1 — Policy sliders */
function renderPolicySliders() {
  const container = document.getElementById('policySliders');
  const policies = [
    'Inversión en infraestructura',
    'Capacitación digital',
    'Incentivos a la innovación',
    'Regulación de datos',
  ];
  policies.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'slider-row';
    row.innerHTML = `
      <label for="policy${i}">${p}</label>
      <input type="range" id="policy${i}" min="0" max="100" value="${30 + i * 15}" aria-label="${p}">
      <span class="slider-val">${30 + i * 15}%</span>
    `;
    const input = row.querySelector('input');
    const valSpan = row.querySelector('.slider-val');
    input.addEventListener('input', () => { valSpan.textContent = input.value + '%'; });
    container.appendChild(row);
  });
}

/* Panel 2 — Impact grouped bars */
function renderImpactChart() {
  const container = document.getElementById('impactChart');
  const data = [
    { label: 'PIB', before: 40, after: 62 },
    { label: 'Empleo', before: 55, after: 68 },
    { label: 'Export.', before: 35, after: 58 },
    { label: 'Gini', before: 65, after: 50 },
  ];
  data.forEach(d => {
    const group = document.createElement('div');
    group.style.cssText = 'display:flex; gap:4px; flex:1; align-items:flex-end; flex-direction:column-reverse;height:100%;';
    // We'll use flex row with two bars side by side
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex; gap:3px; align-items:flex-end; flex:1; width:100%;height:100%;';

    const barBefore = document.createElement('div');
    barBefore.style.cssText = `flex:1; border-radius:3px 3px 0 0; background:rgba(255,255,255,.12); height:${d.before}%; transition:height .6s;`;
    const barAfter = document.createElement('div');
    barAfter.style.cssText = `flex:1; border-radius:3px 3px 0 0; background:var(--accent); height:${d.after}%; transition:height .6s;`;

    wrapper.appendChild(barBefore);
    wrapper.appendChild(barAfter);

    const lbl = document.createElement('span');
    lbl.textContent = d.label;
    lbl.style.cssText = 'font-size:.7rem; color:var(--text-muted); text-align:center; width:100%; display:block; padding-top:.35rem;';

    group.style.cssText = 'display:flex;flex-direction:column;flex:1;height:100%;';
    group.appendChild(wrapper);
    group.appendChild(lbl);
    container.appendChild(group);
  });
}

/* Panel 3 — Comparison dot chart */
function renderCompareChart() {
  const container = document.getElementById('compareChart');
  container.style.cssText = 'display:flex;flex-direction:column;gap:.75rem;padding-top:1rem;';
  const scenarios = [
    { label: 'Esc. Base',           pos: 35 },
    { label: 'Esc. Acelerado',      pos: 72 },
    { label: 'Esc. Restricciones',  pos: 20 },
  ];
  scenarios.forEach(s => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:.75rem;';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'width:140px;font-size:.78rem;color:var(--text-muted);flex-shrink:0;';
    lbl.textContent = s.label;
    const track = document.createElement('div');
    track.style.cssText = 'flex:1;height:8px;background:rgba(255,255,255,.08);border-radius:4px;position:relative;';
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:absolute; top:50%; transform:translate(-50%,-50%);
      width:18px; height:18px; border-radius:50%;
      background:var(--accent); left:${s.pos}%;
      transition: left .6s var(--ease-out);
      box-shadow: 0 0 8px rgba(232,168,56,.4);
    `;
    track.appendChild(dot);
    row.appendChild(lbl);
    row.appendChild(track);
    container.appendChild(row);
  });
}

// ────────────────────────────────────────────────────────
// 5. HEATMAP
// ────────────────────────────────────────────────────────

function initHeatmap() {
  const container = document.getElementById('heatmap');
  const buttons   = document.querySelectorAll('.toggle-btn');

  const sectors = [
    'Manufactura', 'Agroindustria', 'Servicios TIC',
    'Minería', 'Turismo', 'Logística',
  ];
  const dimensions = [
    'Madurez', 'Potencial', 'Brecha', 'Empleo', 'Fiscal',
  ];

  // Fake data for each mode
  const dataTopDown = [
    [.7, .8, .3, .6, .5],
    [.4, .6, .7, .5, .3],
    [.9, .9, .2, .8, .7],
    [.5, .3, .8, .4, .6],
    [.3, .5, .6, .7, .4],
    [.6, .7, .4, .3, .8],
  ];
  const dataBottomUp = [
    [.5, .4, .6, .8, .3],
    [.8, .7, .3, .6, .5],
    [.6, .5, .4, .9, .8],
    [.3, .6, .9, .2, .4],
    [.7, .8, .5, .4, .6],
    [.4, .3, .7, .5, .9],
  ];

  function render(data) {
    container.innerHTML = '';

    // Header row
    const corner = document.createElement('div');
    corner.className = 'hm-header';
    container.appendChild(corner);
    dimensions.forEach(d => {
      const h = document.createElement('div');
      h.className = 'hm-header';
      h.textContent = d;
      container.appendChild(h);
    });

    // Data rows
    sectors.forEach((sector, ri) => {
      const label = document.createElement('div');
      label.className = 'hm-row-label';
      label.textContent = sector;
      container.appendChild(label);

      data[ri].forEach(val => {
        const cell = document.createElement('div');
        cell.className = 'hm-cell';
        cell.textContent = Math.round(val * 100);
        cell.style.background = heatColor(val);
        cell.style.color = val > .55 ? '#fff' : '#1a1a1a';
        container.appendChild(cell);
      });
    });
  }

  render(dataTopDown);

  // Toggle handler
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-checked', 'false');
        b.setAttribute('tabindex', '-1');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-checked', 'true');
      btn.setAttribute('tabindex', '0');
      render(btn.dataset.mode === 'topdown' ? dataTopDown : dataBottomUp);
    });
    // Keyboard: arrow left/right between toggles
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const other = [...buttons].find(b => b !== btn);
        other.click();
        other.focus();
      }
    });
  });
}

// ────────────────────────────────────────────────────────
// 6. ESCENARIOS & SVG CHARTS
// ────────────────────────────────────────────────────────

function initScenarios() {
  const tabs = document.querySelectorAll('.scenario-tab');

  // Data per scenario: arrays of 6 data points per chart
  const scenarios = {
    base: {
      chart1: [30, 35, 40, 42, 45, 48],
      chart2: [20, 22, 25, 27, 28, 30],
      chart3: [60, 58, 55, 52, 50, 48],
    },
    acelerado: {
      chart1: [30, 40, 55, 65, 78, 88],
      chart2: [20, 30, 42, 55, 65, 72],
      chart3: [60, 52, 42, 32, 24, 18],
    },
    restricciones: {
      chart1: [30, 32, 30, 28, 25, 22],
      chart2: [20, 19, 18, 17, 15, 14],
      chart3: [60, 62, 66, 70, 74, 78],
    },
  };

  const years = ['2024', '2025', '2026', '2027', '2028', '2029'];
  const colors = {
    chart1: '#e8a838',
    chart2: '#5baaef',
    chart3: '#e85858',
  };

  function drawLineChart(containerId, data, color) {
    const el = document.getElementById(containerId);
    el.innerHTML = '';

    const W = 260, H = 140;
    const padL = 30, padR = 10, padT = 10, padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none' });
    svg.style.width = '100%';
    svg.style.height = '100%';

    const maxVal = 100;
    const minVal = 0;

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padT + (plotH / 4) * i;
      const line = svgEl('line', {
        x1: padL, y1: y, x2: W - padR, y2: y,
        stroke: 'rgba(255,255,255,.06)', 'stroke-width': 1,
      });
      svg.appendChild(line);
      // Y axis labels
      const txt = svgEl('text', {
        x: padL - 6, y: y + 3,
        fill: 'rgba(255,255,255,.3)', 'font-size': '8', 'text-anchor': 'end',
      });
      txt.textContent = Math.round(maxVal - (maxVal / 4) * i);
      svg.appendChild(txt);
    }

    // X labels
    data.forEach((_, i) => {
      const x = padL + (plotW / (data.length - 1)) * i;
      const txt = svgEl('text', {
        x, y: H - 6,
        fill: 'rgba(255,255,255,.3)', 'font-size': '8', 'text-anchor': 'middle',
      });
      txt.textContent = years[i];
      svg.appendChild(txt);
    });

    // Build path
    const points = data.map((v, i) => {
      const x = padL + (plotW / (data.length - 1)) * i;
      const y = padT + plotH - mapRange(v, minVal, maxVal, 0, plotH);
      return { x, y };
    });

    // Area fill
    const areaPath = `M${points[0].x},${padT + plotH} ` +
      points.map(p => `L${p.x},${p.y}`).join(' ') +
      ` L${points[points.length - 1].x},${padT + plotH} Z`;
    const area = svgEl('path', {
      d: areaPath,
      fill: color, opacity: '.1',
    });
    svg.appendChild(area);

    // Line
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const line = svgEl('path', {
      d: linePath,
      fill: 'none', stroke: color, 'stroke-width': 2.5,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    });
    // Animate line drawing
    const len = line.getTotalLength ? 600 : 600;
    line.style.strokeDasharray = len;
    line.style.strokeDashoffset = len;
    line.style.transition = 'stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)';
    svg.appendChild(line);
    requestAnimationFrame(() => { line.style.strokeDashoffset = '0'; });

    // Dots
    points.forEach(p => {
      const circle = svgEl('circle', {
        cx: p.x, cy: p.y, r: 3.5,
        fill: color, stroke: 'var(--surface)', 'stroke-width': 2,
      });
      svg.appendChild(circle);
    });

    el.appendChild(svg);
  }

  function renderScenario(key) {
    const d = scenarios[key];
    drawLineChart('scenarioSVG1', d.chart1, colors.chart1);
    drawLineChart('scenarioSVG2', d.chart2, colors.chart2);
    drawLineChart('scenarioSVG3', d.chart3, colors.chart3);
  }

  renderScenario('base');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      renderScenario(tab.dataset.scenario);
    });
    // Keyboard: arrow keys between tabs
    tab.addEventListener('keydown', (e) => {
      const arr = [...tabs];
      const idx = arr.indexOf(tab);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = arr[(idx + 1) % arr.length];
        next.click();
        next.focus();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = arr[(idx - 1 + arr.length) % arr.length];
        prev.click();
        prev.focus();
      }
    });
  });
}

// ────────────────────────────────────────────────────────
// 7. VIDEO MODAL
// ────────────────────────────────────────────────────────

function initModal() {
  const modal    = document.getElementById('videoModal');
  const btnVideo = document.getElementById('btnVideo');
  const backdrop = document.getElementById('modalBackdrop');
  const closeBtn = document.getElementById('modalClose');

  function open()  { modal.classList.add('is-open');    modal.setAttribute('aria-hidden', 'false'); }
  function close() { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true');  }

  btnVideo.addEventListener('click', open);
  backdrop.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

// ────────────────────────────────────────────────────────
// 8. INIT
// ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initNav();
  initTimeline();
  initHeatmap();
  initScenarios();
  initModal();
});
