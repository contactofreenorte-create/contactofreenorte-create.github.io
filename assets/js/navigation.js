/* ==========================================================================
   NAVEGACIÓN
   - Menú móvil (abrir / cerrar)
   - Header con fondo al hacer scroll
   - Marca en el menú la sección visible
   ========================================================================== */

(function () {
  'use strict';

  const DESKTOP_QUERY = '(min-width: 1100px)';

  function setupMobileMenu(nav, toggle) {
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    };

    toggle.addEventListener('click', () => {
      setOpen(!nav.classList.contains('is-open'));
    });

    // Cierra el menú al elegir una opción
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Si la pantalla pasa a tamaño computador, el menú móvil se cierra
    window.matchMedia(DESKTOP_QUERY).addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  function setupScrolledHeader(header) {
    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  function setupActiveLink(nav) {
    const links = [...nav.querySelectorAll('.nav__link')];
    const sections = links
      .map((link) => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    if (sections.length === 0) return;

    let ticking = false;

    // La sección activa es la última cuyo inicio ya pasó el 40% de la pantalla
    const update = () => {
      ticking = false;
      const line = window.innerHeight * 0.4;
      // (el menú no sigue el mismo orden que la página, por eso se compara la posición)
      let current = sections[0];
      let currentTop = -Infinity;
      sections.forEach((section) => {
        const top = section.getBoundingClientRect().top;
        if (top <= line && top > currentTop) {
          current = section;
          currentTop = top;
        }
      });

      // Al llegar al final de la página, se marca la última sección
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = sections.reduce((a, b) => (a.offsetTop > b.offsetTop ? a : b));
      }

      const id = `#${current.id}`;
      links.forEach((link) => {
        const active = link.getAttribute('href') === id;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  function init() {
    const header = document.getElementById('header');
    const nav = document.getElementById('nav');
    const toggle = document.querySelector('.nav-toggle');
    if (!header || !nav || !toggle) return;

    setupMobileMenu(nav, toggle);
    setupScrolledHeader(header);
    setupActiveLink(nav);
  }

  window.FN = window.FN || {};
  window.FN.navigation = { init };
})();
