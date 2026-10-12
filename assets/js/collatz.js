(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const svg = $('graph'), world = $('world');
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const colors = ['#e1e9f6', '#e8e0f2', '#dceee7', '#f4e3de', '#f0eccf', '#dcecee'];
  // Numbers stay readable while the CDN and MathJax font data load.
  const mathReady = new Promise(resolve => {
    const script = $('mathjax-script');
    const ready = () => {
      if (typeof MathJax === 'undefined' || !MathJax.startup?.promise) return resolve(null);
      MathJax.startup.promise.then(() => resolve(MathJax), () => resolve(null));
    };
    if (typeof MathJax !== 'undefined' && MathJax.tex2svgPromise) ready();
    else if (script) {
      script.addEventListener('load', ready, { once: true });
      script.addEventListener('error', () => resolve(null), { once: true });
    } else resolve(null);
  });
  const nodes = new Map(), edges = new Map();
  const LIMIT = 400;
  let values = [], index = -1, peak = 1n, running = false, timer = null;
  let active = null, activeEdge = null, dragged = null, lastFrame = 0;
  let camera = { x: 0, y: 0, scale: 1 }, fitImmediately = true;

  function element(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    parent.appendChild(el);
    return el;
  }
  function sequence(start) {
    const result = [start];
    while (start !== 1n && result.length < 10001) {
      start = start % 2n === 0n ? start / 2n : 3n * start + 1n;
      result.push(start);
    }
    if (start !== 1n) throw new Error('This sequence reached the 10,000-step limit. Try a smaller start.');
    return result;
  }
  function schedule() {
    clearTimeout(timer);
    if (running) timer = setTimeout(() => { advance(); schedule(); }, Number($('speed').value));
  }
  function playback() {
    $('pause').textContent = running ? 'pause' : 'resume';
    $('pause').disabled = !values.length || index >= values.length - 1;
    $('step').disabled = !values.length || index >= values.length - 1;
    $('restart').disabled = !values.length;
  }
  function start(raw) {
    try {
      if (!/^\d+$/.test(raw.trim())) throw new Error('Enter a positive whole number.');
      const n = BigInt(raw.trim());
      if (n < 1n || n > 1000000000000n) throw new Error('Choose a number from 1 to 1,000,000,000,000.');
      const next = sequence(n);
      const unseen = new Set(next.map(String).filter(key => !nodes.has(key)));
      if (nodes.size + unseen.size > LIMIT) throw new Error('This graph would exceed 400 nodes. Clear the space or choose a shorter sequence.');
      clearTimeout(timer);
      $('error').hidden = true;
      values = next;
      peak = values.reduce((max, v) => v > max ? v : max, 1n);
      index = -1;
      running = true;
      $('graph-title').textContent = `Collatz sequence starting at ${n}`;
      $('sequence').textContent = '';
      advance(); schedule();
    } catch (error) {
      $('error').textContent = error.message;
      $('error').hidden = false;
    }
  }
  function makeNode(value, previous) {
    const key = String(value), radius = Math.max(23, key.length * 4.9 + 11);
    const angle = nodes.size * 2.399963;
    const node = { key, radius, x: previous ? previous.x + Math.cos(angle) * 100 : 0,
      y: previous ? previous.y + Math.sin(angle) * 100 : 0,
      vx: 0, vy: 0, fx: 0, fy: 0, seed: nodes.size * 1.73 };
    node.el = element('g', { class: 'node', 'data-value': key }, $('nodes'));
    node.el.style.setProperty('--pastel', colors[nodes.size % colors.length]);
    element('title', {}, node.el).textContent = key;
    const bubble = element('g', { class: 'bubble' }, node.el);
    const circle = element('circle', { r: radius }, bubble);
    const fallback = element('text', {}, bubble);
    fallback.textContent = key;
    mathReady.then(async math => {
      if (!math || nodes.get(key) !== node) return;
      const output = await math.tex2svgPromise(key, { display: false });
      if (nodes.get(key) !== node) return;
      const label = output.querySelector('svg');
      if (!label) return;
      const box = label.getAttribute('viewBox').trim().split(/\s+/).map(Number);
      if (box.length !== 4 || !box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0) return;
      const height = 18, width = height * box[2] / box[3];
      node.radius = Math.max(node.radius, width / 2 + 12);
      circle.setAttribute('r', node.radius);
      label.removeAttribute('style');
      label.setAttribute('class', 'math-label');
      label.setAttribute('width', width);
      label.setAttribute('height', height);
      label.setAttribute('x', -width / 2);
      label.setAttribute('y', -height / 2);
      label.setAttribute('aria-hidden', 'true');
      label.setAttribute('focusable', 'false');
      bubble.appendChild(label);
      fallback.remove();
      if (reduced.matches) settle();
    }).catch(() => { /* Keep the plain number if MathJax cannot render it. */ });
    node.el.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      dragged = node; node.el.classList.add('dragging');
      svg.style.touchAction = 'none';
      svg.setPointerCapture(event.pointerId); event.preventDefault();
    });
    nodes.set(key, node);
    return node;
  }
  function advance() {
    if (index >= values.length - 1) return;
    index++;
    const previous = index ? nodes.get(String(values[index - 1])) : null;
    const key = String(values[index]);
    const existing = nodes.has(key);
    const node = nodes.get(key) || makeNode(values[index], previous);
    if (active) active.el.classList.remove('active', 'revisited');
    if (activeEdge) activeEdge.el.classList.remove('active');
    activeEdge = null;
    if (previous) {
      const edgeKey = `${previous.key}:${key}`;
      if (!edges.has(edgeKey)) edges.set(edgeKey, {
        from: previous, to: node, el: element('path', { class: 'edge' }, $('edges'))
      });
      activeEdge = edges.get(edgeKey);
      activeEdge.el.classList.add('active');
    }
    active = node;
    // Re-trigger the small pulse when an existing path is visited again.
    if (existing) { node.el.classList.remove('revisited'); void node.el.getBoundingClientRect(); node.el.classList.add('revisited'); }
    node.el.classList.add('active');
    const done = index === values.length - 1;
    if (done) { running = false; clearTimeout(timer); }
    $('status').textContent = done ? `Reached 1 from ${values[0]} in ${index} steps.` :
      previous ? `${previous.key} → ${key} · ${values[index - 1] % 2n ? '3n + 1' : 'n ÷ 2'}` : `Following ${key}.`;
    $('stats').textContent = `step ${index} of ${values.length - 1} · peak ${peak.toLocaleString('en-US')}`;
    $('sequence').textContent = values.slice(0, index + 1).join(' → ');
    playback();
    if (reduced.matches) settle();
  }
  function forces(t, dt = 1) {
    const all = [...nodes.values()];
    for (const n of all) {
      n.fx = -n.x * .0015; n.fy = -n.y * .0015;
      if (!reduced.matches) {
        n.fx += Math.sin(t * .45 + n.seed) * .065;
        n.fy += Math.cos(t * .36 + n.seed) * .065;
      }
    }
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) + Math.abs(dy) < .01) { dx = .1; dy = .1; }
      const distance = Math.hypot(dx, dy);
      const overlap = Math.max(0, a.radius + b.radius + 22 - distance);
      const force = Math.min(4, 1800 / (distance * distance) + overlap * .08);
      const fx = dx / distance * force, fy = dy / distance * force;
      a.fx -= fx; a.fy -= fy; b.fx += fx; b.fy += fy;
    }
    for (const { from: a, to: b } of edges.values()) {
      const dx = b.x - a.x, dy = b.y - a.y, distance = Math.max(1, Math.hypot(dx, dy));
      const force = (distance - a.radius - b.radius - 48) * .009;
      const fx = dx / distance * force, fy = dy / distance * force;
      a.fx += fx; a.fy += fy; b.fx -= fx; b.fy -= fy;
    }
    for (const n of all) {
      if (n === dragged) { n.vx = n.vy = 0; continue; }
      const damping = Math.pow(.87, dt);
      n.vx = (n.vx + n.fx * dt) * damping;
      n.vy = (n.vy + n.fy * dt) * damping;
      n.x += n.vx * dt; n.y += n.vy * dt;
    }
  }
  function render(immediate = false) {
    if (!nodes.size) return;
    const width = svg.clientWidth || 960, height = svg.clientHeight || 560;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const n of nodes.values()) {
      n.el.setAttribute('transform', `translate(${n.x} ${n.y})`);
      left = Math.min(left, n.x - n.radius); right = Math.max(right, n.x + n.radius);
      top = Math.min(top, n.y - n.radius); bottom = Math.max(bottom, n.y + n.radius);
    }
    for (const { from: a, to: b, el } of edges.values()) {
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.max(1, Math.hypot(dx, dy));
      const ux = dx / d, uy = dy / d;
      const bend = Math.min(14, d * .09);
      const cx = (a.x + b.x) / 2 - uy * bend, cy = (a.y + b.y) / 2 + ux * bend;
      const da = Math.max(1, Math.hypot(cx-a.x, cy-a.y));
      const db = Math.max(1, Math.hypot(b.x-cx, b.y-cy));
      el.setAttribute('d', `M ${a.x + (cx-a.x)/da*(a.radius+4)} ${a.y+(cy-a.y)/da*(a.radius+4)} Q ${cx} ${cy} ${b.x-(b.x-cx)/db*(b.radius+7)} ${b.y-(b.y-cy)/db*(b.radius+7)}`);
    }
    const target = { x: (left+right)/2, y: (top+bottom)/2,
      scale: Math.min(1, (width-24)/(right-left+60), (height-24)/(bottom-top+60)) };
    const mix = immediate || fitImmediately ? 1 : .055;
    if (!dragged) for (const k of ['x','y','scale']) camera[k] += (target[k]-camera[k])*mix;
    fitImmediately = false;
    world.setAttribute('transform', `translate(${width/2} ${height/2}) scale(${camera.scale}) translate(${-camera.x} ${-camera.y})`);
  }
  function settle() { for (let i=0; i<220; i++) forces(0); render(true); }
  function frame(time) {
    const dt = Math.min(2, (time-lastFrame)/16.667 || 1); lastFrame = time;
    if (!document.hidden && !reduced.matches) { forces(time/1000, dt); render(); }
    requestAnimationFrame(frame);
  }
  svg.addEventListener('pointermove', event => {
    if (!dragged) return;
    const matrix = world.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    dragged.x = point.x; dragged.y = point.y;
    render(reduced.matches);
  });
  function release() {
    if (dragged) dragged.el.classList.remove('dragging');
    dragged = null; svg.style.touchAction = '';
    if (reduced.matches) settle();
  }
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);
  svg.addEventListener('lostpointercapture', release);
  $('form').addEventListener('submit', event => { event.preventDefault(); start($('start').value); });
  $('pause').addEventListener('click', () => { running = !running; playback(); schedule(); });
  $('step').addEventListener('click', () => { running = false; clearTimeout(timer); advance(); });
  $('speed').addEventListener('change', schedule);
  $('restart').addEventListener('click', () => { if (values.length) start(String(values[0])); });
  $('clear').addEventListener('click', () => {
    clearTimeout(timer); running = false; values = []; index = -1; dragged = null;
    svg.style.touchAction = '';
    nodes.clear(); edges.clear(); $('nodes').replaceChildren(); $('edges').replaceChildren();
    active = activeEdge = null; fitImmediately = true;
    $('status').textContent = 'Pick a number to begin.';
    $('stats').textContent = ''; $('sequence').textContent = ''; $('error').hidden = true;
    $('graph-title').textContent = 'Empty Collatz graph'; playback();
  });
  reduced.addEventListener('change', () => { if (reduced.matches) settle(); });
  new ResizeObserver(() => render(reduced.matches)).observe(svg);
  start($('start').value);
  requestAnimationFrame(frame);
})();
