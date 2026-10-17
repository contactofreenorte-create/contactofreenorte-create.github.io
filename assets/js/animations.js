/* ==========================================================================
   ANIMACIONES
   - Aparición de elementos [data-reveal] al entrar en pantalla
   - Brillo que sigue al cursor en las tarjetas (.card)
   ========================================================================== */

(function () {
  'use strict';

  function setupReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    items.forEach((item) => observer.observe(item));
  }

  function setupCardSpotlight() {
    // Solo en equipos con mouse
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    document.addEventListener(
      'pointermove',
      (event) => {
        const card = event.target.closest('.card');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        card.style.setProperty('--my', `${event.clientY - rect.top}px`);
      },
      { passive: true }
    );
  }

  function init() {
    setupReveal();
    setupCardSpotlight();
  }

  window.FN = window.FN || {};
  window.FN.animations = { init };
})();
