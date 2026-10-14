(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const tiles = '../img/tiles/';
  const sizes = { small: [9, 9], medium: [16, 16], large: [30, 16] };
  const densities = { easy: 10 / 81, normal: 40 / 256, hard: 99 / 480 };
  let game, buttons = [], flagMode = false, focused = 0, startedAt = null, seconds = 0;
  function updateZoom() {
    const selected = $('zoom').value;
    // Whole-pixel multiples keep the traced sprite blocks uniformly sized.
    const availableWidth = Math.max(160, window.innerWidth - 32);
    const availableHeight = Math.max(200, window.innerHeight - 180);
    const scale = selected === 'fit' ? Math.max(1, Math.min(8, Math.floor(Math.min(
      availableWidth / (game.width * 16 + 18),
      availableHeight / (game.height * 16 + 58)
    )))) : Number(selected);
    $('game-shell').style.setProperty('--unit', `${scale}px`);
    $('zoom').setAttribute('aria-label', `Board zoom: ${scale} times${selected === 'fit' ? ', fit screen' : ''}`);
  }
  function counter(el, value, label) {
    const text = value < 0 ? '-' + String(Math.min(99, -value)).padStart(2, '0') : String(Math.min(999, value)).padStart(3, '0');
    el.setAttribute('aria-label', label);
    if (el.dataset.digits === text) return;
    el.dataset.digits = text;
    el.replaceChildren();
    for (const char of text) {
      const img = document.createElement('img');
      img.src = tiles + `counters/${char === '-' ? 'minus' : char}.svg`;
      img.alt = ''; img.draggable = false;
      el.appendChild(img);
    }
  }
  function face(state) {
    $('face-art').src = tiles + `face-${state}.svg`;
    const labels = { ready: 'Smiley', pressed: 'Pressed smiley', surprised: 'Surprised', won: 'Sunglasses: you won', lost: 'Sad: game over' };
    $('face').setAttribute('aria-label', `${labels[state]} face: start a new game`);
  }
  function updateTime() {
    if (game.state === 'playing' && startedAt !== null) seconds = Math.floor((Date.now() - startedAt) / 1000);
    counter($('timer'), seconds, `${seconds} seconds elapsed`);
  }
  function render() {
    for (let i = 0; i < game.cells.length; i++) {
      const c = game.cells[i], button = buttons[i];
      let asset = c.open ? (c.mine ? 'bomb' : String(c.number)) : c.flag ? 'flag' : 'square';
      const lostMine = game.state === 'lost' && c.mine && !c.flag;
      if (lostMine) asset = 'bomb';
      if (i === game.exploded) asset = 'bomb-exploded';
      if (game.state === 'lost' && c.flag && !c.mine) asset = 'bomb-wrong';
      button.classList.toggle('revealed', c.open || lostMine);
      button.classList.toggle('exploded', i === game.exploded);
      button.classList.toggle('wrong-flag', game.state === 'lost' && c.flag && !c.mine);
      const img = button.firstChild;
      if (img.dataset.asset !== asset) { img.src = tiles + asset + '.svg'; img.dataset.asset = asset; }
      const state = c.open || lostMine ? c.mine ? 'mine' : c.number ? `${c.number} adjacent mines` : 'empty' : c.flag ? 'flagged' : 'unopened';
      button.setAttribute('aria-label', `Row ${Math.floor(i / game.width) + 1}, column ${i % game.width + 1}: ${state}${i === game.exploded ? ', exploded' : ''}`);
    }
    counter($('mine-counter'), game.mines - game.flags, `${game.mines - game.flags} mines remaining`);
    updateTime();
    face(game.state === 'lost' ? 'lost' : game.state === 'won' ? 'won' : 'ready');
    $('status').textContent = game.state === 'won' ? `You cleared the board in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}. Nicely done.` :
      game.state === 'lost' ? 'A mine! Click the smiley to try again.' :
      game.state === 'ready' ? `${game.width} × ${game.height} · ${game.mines} mines. Your first square is safe.` :
      `${game.opened} of ${game.cells.length - game.mines} safe squares revealed.`;
  }
  function choose(i, flag = false) {
    const before = game.state;
    if (flag) game.toggleFlag(i); else game.reveal(i);
    if (before === 'ready' && game.state !== 'ready') startedAt = Date.now();
    if (before === 'playing') seconds = Math.floor((Date.now() - startedAt) / 1000);
    render();
  }
  function focusCell(i, moveFocus = true) {
    buttons[focused].tabIndex = -1;
    focused = i; buttons[i].tabIndex = 0;
    if (moveFocus) buttons[i].focus();
  }
  function newGame() {
    const [width, height] = sizes[$('size').value];
    game = new Minesweeper(width, height, Math.round(width * height * densities[$('difficulty').value]));
    startedAt = null; seconds = 0; focused = 0; buttons = [];
    const board = $('board'); board.replaceChildren();
    board.style.setProperty('--columns', width);
    board.setAttribute('aria-rowcount', height); board.setAttribute('aria-colcount', width);
    for (let y = 0; y < height; y++) {
      const row = document.createElement('div'); row.className = 'board-row'; row.setAttribute('role', 'row');
      row.setAttribute('aria-rowindex', y + 1);
      for (let x = 0; x < width; x++) {
        const i = y * width + x, button = document.createElement('button');
        button.className = 'cell'; button.type = 'button'; button.tabIndex = i ? -1 : 0;
        button.setAttribute('role', 'gridcell'); button.setAttribute('aria-colindex', x + 1);
        const img = document.createElement('img'); img.alt = ''; img.draggable = false; button.appendChild(img);
        button.addEventListener('click', () => { focusCell(i, false); choose(i, flagMode); });
        button.addEventListener('contextmenu', e => { e.preventDefault(); focusCell(i, false); choose(i, true); });
        button.addEventListener('pointerdown', e => { if (e.button === 0 && ['ready', 'playing'].includes(game.state) && !flagMode) face('surprised'); });
        button.addEventListener('keydown', e => {
          const dx = { ArrowLeft: -1, ArrowRight: 1 }[e.key], dy = { ArrowUp: -1, ArrowDown: 1 }[e.key];
          if (dx !== undefined || dy !== undefined) {
            e.preventDefault();
            const nx = Math.max(0, Math.min(width - 1, x + (dx || 0))), ny = Math.max(0, Math.min(height - 1, y + (dy || 0)));
            focusCell(ny * width + nx);
          } else if (e.key.toLowerCase() === 'f') { e.preventDefault(); choose(i, true); }
          else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(i); }
        });
        buttons.push(button); row.appendChild(button);
      }
      board.appendChild(row);
    }
    render();
    updateZoom();
  }
  $('size').addEventListener('change', newGame);
  $('difficulty').addEventListener('change', newGame);
  $('new-game').addEventListener('click', newGame);
  $('face').addEventListener('click', newGame);
  $('face').addEventListener('pointerdown', e => { if (e.button === 0) face('pressed'); });
  $('zoom').addEventListener('change', updateZoom);
  window.addEventListener('resize', () => { if ($('zoom').value === 'fit') updateZoom(); });
  $('flag-mode').addEventListener('click', () => {
    flagMode = !flagMode;
    $('flag-mode').setAttribute('aria-pressed', flagMode);
    $('flag-mode').textContent = `flag mode: ${flagMode ? 'on' : 'off'}`;
  });
  for (const event of ['pointerup', 'pointercancel']) window.addEventListener(event, () => face(game.state === 'lost' ? 'lost' : game.state === 'won' ? 'won' : 'ready'));
  newGame();
  setInterval(updateTime, 250);
})();
