document.addEventListener("DOMContentLoaded", () => {
  I18n.init();

  window.smooth = new SmoothScroll({ lerp: 0.075, wheelMultiplier: 1 });

  Explode.init(document.getElementById("showcase"), {
    // a rolagem suave já aplica inércia; o vídeo segue o scroll quase direto para não somar duas
    followScroll: window.smooth.wheelEnabled,
  });
  FilmReel.init(document.querySelector("[data-reel]"));
  Bag.init();
  Site.init();
});
