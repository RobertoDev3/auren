document.addEventListener("DOMContentLoaded", () => {
  // lerp menor = mais suave (0.075 ≈ desaceleração longa sem ficar lenta), igual ao Last Ember
  window.smooth = new SmoothScroll({ lerp: 0.075, wheelMultiplier: 1 });

  Explode.init(document.getElementById("showcase"), {
    // com a rolagem suave ativa, a inércia já vem do scroll: o vídeo segue direto
    followScroll: window.smooth.wheelEnabled,
  });
  FilmReel.init(document.querySelector("[data-reel]"));
  Site.init();
});
