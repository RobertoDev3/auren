/* =========================================================
   Site: barra fixa, âncoras com rolagem suave, entradas ao
   rolar e as interações "de mentira" da loja (sacola, opções,
   newsletter). Nada aqui envia dados: é um site de portfólio.
   ========================================================= */
window.Site = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function topbar() {
    const bar = $("#topbar");
    const showcase = $("#showcase");
    const links = $$(".topbar__links a");
    const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
    const update = () => {
      // aparece quando o hero sai da tela (o vídeo já começou a desmontar)
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

  function anchors() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (id === "#") return;
      e.preventDefault();
      const to = id === "#hero" ? 0 : $(id);
      if (to === null) return;
      const offset = id === "#hero" ? 0 : -64;
      if (window.smooth && window.smooth.wheelEnabled) window.smooth.scrollTo(to, { offset });
      else scrollTo({ top: typeof to === "number" ? to : to.getBoundingClientRect().top + scrollY + offset, behavior: "smooth" });
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
      const t = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; // -1..1
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
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 2800);
  }

  function shop() {
    let count = 0;
    const setCount = () => $$("[data-bag-count]").forEach((b) => {
      b.textContent = count;
      b.hidden = count === 0;
      b.classList.remove("is-bump"); void b.offsetWidth; b.classList.add("is-bump");
    });
    $$("[data-bag-count]").forEach((b) => (b.hidden = true));

    $$("[data-choices]").forEach((group) => group.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      $$("button", group).forEach((b) => b.classList.toggle("is-on", b === btn));
    }));

    $("[data-add-to-bag]")?.addEventListener("click", () => {
      count++;
      setCount();
      const strap = $("[data-choices] .is-on")?.textContent || "";
      const text = $("[data-engrave]")?.value.trim();
      toast(`<b>OBSIDIAN</b> na sacola · ${strap}${text ? ` · gravação “${text}”` : ""}`);
    });

    $$("[data-bag]").forEach((b) => b.addEventListener("click", () =>
      toast(count ? `Sacola com <b>${count}</b> ${count > 1 ? "peças" : "peça"} · checkout desativado neste portfólio` : "Sua sacola está vazia")));

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
