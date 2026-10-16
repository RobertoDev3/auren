/* Vídeo da seção Detalhes: toca sem som só enquanto está na tela.
   A barra é dividida em capítulos iguais (data-labels) e acompanha o vídeo a cada quadro. */
window.FilmReel = (() => {
  function init(root) {
    if (!root) return;
    const video = root.querySelector(".reel__video");
    const label = root.querySelector("[data-reel-label]");
    const track = root.querySelector("[data-reel-track]");
    const toggle = root.querySelector("[data-reel-toggle]");
    const sound = root.querySelector("[data-reel-sound]");
    const t = (k) => I18n.t(k);

    let labels = track.dataset.labels.split("|");
    track.style.setProperty("--n", labels.length);
    track.innerHTML = labels.map(() => "<span><i></i></span>").join("");
    const bars = [...track.children];

    let visible = false;
    let userPaused = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    function syncProgress() {
      const chapter = (video.duration || 30) / labels.length;
      const time = video.currentTime;
      label.textContent = labels[Math.min(labels.length - 1, Math.floor(time / chapter))];
      bars.forEach((bar, i) => bar.style.setProperty("--progress", Math.max(0, Math.min(1, (time - i * chapter) / chapter))));
    }

    function loop() {
      syncProgress();
      raf = video.paused ? 0 : requestAnimationFrame(loop);
    }

    function syncTexts() {
      labels = track.dataset.labels.split("|");
      bars.forEach((bar, i) => bar.setAttribute("aria-label", labels[i]));
      toggle.textContent = t(userPaused ? "details.play" : "details.pause");
      toggle.setAttribute("aria-label", t(userPaused ? "details.playAria" : "details.pauseAria"));
      sound.textContent = t(video.muted ? "details.sound" : "details.mute");
      sound.setAttribute("aria-label", t(video.muted ? "details.soundAria" : "details.muteAria"));
      syncProgress();
    }

    function syncPlayback() {
      const shouldPlay = visible && !userPaused && !document.hidden;
      root.classList.toggle("is-paused", !shouldPlay);
      if (shouldPlay) video.play().catch(() => {});
      else video.pause();
      syncTexts();
    }

    toggle.addEventListener("click", () => {
      userPaused = !userPaused;
      syncPlayback();
    });
    sound.addEventListener("click", () => {
      video.muted = !video.muted;
      if (!video.muted) video.play().catch(() => {});
      syncTexts();
    });
    track.addEventListener("click", (e) => {
      const k = bars.indexOf(e.target.closest("span"));
      if (k < 0 || !video.duration) return;
      video.currentTime = k * (video.duration / labels.length);
      syncProgress();
    });

    video.addEventListener("play", () => { if (!raf) raf = requestAnimationFrame(loop); });
    video.addEventListener("seeked", syncProgress);
    video.addEventListener("loadedmetadata", syncProgress);
    document.addEventListener("visibilitychange", syncPlayback);
    document.addEventListener("i18n:change", syncTexts);

    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      syncPlayback();
    }, { threshold: 0.35 }).observe(root);
  }

  return { init };
})();
