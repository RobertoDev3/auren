/**
 * SmoothScroll — rolagem suave com inércia (sem dependências).
 * Mesmo módulo e mesma configuração do Last Ember (lerp 0.075).
 *
 * - Roda do mouse/trackpad: interpola a posição com lerp, dando a sensação de inércia.
 * - Toque (celular/tablet): mantém a rolagem nativa, que já é suave.
 * - Teclado, barra de rolagem e leitores de tela continuam funcionando normalmente.
 * - Respeita prefers-reduced-motion.
 * - scrollTo(alvo) anima até âncoras com easing.
 */
(function (window, document) {
  'use strict';

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LINE_HEIGHT = 40;

  function SmoothScroll(options) {
    options = options || {};
    this.lerp = options.lerp || 0.1;
    this.wheelMultiplier = options.wheelMultiplier || 1;

    this.current = window.scrollY;
    this.target = this.current;
    this.isRunning = false;   // animação de roda em andamento
    this.isStopped = false;   // pausado (menu/modal abertos)
    this.tween = null;        // animação programática (scrollTo)
    this.rafId = null;

    this.wheelEnabled = !reducedMotion && window.matchMedia('(pointer: fine)').matches;

    this._onWheel = this._onWheel.bind(this);
    this._onNativeScroll = this._onNativeScroll.bind(this);
    this._raf = this._raf.bind(this);

    if (this.wheelEnabled) {
      window.addEventListener('wheel', this._onWheel, { passive: false });
      document.documentElement.classList.add('has-smooth-scroll');
    }
    window.addEventListener('scroll', this._onNativeScroll, { passive: true });
  }

  SmoothScroll.prototype.maxScroll = function () {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  };

  /** Verifica se o evento ocorreu dentro de um elemento que rola por conta própria */
  SmoothScroll.prototype._isInsideScrollable = function (el, deltaY) {
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.hasAttribute && el.hasAttribute('data-native-scroll')) return true;
      if (el.nodeType === 1) {
        var style = window.getComputedStyle(el);
        var oy = style.overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
          var atTop = el.scrollTop <= 0;
          var atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
          if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return true;
        }
      }
      el = el.parentNode;
    }
    return false;
  };

  SmoothScroll.prototype._onWheel = function (e) {
    if (this.isStopped || e.ctrlKey || e.defaultPrevented) return;
    // Gestos horizontais ficam nativos
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (this._isInsideScrollable(e.target, e.deltaY)) return;

    var delta = e.deltaY;
    if (e.deltaMode === 1) delta *= LINE_HEIGHT;
    else if (e.deltaMode === 2) delta *= window.innerHeight;

    e.preventDefault();

    // Uma rolagem de roda interrompe qualquer animação de âncora
    if (this.tween) {
      this.tween = null;
      this.current = window.scrollY;
      this.target = this.current;
    }

    this.target = clamp(this.target + delta * this.wheelMultiplier, 0, this.maxScroll());
    this._start();
  };

  SmoothScroll.prototype._onNativeScroll = function () {
    // Rolagem vinda de teclado, barra de rolagem ou toque: sincroniza o estado
    if (!this.isRunning && !this.tween) {
      this.current = window.scrollY;
      this.target = this.current;
    }
  };

  SmoothScroll.prototype._start = function () {
    this.isRunning = true;
    if (this.rafId) return; // o laço já está rodando
    this.lastTime = null;
    this.rafId = window.requestAnimationFrame(this._raf);
  };

  SmoothScroll.prototype._raf = function (now) {
    this.rafId = null;
    if (!this.isRunning) return;

    // Tempo desde o último quadro, normalizado para 60 fps (1 = 16,7 ms).
    // Limitado para que uma travada do navegador não cause um salto brusco.
    var frames = this.lastTime === null ? 1 : clamp((now - this.lastTime) / (1000 / 60), 0.25, 3);
    this.lastTime = now;

    if (this.tween) {
      var t = clamp((now - this.tween.startTime) / this.tween.duration, 0, 1);
      var eased = this.tween.ease(t);
      this.current = this.tween.from + (this.tween.to - this.tween.from) * eased;
      window.scrollTo(0, this.current);
      if (t >= 1) {
        var done = this.tween.onComplete;
        this.tween = null;
        this.target = this.current;
        this.isRunning = false;
        if (done) done();
        return;
      }
    } else {
      // Interpolação independente da taxa de quadros: a mesma sensação a 60, 120 ou 144 Hz
      var factor = 1 - Math.pow(1 - this.lerp, frames);
      this.current += (this.target - this.current) * factor;
      if (Math.abs(this.target - this.current) < 0.3) this.current = this.target;
      window.scrollTo(0, this.current);
      if (this.current === this.target) {
        this.isRunning = false;
        return;
      }
    }

    this.rafId = window.requestAnimationFrame(this._raf);
  };

  /**
   * Rola até um elemento ou posição.
   * @param {Element|number} target
   * @param {{offset?: number, onComplete?: Function, immediate?: boolean}} opts
   */
  SmoothScroll.prototype.scrollTo = function (target, opts) {
    opts = opts || {};
    var y = typeof target === 'number'
      ? target
      : target.getBoundingClientRect().top + window.scrollY;
    y = clamp(y + (opts.offset || 0), 0, this.maxScroll());

    if (opts.immediate || reducedMotion) {
      window.scrollTo(0, y);
      this.current = this.target = y;
      if (opts.onComplete) opts.onComplete();
      return;
    }

    var distance = Math.abs(y - window.scrollY);
    var duration = clamp(500 + distance * 0.35, 700, 1600);

    this.tween = {
      from: window.scrollY,
      to: y,
      duration: duration,
      startTime: performance.now(),
      ease: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }, // easeOutExpo
      onComplete: opts.onComplete
    };
    this.current = this.tween.from;
    this._start();
  };

  SmoothScroll.prototype.stop = function () {
    this.isStopped = true;
    this.isRunning = false;
    if (this.rafId) window.cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.tween = null;
    this.current = this.target = window.scrollY;
  };

  SmoothScroll.prototype.start = function () {
    this.isStopped = false;
    this.current = this.target = window.scrollY;
  };

  window.SmoothScroll = SmoothScroll;
})(window, document);
