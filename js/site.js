/* Barra fixa, navegação por âncoras, entradas ao rolar, avisos e interações da página de compra. */
window.Site = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const HEADER_OFFSET = 64;

  function topbar() {
    const bar = $("#topbar");
    const showcase = $("#showcase");
    const links = $$(".topbar__links a");
    const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
    const update = () => {
      bar.classList.toggle("is-visible", scrollY > innerHeight * 0.35);
      const mid = innerHeight * 0.4;
      let active = null;
      for (const sec of sections) if (sec.getBoundingClientRect().top <= mid) active = sec;
      if (showcase.getBoundingClientRect().bottom > mid) active = null;
      links.forEach((a) => a.classList.toggle("is-active", active && a.getAttribute("href") === "#" + active.id));
    };
    addEventListener("scroll", update, { passive: true });
    update();
  }

  /* Navegação por âncoras.
     Se o caminho atravessa o showcase, rolar até o destino tocaria o vídeo inteiro (o relógio montando
     ou desmontando em alta velocidade). Nesse caso a tela escurece, salta direto e reaparece. */
  function anchors() {
    const showcase = $("#showcase");
    const curtain = $("[data-curtain]");
    let jumping = false;

    const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
    const targetY = (id) => id === "#hero" ? 0 : Math.min(maxScroll(), Math.max(0, $(id).getBoundingClientRect().top + scrollY - HEADER_OFFSET));

    function crossesShowcase(from, to) {
      const start = showcase.offsetTop;
      const end = start + showcase.offsetHeight - innerHeight;
      const overlap = Math.min(Math.max(from, to), end) - Math.max(Math.min(from, to), start);
      return overlap > innerHeight;
    }

    function replayHero() {
      $$(".hero .reveal").forEach((el) => {
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "";
      });
    }

    function jump(y) {
      jumping = true;
      curtain.classList.add("is-on");
      setTimeout(() => {
        if (window.smooth) window.smooth.scrollTo(y, { immediate: true });
        else scrollTo(0, y);
        Explode.sync();
        if (y === 0) replayHero();
        requestAnimationFrame(() => requestAnimationFrame(() => {
          curtain.classList.remove("is-on");
          jumping = false;
        }));
      }, 380);
    }

    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      e.preventDefault();
      if (id === "#" || jumping || (id !== "#hero" && !$(id))) return;
      const y = targetY(id);
      if (crossesShowcase(scrollY, y)) return jump(y);
      if (window.smooth && window.smooth.wheelEnabled) window.smooth.scrollTo(y);
      else scrollTo({ top: y, behavior: "smooth" });
    });
  }

  function reveals() {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    }, { rootMargin: "0px 0px -10% 0px" });
    $$("[data-reveal]").forEach((el) => io.observe(el));
  }

  function parallax() {
    const img = $(".manifesto__media img");
    if (!img || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sec = img.closest("section");
    const update = () => {
      const r = sec.getBoundingClientRect();
      const t = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      img.style.setProperty("--shift", `${(t * -60).toFixed(1)}px`);
    };
    addEventListener("scroll", update, { passive: true });
    update();
  }

  let toastTimer;
  function toast(html) {
    const el = $("[data-toast]");
    el.innerHTML = html;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 3200);
  }

  function shop() {
    $$("[data-choices]").forEach((group) => group.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      $$("button", group).forEach((b) => b.classList.toggle("is-on", b === btn));
    }));

    $("[data-add-to-bag]")?.addEventListener("click", () => {
      const strap = Number($("[data-choices] .is-on")?.dataset.strap || 0);
      const engraving = $("[data-engrave]")?.value.trim() || "";
      if (Bag.add({ strap, engraving })) toast(I18n.t("toast.added"));
    });

    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-unavailable]");
      if (!el) return;
      e.preventDefault();
      toast(I18n.t("toast.unavailable"));
    });

    const form = $("[data-newsletter]");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      $(".newsletter__field", form).hidden = true;
      $(".newsletter__ok", form).hidden = false;
    });
  }

  function init() { topbar(); anchors(); reveals(); parallax(); shop(); }
  return { init, toast };
})();
