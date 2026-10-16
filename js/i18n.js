/* Idioma e moeda. Textos: [data-i18n] (innerHTML) e [data-i18n-attr="attr:chave;..."].
   Preços: [data-price] em BRL; [data-price-cents] mostra centavos; data-price-format="installment" mostra a parcela. */
window.I18n = (() => {
  const LOCALES = window.AUREN_LOCALES;
  const LANGS = ["pt", "en", "es", "fr", "ja"];

  // câmbio fixo (é um site de demonstração); o valor convertido é arredondado em "round"
  const CURRENCIES = {
    BRL: { rate: 1, round: 1, symbol: "R$" },
    USD: { rate: 0.18, round: 100, symbol: "$" },
    EUR: { rate: 0.165, round: 100, symbol: "€" },
    JPY: { rate: 27, round: 10000, symbol: "¥" },
  };
  const INSTALLMENTS = 12;
  const STORE = "auren.locale";

  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const state = { lang: "pt", currency: "BRL" };

  function t(key, vars) {
    let s = LOCALES[state.lang].strings[key] ?? LOCALES.pt.strings[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
    return s;
  }

  const convert = (brl) => {
    const c = CURRENCIES[state.currency];
    return Math.round((brl * c.rate) / c.round) * c.round;
  };

  function money(value, digits) {
    return new Intl.NumberFormat(LOCALES[state.lang].intl, {
      style: "currency",
      currency: state.currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  const decimals = () => (state.currency === "JPY" ? 0 : 2);
  const price = (brl, { cents = false } = {}) => money(convert(brl), cents ? decimals() : 0);
  const installment = (brl) => money(convert(brl) / INSTALLMENTS, decimals());

  function apply() {
    const L = LOCALES[state.lang];
    document.documentElement.lang = L.htmlLang;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("meta.description"));

    $$("[data-i18n]").forEach((el) => (el.innerHTML = t(el.dataset.i18n)));
    $$("[data-i18n-attr]").forEach((el) =>
      el.dataset.i18nAttr.split(";").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        el.setAttribute(attr, t(key));
      })
    );
    $$("[data-price]").forEach((el) => {
      const brl = Number(el.dataset.price);
      el.textContent = el.dataset.priceFormat === "installment"
        ? t("buy.installments", { amount: installment(brl) })
        : price(brl, { cents: el.hasAttribute("data-price-cents") });
    });
    $$("[data-picker]").forEach(renderPicker);
    document.dispatchEvent(new CustomEvent("i18n:change"));
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {}
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      if (LANGS.includes(saved?.lang)) state.lang = saved.lang;
      if (CURRENCIES[saved?.currency]) state.currency = saved.currency;
    } catch {}
  }

  function set(group, value) {
    state[group] = value;
    save();
    apply();
  }

  /* Seletores: data-picker="lang", "currency" ou "lang currency" (os dois no mesmo menu, usado no celular) */
  function options(group) {
    return group === "lang"
      ? LANGS.map((code) => ({ code, label: LOCALES[code].label, hint: LOCALES[code].short }))
      : Object.entries(CURRENCIES).map(([code, c]) => ({ code, label: code, hint: c.symbol }));
  }

  function renderPicker(picker) {
    const groups = picker.dataset.picker.split(" ");
    const value = groups.map((g) => (g === "lang" ? LOCALES[state.lang].short : state.currency)).join(" · ");
    picker.querySelector("[data-picker-value]").textContent = value;
    picker.querySelector("[data-picker-menu]").innerHTML = groups.map((g) =>
      (groups.length > 1 ? `<p class="picker__group">${t(g === "lang" ? "hero.language" : "hero.currency")}</p>` : "") +
      options(g).map((o) =>
        `<button type="button" class="picker__opt${o.code === state[g] ? " is-on" : ""}" data-group="${g}" data-value="${o.code}">` +
        `<span>${o.label}</span><small>${o.hint}</small></button>`
      ).join("")
    ).join("");
  }

  function closePickers(except) {
    $$("[data-picker].is-open").forEach((p) => {
      if (p === except) return;
      p.classList.remove("is-open");
      p.querySelector("[aria-expanded]").setAttribute("aria-expanded", "false");
    });
  }

  function bindPickers() {
    document.addEventListener("click", (e) => {
      const opt = e.target.closest(".picker__opt");
      if (opt) {
        set(opt.dataset.group, opt.dataset.value);
        return closePickers();
      }
      const toggle = e.target.closest("[data-picker] > button");
      if (!toggle) return closePickers();
      const picker = toggle.parentElement;
      closePickers(picker);
      const open = picker.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("keydown", (e) => e.key === "Escape" && closePickers());
    addEventListener("scroll", () => closePickers(), { passive: true });
  }

  function init() {
    restore();
    bindPickers();
    apply();
  }

  return { init, t, price, get lang() { return state.lang; } };
})();
