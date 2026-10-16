window.FrameSequence = class FrameSequence {
  constructor({ canvas, count, src, width, height, poster }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.count = count;
    this.src = src;
    this.w = width;
    this.h = height;
    this.frames = new Array(count);
    this.poster = null;
    this.drawn = -1;
    if (poster) {
      const img = new Image();
      img.onload = () => { this.poster = img; this.drawn = -1; this.onload && this.onload(); };
      img.src = poster;
    }
  }

  load() {
    const order = [];
    const seen = new Set();
    for (const step of [8, 4, 2, 1]) {
      for (let i = 0; i < this.count; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
    }
    if (!seen.has(this.count - 1)) order.splice(1, 0, this.count - 1);
    let next = 0;
    const worker = () => {
      if (next >= order.length) return;
      const i = order[next++];
      const img = new Image();
      img.decoding = "async";
      img.onload = () => { this.frames[i] = img; this.drawn = -1; this.onload && this.onload(); worker(); };
      img.onerror = worker;
      img.src = this.src(i);
    };
    for (let k = 0; k < 6; k++) worker();
  }

  nearest(i) {
    for (let d = 0; d < this.count; d++) {
      if (this.frames[i - d]) return this.frames[i - d];
      if (this.frames[i + d]) return this.frames[i + d];
    }
    return null;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.cssW = r.width;
    this.cssH = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingQuality = "high";
    this.drawn = -1;
  }

  draw(index, view) {
    const i = Math.max(0, Math.min(this.count - 1, Math.round(index)));
    const key = i + ":" + view.scale.toFixed(4) + ":" + view.x.toFixed(1) + ":" + view.y.toFixed(1);
    if (key === this.drawn) return;
    const img = (i === 0 && this.poster) || this.frames[i] || this.nearest(i) || this.poster;
    if (!img) return;
    const ctx = this.ctx;
    ctx.fillStyle = "#050404";
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    const w = this.w * view.scale, h = this.h * view.scale;
    ctx.drawImage(img, view.x, view.y, w, h);
    this.feather(view.x, view.y, w, h);
    this.drawn = key;
  }

  // quando o vídeo fica menor que a tela, esfuma as bordas no fundo para não aparecer o recorte
  feather(x, y, w, h) {
    const ctx = this.ctx, size = Math.min(120, w * 0.12, h * 0.16);
    const edges = [
      [x > 0, x, 0, x + size, 0, x, y, size, h],
      [x + w < this.cssW, x + w, 0, x + w - size, 0, x + w - size, y, size, h],
      [y > 0, 0, y, 0, y + size, x, y, w, size],
      [y + h < this.cssH, 0, y + h, 0, y + h - size, x, y + h - size, w, size],
    ];
    for (const [visible, x0, y0, x1, y1, rx, ry, rw, rh] of edges) {
      if (!visible) continue;
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, "#050404");
      g.addColorStop(1, "rgba(5,4,4,0)");
      ctx.fillStyle = g;
      ctx.fillRect(rx, ry, rw, rh);
    }
  }
};
