/* =========================================================
   FilmReel: o vídeo de detalhes da página. Enquanto os clipes não chegam,
   cada cena é uma imagem com movimento lento de câmera (zoom),
   trocando com fade. Toca só quando está visível na tela.
   ========================================================= */
window.FilmReel = (() => {
  const DURATION = 4500; // ms por cena

  function init(root) {
    if (!root) return;
    const slides = [...root.querySelectorAll(".reel__slide")];
    const label = root.querySelector("[data-reel-label]");
    const track = root.querySelector("[data-reel-track]");
    const toggle = root.querySelector("[data-reel-toggle]");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    root.style.setProperty("--dur", DURATION + "ms");
    track.style.setProperty("--n", slides.length);
    track.innerHTML = slides.map(() => "<span><i></i></span>").join("");
    const bars = [...track.children];

    let index = -1, timer = null, visible = false, paused = false, startedAt = 0, remaining = DURATION;

    function show(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, k) => {
        const on = k === index;
        s.classList.toggle("is-on", on);
        if (on) {
          s.classList.remove("is-moving");
          void s.offsetWidth;                 // reinicia o zoom
          if (!reduce) s.classList.add("is-moving");
        }
      });
      bars.forEach((b, k) => {
        b.classList.toggle("is-done", k < index);
        b.classList.remove("is-on");
        if (k === index) { void b.offsetWidth; b.classList.add("is-on"); }
      });
      label.textContent = slides[index].dataset.label;
      remaining = DURATION;
      schedule();
    }

    function schedule() {
      clearTimeout(timer);
      if (!visible || paused) return;
      startedAt = performance.now();
      timer = setTimeout(() => show(index + 1), remaining);
    }

    function hold() {
      clearTimeout(timer);
      remaining = Math.max(0, remaining - (performance.now() - startedAt));
    }

    function setPaused(v) {
      paused = v;
      root.classList.toggle("is-paused", v || !visible);
      toggle.textContent = v ? "Assistir" : "Pausar";
      toggle.setAttribute("aria-label", v ? "Continuar vídeo" : "Pausar vídeo");
      v ? hold() : schedule();
    }

    toggle.addEventListener("click", () => setPaused(!paused));
    track.addEventListener("click", (e) => {
      const k = bars.indexOf(e.target.closest("span"));
      if (k >= 0) show(k);
    });

    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      root.classList.toggle("is-paused", paused || !visible);
      if (index < 0 && visible) return show(0);
      visible ? schedule() : hold();
    }, { threshold: 0.35 }).observe(root);
  }

  return { init };
})();
