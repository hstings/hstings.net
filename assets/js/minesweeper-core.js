(function (root) {
  'use strict';
  class Minesweeper {
    constructor(width, height, mines, random = Math.random) {
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 3 || height < 3 || !Number.isInteger(mines) || mines < 1 || mines > width * height - 9) throw new Error('Invalid board configuration.');
      this.width = width; this.height = height; this.mines = mines; this.random = random;
      this.state = 'ready'; this.flags = 0; this.opened = 0; this.exploded = -1;
      this.cells = Array.from({ length: width * height }, () => ({ mine: false, number: 0, open: false, flag: false }));
    }
    neighbors(index) {
      const out = [], x = index % this.width, y = Math.floor(index / this.width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if ((dx || dy) && nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) out.push(ny * this.width + nx);
      }
      return out;
    }
    plant(first) {
      const safe = new Set([first, ...this.neighbors(first)]);
      const candidates = this.cells.map((_, i) => i).filter(i => !safe.has(i));
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      for (const i of candidates.slice(0, this.mines)) this.cells[i].mine = true;
      this.cells.forEach((cell, i) => { cell.number = this.neighbors(i).filter(j => this.cells[j].mine).length; });
      this.state = 'playing';
    }
    toggleFlag(i) {
      const cell = this.cells[i];
      if (!cell || cell.open || this.state === 'won' || this.state === 'lost') return;
      cell.flag = !cell.flag; this.flags += cell.flag ? 1 : -1;
    }
    reveal(i) {
      const cell = this.cells[i];
      if (!cell || cell.flag || this.state === 'won' || this.state === 'lost') return;
      if (this.state === 'ready') this.plant(i);
      if (cell.open) {
        const neighbors = this.neighbors(i);
        if (!cell.number || neighbors.filter(j => this.cells[j].flag).length !== cell.number) return;
        this.flood(neighbors.filter(j => !this.cells[j].flag && !this.cells[j].open));
      } else this.flood([i]);
      if (this.state === 'playing' && this.opened === this.cells.length - this.mines) {
        this.state = 'won';
        this.cells.forEach(c => { if (c.mine) c.flag = true; });
        this.flags = this.mines;
      }
    }
    flood(queue) {
      for (let head = 0; head < queue.length; head++) {
        const i = queue[head], c = this.cells[i];
        if (c.flag || c.open) continue;
        c.open = true;
        if (c.mine) { this.state = 'lost'; this.exploded = i; return; }
        this.opened++;
        if (!c.number) for (const j of this.neighbors(i)) if (!this.cells[j].open && !this.cells[j].flag) queue.push(j);
      }
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = Minesweeper;
  else root.Minesweeper = Minesweeper;
})(typeof globalThis !== 'undefined' ? globalThis : this);
