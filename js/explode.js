/* =========================================================
   Explode: o scroll avança o vídeo do relógio desmontando.
   O hero é o frame 0; cada peça que se solta acende uma
   anotação ligada a ela por uma linha que acompanha o vídeo.
   Coordenadas abaixo estão no espaço do vídeo (1280x720).
   ========================================================= */
window.Explode = (() => {
  const VIDEO = { w: 1280, h: 720, frames: 193 };
  const FRAME_SRC = (i) => `assets/frames/${String(i + 1).padStart(4, "0")}.webp`;
  const POSTER = "assets/images/hero.jpg";       // = frame 0 em resolução maior

  // trecho do scroll em que o vídeo toca (o resto segura o último frame)
  const PLAY = [0.03, 0.9];

  // ponto de cada peça ao longo do vídeo: [frame, x, y] (medido nos frames)
  const TRACKS = {
    cristal:   [[48, 590, 405], [96, 355, 305], [120, 240, 268], [144, 212, 245], [192, 180, 228]],
    aro:       [[96, 600, 415], [120, 450, 350], [144, 385, 310], [192, 325, 285]],
    ponteiros: [[120, 615, 400], [144, 495, 355], [192, 428, 322]],
    mostrador: [[120, 830, 225], [144, 720, 185], [192, 635, 160]],
    movimento: [[144, 905, 272], [192, 815, 245]],
    caixa:     [[120, 1100, 300], [144, 1110, 345], [192, 1100, 330]],
  };

  // quando cada anotação acende (frame) e onde o texto fica (espaço do vídeo)
  const NOTES = {
    cristal:   { at: 44,  x: 60,   y: 470, side: "below" },
    aro:       { at: 84,  x: 300,  y: 520, side: "below" },
    ponteiros: { at: 112, x: 510,  y: 565, side: "below" },
    mostrador: { at: 122, x: 660,  y: 150, side: "above" },
    movimento: { at: 140, x: 860,  y: 150, side: "above" },
    caixa:     { at: 156, x: 1040, y: 150, side: "above" },
  };

  // celular: a câmera acompanha a peça da vez ([frame, centro x no vídeo])
  const MOBILE_PATH = [[0, 860], [30, 800], [60, 520], [96, 470], [116, 560], [130, 700], [146, 850], [162, 1040], [178, 1040]];

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (v, a, b) => clamp((v - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const SVG = "http://www.w3.org/2000/svg";

  // interpola uma trilha [[frame, ...valores]] no frame f
  function sample(track, f) {
    if (f <= track[0][0]) return track[0].slice(1);
    for (let i = 1; i < track.length; i++) {
      const [f1] = track[i];
      if (f <= f1) {
        const a = track[i - 1], b = track[i];
        const t = (f - a[0]) / (f1 - a[0]);
        return a.slice(1).map((v, k) => lerp(v, b[k + 1], t));
      }
    }
    return track[track.length - 1].slice(1);
  }

  let el = {}, seq, size = { w: 0, h: 0, mobile: false };
  let target = 0, current = 0, last = 0, dirty = true, follow = 0.12;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  // posição do vídeo na tela para o frame f
  function view(f, p) {
    const { w, h, mobile } = size;
    if (!mobile) {
      // "cover" com o relógio puxado para a direita (igual ao hero)
      const scale = Math.max(w / VIDEO.w, h / VIDEO.h) * 1.02;
      const x = (w - VIDEO.w * scale) * 0.62 + mouse.x;
      const y = (h - VIDEO.h * scale) * 0.5 + mouse.y;
      return { scale, x, y };
    }
    // celular: vídeo maior que a tela, câmera segue as peças e no fim recua
    const close = (h * 0.7) / VIDEO.h;
    const wide = (w / VIDEO.w) * 1.2;
    const out = ease(range(p, 0.88, 0.97));
    const scale = lerp(close, wide, out);
    const cx = lerp(sample(MOBILE_PATH, f)[0], VIDEO.w / 2, out);
    return { scale, x: w / 2 - cx * scale, y: h * 0.4 - (VIDEO.h / 2) * scale };
  }

  const toScreen = (v, x, y) => [v.x + x * v.scale, v.y + y * v.scale];

  function render(p) {
    const f = lerp(0, VIDEO.frames - 1, range(p, PLAY[0], PLAY[1]));
    const v = view(f, p);
    seq.draw(f, v);

    // interface do hero sai nos primeiros passos do scroll
    const out = range(p, 0, 0.05);
    el.hero.style.opacity = 1 - out;
    el.hero.style.transform = `translate3d(0, ${-40 * range(p, 0, 0.08)}px, 0)`;
    el.hero.style.visibility = p > 0.08 ? "hidden" : "visible";
    el.stage.style.setProperty("--shade-l", (0.72 - 0.4 * range(p, 0, 0.12)).toFixed(3));

    let count = 0, currentName = null;
    for (const [name, n] of Object.entries(NOTES)) {
      const on = f >= n.at;
      if (on) { count++; currentName = name; }
      const note = el.notes[name];
      note.classList.toggle("is-on", on);

      if (size.mobile) continue;
      // texto ancorado no espaço do vídeo, mantido dentro da tela
      const [ax, ay] = toScreen(v, n.x, n.y);
      const nh = note.offsetHeight, nw = note.offsetWidth;
      const left = clamp(ax, 24, size.w - nw - 24);
      const top = n.side === "above" ? clamp(ay - nh, 20, size.h - nh - 20) : clamp(ay, 20, size.h - nh - 20);
      note.style.left = `${left}px`;
      note.style.top = `${top}px`;

      // linha: da peça até a borda do texto
      const [px, py] = sample(TRACKS[name], f);
      const [sx, sy] = toScreen(v, px, py);
      const ex = left + 2, ey = n.side === "above" ? top + nh + 10 : top - 10;
      const { line, dot, ring } = el.lines[name];
      line.setAttribute("x1", sx); line.setAttribute("y1", sy);
      line.setAttribute("x2", ex); line.setAttribute("y2", ey);
      dot.setAttribute("cx", sx); dot.setAttribute("cy", sy);
      ring.setAttribute("cx", sx); ring.setAttribute("cy", sy);
      const o = on ? 1 : 0;
      line.style.opacity = o; dot.style.opacity = o; ring.style.opacity = o * 0.5;
    }
    for (const [name, note] of Object.entries(el.notes)) note.classList.toggle("is-current", name === currentName);

    el.progress.style.opacity = range(p, 0.06, 0.12) * (1 - range(p, 0.98, 1));
    el.progressNum.textContent = String(count).padStart(2, "0");
    el.progress.style.setProperty("--p", (count / 6).toFixed(3));
  }

  function readScroll() {
    const r = el.section.getBoundingClientRect();
    const total = el.section.offsetHeight - el.stage.offsetHeight;
    target = total > 0 ? clamp(-r.top / total) : 0;
  }

  function measure() {
    size = { w: el.stage.clientWidth, h: el.stage.clientHeight, mobile: el.stage.clientWidth < 860 };
    el.svg.setAttribute("viewBox", `0 0 ${size.w} ${size.h}`);
    seq.resize();
    dirty = true;
  }

  function tick(now) {
    const dt = Math.min(64, now - (last || now));
    last = now;
    const k = 1 - Math.pow(1 - follow, dt / 16.667);
    const prev = current;
    current += (target - current) * k;
    if (Math.abs(target - current) < 0.00005) current = target;
    // parallax leve do mouse, só enquanto o hero está na tela
    const mk = 1 - Math.pow(1 - 0.06, dt / 16.667);
    const fade = 1 - range(current, 0, 0.05);
    const mx = mouse.tx * fade, my = mouse.ty * fade;
    const moved = Math.abs(mx - mouse.x) + Math.abs(my - mouse.y) > 0.05;
    mouse.x += (mx - mouse.x) * mk; mouse.y += (my - mouse.y) * mk;
    if (dirty || moved || current !== prev) { render(current); dirty = false; }
    requestAnimationFrame(tick);
  }

  function buildLines() {
    el.lines = {};
    for (const name of Object.keys(NOTES)) {
      const line = document.createElementNS(SVG, "line");
      const ring = document.createElementNS(SVG, "circle");
      const dot = document.createElementNS(SVG, "circle");
      ring.setAttribute("class", "ring"); ring.setAttribute("r", "8");
      dot.setAttribute("r", "3");
      el.svg.append(line, ring, dot);
      el.lines[name] = { line, dot, ring };
    }
  }

  function init(section, opts = {}) {
    if (!section) return;
    if (opts.followScroll) follow = 0.5; // quase direto: evita somar duas inércias
    el.section = section;
    el.stage = section.querySelector(".showcase__stage");
    el.hero = section.querySelector(".hero");
    el.svg = section.querySelector(".film__lines");
    el.progress = section.querySelector(".progress");
    el.progressNum = section.querySelector(".progress__num");
    el.notes = {};
    section.querySelectorAll(".note").forEach((n) => (el.notes[n.dataset.part] = n));
    buildLines();

    seq = new FrameSequence({
      canvas: section.querySelector(".film__canvas"),
      count: VIDEO.frames, src: FRAME_SRC, width: VIDEO.w, height: VIDEO.h, poster: POSTER,
    });
    seq.onload = () => (dirty = true);
    seq.load();

    measure();
    readScroll();
    current = target;

    addEventListener("resize", measure);
    addEventListener("scroll", readScroll, { passive: true });
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      section.addEventListener("mousemove", (e) => {
        mouse.tx = (e.clientX / innerWidth - 0.5) * -14;
        mouse.ty = (e.clientY / innerHeight - 0.5) * -10;
      });
      section.addEventListener("mouseleave", () => { mouse.tx = 0; mouse.ty = 0; });
    }
    requestAnimationFrame(tick);
  }

  // usado nos testes: força um progresso sem suavização
  function seek(p) { target = current = clamp(p); render(current); }

  return { init, seek, ready: () => seq.frames.every(Boolean) };
})();
