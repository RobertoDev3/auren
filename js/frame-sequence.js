/* =========================================================
   FrameSequence: carrega uma sequência de imagens e desenha
   o frame mais próximo já carregado num canvas (modo "cover").
   Carregamento progressivo: primeiro 1 a cada 8 frames, depois
   preenche os intervalos, então o scroll funciona desde cedo.
   ========================================================= */
window.FrameSequence = class FrameSequence {
  constructor({ canvas, count, src, width, height, poster }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.count = count;
    this.src = src;               // (i) => url, i de 0..count-1
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
    for (let k = 0; k < 6; k++) worker(); // 6 downloads em paralelo
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

  // view = { scale, x, y }: posição do vídeo (px CSS) na tela
  draw(index, view) {
    const i = Math.max(0, Math.min(this.count - 1, Math.round(index)));
    const key = i + ":" + view.scale.toFixed(4) + ":" + view.x.toFixed(1) + ":" + view.y.toFixed(1);
    if (key === this.drawn) return;
    // no frame 0 usa o pôster (mesma imagem em resolução maior)
    const img = (i === 0 && this.poster) || this.frames[i] || this.nearest(i) || this.poster;
    if (!img) return;
    const ctx = this.ctx;
    ctx.fillStyle = "#050404";
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    ctx.drawImage(img, view.x, view.y, this.w * view.scale, this.h * view.scale);
    this.drawn = key;
  }
};
