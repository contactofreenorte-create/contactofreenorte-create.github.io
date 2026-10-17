/* ==========================================================================
   MAIN — Configuración general y arranque del sitio
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     DATOS DE CONTACTO — Cambia estos valores por los reales.
     Se usan en todos los botones y enlaces de WhatsApp y correo del sitio.
     ------------------------------------------------------------------------ */
  const CONFIG = {
    // Código de país + número, sin "+", espacios ni guiones. Ej: 56912345678
    whatsappNumber: '56949424720',
    // Cómo se muestra el número en la página
    whatsappDisplay: '+56 9 4942 4720',
    // Mensaje inicial al abrir WhatsApp desde los botones
    whatsappGreeting: 'Hola FREENORTE, quisiera más información.',
    email: 'contacto.freenorte@gmail.com',
  };

  function setCurrentYear() {
    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  }

  // Si una imagen con data-fallback no existe, se quita y queda visible el ícono de respaldo
  function setupImageFallbacks() {
    document.querySelectorAll('img[data-fallback]').forEach((img) => {
      if (img.complete && img.naturalWidth === 0) img.remove();
      else img.addEventListener('error', () => img.remove());
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.FN.navigation.init();
    window.FN.animations.init();
    window.FN.contactForm.init(CONFIG);
    window.FN.sistemas.init(CONFIG);
    setupImageFallbacks();
    setCurrentYear();
  });
})();
