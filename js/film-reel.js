/* Vídeo de detalhes: reprodução visível, som opcional e capítulos. */
window.FilmReel = (() => {
  function init(root) {
    if (!root) return;
    const video = root.querySelector(".reel__video");
    const label = root.querySelector("[data-reel-label]");
    const track = root.querySelector("[data-reel-track]");
    const toggle = root.querySelector("[data-reel-toggle]");
    const sound = root.querySelector("[data-reel-sound]");
    const labels = track.dataset.labels.split("|");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    track.style.setProperty("--n", labels.length);
    track.innerHTML = labels.map(() => "<span><i></i></span>").join("");
    const bars = [...track.children];
    let visible = false;
    let userPaused = reduce;

    function syncProgress() {
      const duration = video.duration || 30;
      const chapter = duration / labels.length;
      const index = Math.min(labels.length - 1, Math.floor(video.currentTime / chapter));
      label.textContent = labels[index];
      bars.forEach((bar, i) => {
        const progress = Math.max(0, Math.min(1, (video.currentTime - i * chapter) / chapter));
        bar.style.setProperty("--progress", progress);
        bar.setAttribute("aria-label", labels[i]);
      });
    }

    function syncPlayback() {
      const shouldPlay = visible && !userPaused && !document.hidden;
      root.classList.toggle("is-paused", !shouldPlay);
      toggle.textContent = userPaused ? "Assistir" : "Pausar";
      toggle.setAttribute("aria-label", userPaused ? "Continuar vídeo" : "Pausar vídeo");
      if (shouldPlay) video.play().catch(() => {});
      else video.pause();
    }

    toggle.addEventListener("click", () => {
      userPaused = !userPaused;
      syncPlayback();
    });
    sound.addEventListener("click", () => {
      video.muted = !video.muted;
      sound.textContent = video.muted ? "Som" : "Sem som";
      sound.setAttribute("aria-label", video.muted ? "Ativar som" : "Desativar som");
      if (!video.muted) video.play().catch(() => {});
    });
    track.addEventListener("click", (e) => {
      const k = bars.indexOf(e.target.closest("span"));
      if (k < 0 || !video.duration) return;
      video.currentTime = k * (video.duration / labels.length);
      syncProgress();
      syncPlayback();
    });

    video.addEventListener("timeupdate", syncProgress);
    video.addEventListener("loadedmetadata", syncProgress);
    document.addEventListener("visibilitychange", syncPlayback);

    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      syncPlayback();
    }, { threshold: 0.35 }).observe(root);
  }

  return { init };
})();
