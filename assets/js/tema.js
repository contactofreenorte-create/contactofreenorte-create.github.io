/* ==========================================================================
   TEMA — Cambia entre el tema Oro (negro y dorado) y el tema Azul
   La elección se guarda en el navegador del visitante.
   ========================================================================== */

(function () {
  'use strict';

  const TEMAS = {
    oro: { nombre: 'Oro', color: '#070605', siguiente: 'azul' },
    azul: { nombre: 'Azul', color: '#05080f', siguiente: 'oro' },
  };

  function aplicar(tema) {
    const t = TEMAS[tema] || TEMAS.oro;
    const raiz = document.documentElement;
    raiz.setAttribute('data-theme', TEMAS[tema] ? tema : 'oro');

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t.color);

    document.querySelectorAll('[data-theme-label]').forEach((el) => { el.textContent = t.nombre; });
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
      b.setAttribute('aria-label', `Tema ${t.nombre}. Cambiar a tema ${TEMAS[t.siguiente].nombre}`);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    aplicar(document.documentElement.getAttribute('data-theme'));

    document.querySelectorAll('[data-theme-toggle]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const actual = document.documentElement.getAttribute('data-theme');
        const siguiente = (TEMAS[actual] || TEMAS.oro).siguiente;
        aplicar(siguiente);
        try { localStorage.setItem('fn-tema', siguiente); } catch (e) { /* sin almacenamiento */ }
      });
    });
  });
})();
