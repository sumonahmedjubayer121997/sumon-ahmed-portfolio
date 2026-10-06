/**
 * Uniform-grid spatial hash over a flat xyz Float32Array. Rebuilt every frame in
 * O(n); pair queries visit only the 3×3 neighbourhood, so link detection stays
 * linear instead of O(n²).
 */
export class SpatialHash {
  private heads = new Int32Array(0);
  private next: Int32Array;
  private cols = 0;
  private rows = 0;
  private minX = 0;
  private minY = 0;
  private cell = 1;

  constructor(maxItems: number) {
    this.next = new Int32Array(maxItems);
  }

  build(positions: ArrayLike<number>, count: number, minX: number, minY: number, w: number, h: number, cell: number) {
    this.cell = cell;
    this.minX = minX;
    this.minY = minY;
    this.cols = Math.max(1, Math.ceil(w / cell) + 1);
    this.rows = Math.max(1, Math.ceil(h / cell) + 1);
    const size = this.cols * this.rows;
    if (this.heads.length < size) this.heads = new Int32Array(size);
    this.heads.fill(-1, 0, size);
    if (this.next.length < count) this.next = new Int32Array(count);
    for (let i = 0; i < count; i++) {
      const idx = this.cellIndex(positions[i * 3], positions[i * 3 + 1]);
      this.next[i] = this.heads[idx];
      this.heads[idx] = i;
    }
  }

  private cellIndex(x: number, y: number) {
    let cx = Math.floor((x - this.minX) / this.cell);
    let cy = Math.floor((y - this.minY) / this.cell);
    cx = cx < 0 ? 0 : cx >= this.cols ? this.cols - 1 : cx;
    cy = cy < 0 ? 0 : cy >= this.rows ? this.rows - 1 : cy;
    return cy * this.cols + cx;
  }

  /** Visits each unordered pair closer than `maxDist` exactly once. Return false to stop. */
  forEachPair(
    positions: ArrayLike<number>,
    maxDist: number,
    cb: (i: number, j: number, dist: number) => boolean | void,
  ) {
    const { cols, rows, heads, next } = this;
    const max2 = maxDist * maxDist;
    // Half neighbourhood (self, E, SW, S, SE) → every pair checked once.
    const offsets = [
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ];
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        for (let i = heads[cy * cols + cx]; i !== -1; i = next[i]) {
          const xi = positions[i * 3];
          const yi = positions[i * 3 + 1];
          for (const [ox, oy] of offsets) {
            const nx = cx + ox;
            const ny = cy + oy;
            if (nx < 0 || ny >= rows || nx >= cols) continue;
            // Within the same cell, only look at items after i in the list.
            let j = ox === 0 && oy === 0 ? next[i] : heads[ny * cols + nx];
            for (; j !== -1; j = next[j]) {
              const dx = positions[j * 3] - xi;
              const dy = positions[j * 3 + 1] - yi;
              const d2 = dx * dx + dy * dy;
              if (d2 < max2 && cb(i, j, Math.sqrt(d2)) === false) return;
            }
          }
        }
      }
    }
  }
}
