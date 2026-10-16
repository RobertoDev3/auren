window.Bag = (() => {
  const STORE = "auren.bag";
  const MAX_PIECES = 3;
  const PRODUCT = { name: "OBSIDIAN", ref: "AU-3715R-BK", price: 168900, image: "assets/images/colecao-obsidian.jpg" };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const t = (k, v) => I18n.t(k, v);

  let items = [];
  let panel, body, foot, countEl, anchor = null;

  const count = () => items.reduce((n, i) => n + i.qty, 0);
  const subtotal = () => items.reduce((n, i) => n + i.qty * PRODUCT.price, 0);

  const escape = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function load() {
    try { items = JSON.parse(localStorage.getItem(STORE)) || []; } catch { items = []; }
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(items)); } catch {}
  }

  function badges(bump) {
    const n = count();
    $$("[data-bag-count]").forEach((b) => {
      b.textContent = n;
      b.hidden = n === 0;
      if (bump) { b.classList.remove("is-bump"); void b.offsetWidth; b.classList.add("is-bump"); }
    });
  }

  function itemHTML(item) {
    const engraving = item.engraving
      ? `<p class="bag-item__meta">${t("bag.engraving")}: “${escape(item.engraving)}”</p>` : "";
    return `
      <li class="bag-item" data-id="${item.id}">
        <img class="bag-item__img" src="${PRODUCT.image}" alt="">
        <div class="bag-item__info">
          <div class="bag-item__top">
            <h3>${PRODUCT.name}</h3>
            <span class="bag-item__price">${I18n.price(PRODUCT.price * item.qty)}</span>
          </div>
          <p class="bag-item__meta">${PRODUCT.ref} · ${t("strap." + item.strap)}</p>
          ${engraving}
          <div class="bag-item__actions">
            <div class="qty" role="group" aria-label="${t("bag.qty")}">
              <button type="button" data-qty="-1" aria-label="${t("bag.less")}">−</button>
              <span>${item.qty}</span>
              <button type="button" data-qty="1" aria-label="${t("bag.more")}"${count() >= MAX_PIECES ? " disabled" : ""}>+</button>
            </div>
            <button type="button" class="bag-item__remove" data-remove>${t("bag.remove")}</button>
          </div>
        </div>
      </li>`;
  }

  function render() {
    const n = count();
    countEl.textContent = n ? `(${n})` : "";
    if (!n) {
      body.innerHTML = `
        <div class="bag__empty">
          <p>${t("bag.empty")}</p>
          <a href="#comprar" data-bag-close>${t("bag.emptyCta")}</a>
        </div>`;
      foot.hidden = true;
      return;
    }
    body.innerHTML = `<p class="bag__edition">${t("bag.edition")}</p><ul class="bag__list">${items.map(itemHTML).join("")}</ul>`;
    foot.hidden = false;
    foot.innerHTML = `
      <dl class="bag__sum">
        <div><dt>${t("bag.subtotal")}</dt><dd>${I18n.price(subtotal())}</dd></div>
        <div><dt>${t("bag.shipping")}</dt><dd>${t("bag.free")}</dd></div>
        <div class="bag__total"><dt>${t("bag.total")}</dt><dd>${I18n.price(subtotal())}</dd></div>
      </dl>
      <button type="button" class="btn btn--primary bag__checkout" data-unavailable>${t("bag.checkout")}</button>
      <button type="button" class="bag__continue" data-bag-close>${t("bag.continue")}</button>`;
  }

  function commit(bump) {
    save();
    badges(bump);
    render();
  }

  function add({ strap, engraving }) {
    if (count() >= MAX_PIECES) {
      Site.toast(t("toast.limit"));
      return false;
    }
    const same = items.find((i) => i.strap === strap && i.engraving === engraving);
    if (same) same.qty++;
    else items.push({ id: Date.now().toString(36), strap, engraving, qty: 1 });
    commit(true);
    return true;
  }

  function place(button) {
    const r = button.getBoundingClientRect();
    panel.style.top = `${Math.round(r.bottom + 12)}px`;
    panel.style.right = `${Math.max(12, Math.round(innerWidth - r.right - 6))}px`;
  }

  function open(button) {
    anchor = button;
    place(button);
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    $$("[data-bag]").forEach((b) => b.setAttribute("aria-expanded", String(b === button)));
  }

  function close() {
    if (!panel.classList.contains("is-open")) return;
    anchor = null;
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    $$("[data-bag]").forEach((b) => b.setAttribute("aria-expanded", "false"));
  }

  function bind() {
    document.addEventListener("click", (e) => {
      const toggle = e.target.closest("[data-bag]");
      if (toggle) {
        const isOpen = panel.classList.contains("is-open") && toggle.getAttribute("aria-expanded") === "true";
        return isOpen ? close() : open(toggle);
      }
      if (e.target.closest("[data-bag-close]")) return close();
      if (!panel.contains(e.target)) return close();

      const row = e.target.closest(".bag-item");
      if (!row) return;
      const item = items.find((i) => i.id === row.dataset.id);
      const step = e.target.closest("[data-qty]");
      if (step) {
        const delta = Number(step.dataset.qty);
        if (delta > 0 && count() >= MAX_PIECES) return Site.toast(t("toast.limit"));
        item.qty += delta;
        if (item.qty <= 0) items = items.filter((i) => i !== item);
        commit(false);
      } else if (e.target.closest("[data-remove]")) {
        items = items.filter((i) => i !== item);
        commit(false);
      }
    });
    document.addEventListener("keydown", (e) => e.key === "Escape" && close());
    const follow = () => anchor && place(anchor);
    addEventListener("scroll", follow, { passive: true });
    $("#topbar").addEventListener("transitionend", follow);
    addEventListener("resize", close);
    document.addEventListener("i18n:change", render);
  }

  function init() {
    panel = $("#bag");
    body = $("[data-bag-body]", panel);
    foot = $("[data-bag-foot]", panel);
    countEl = $("[data-bag-items]", panel);
    load();
    badges(false);
    render();
    bind();
  }

  return { init, add, close };
})();
