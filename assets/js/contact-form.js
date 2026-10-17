/* ==========================================================================
   CONTACTO
   - Completa los enlaces de WhatsApp y correo con los datos de main.js
   - Botones de demostración y servicios preseleccionan la opción en el formulario
   - Valida el formulario y lo envía por WhatsApp o por correo
     (no hay backend todavía: se abre la app con el mensaje listo)
   ========================================================================== */

(function () {
  'use strict';

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_PATTERN = /^[+\d\s().-]{7,}$/;

  function whatsappUrl(number, text) {
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  }

  function setupChannelLinks(config) {
    document.querySelectorAll('[data-whatsapp-link]').forEach((link) => {
      link.href = whatsappUrl(config.whatsappNumber, config.whatsappGreeting);
      link.target = '_blank';
      link.rel = 'noopener';
    });
    document.querySelectorAll('[data-whatsapp-text]').forEach((el) => {
      el.textContent = config.whatsappDisplay;
    });
    document.querySelectorAll('[data-email-link]').forEach((link) => {
      link.href = `mailto:${config.email}`;
    });
    document.querySelectorAll('[data-email-text]').forEach((el) => {
      el.textContent = config.email;
    });
  }

  /* ---------- Errores de campos ---------- */
  function showError(input, message) {
    const field = input.closest('.field');
    field.classList.add('has-error');
    field.querySelector('.field__error').textContent = message;
    input.setAttribute('aria-invalid', 'true');
  }

  function clearError(input) {
    const field = input.closest('.field');
    field.classList.remove('has-error');
    input.removeAttribute('aria-invalid');
  }

  function validate(form) {
    const { nombre, telefono, correo, interes } = form.elements;
    let firstInvalid = null;

    const check = (input, isValid, message) => {
      if (isValid) {
        clearError(input);
      } else {
        showError(input, message);
        if (!firstInvalid) firstInvalid = input;
      }
    };

    const email = correo.value.trim();
    check(nombre, nombre.value.trim().length >= 2, 'Ingresa tu nombre.');
    check(telefono, PHONE_PATTERN.test(telefono.value.trim()), 'Ingresa un número de teléfono válido.');
    check(correo, email === '' || EMAIL_PATTERN.test(email), 'Ingresa un correo válido.');
    check(interes, interes.value !== '', 'Selecciona en qué podemos ayudarte.');

    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  /* ---------- Mensaje ---------- */
  function selectedLabel(select) {
    return select.value ? select.selectedOptions[0].textContent.trim() : '';
  }

  function buildMessage(form) {
    const { nombre, negocio, telefono, correo, rubro, interes, mensaje } = form.elements;
    const lines = [
      'Hola FREENORTE, quisiera más información.',
      '',
      `Nombre: ${nombre.value.trim()}`,
    ];

    if (negocio.value.trim()) lines.push(`Negocio: ${negocio.value.trim()}`);
    lines.push(`Teléfono: ${telefono.value.trim()}`);
    if (correo.value.trim()) lines.push(`Correo: ${correo.value.trim()}`);
    if (rubro.value) lines.push(`Tipo de negocio: ${selectedLabel(rubro)}`);
    lines.push(`Interés: ${selectedLabel(interes)}`);
    if (mensaje.value.trim()) lines.push('', mensaje.value.trim());

    return lines.join('\n');
  }

  function setStatus(statusEl, message, type) {
    statusEl.textContent = message;
    statusEl.className = `form__status is-${type}`;
  }

  /* ---------- Botones que preseleccionan el interés ----------
     data-demo            → "Demostración de GESTIONA POS"
     data-interest="web"  → la opción con ese value en el select #interes */
  function setupInterestButtons(form) {
    const interes = form.elements.interes;
    const field = interes.closest('.field');

    document.querySelectorAll('[data-demo], [data-interest]').forEach((button) => {
      button.addEventListener('click', () => {
        interes.value = button.dataset.interest || 'demo';
        clearError(interes);
        // Reinicia la animación de resaltado
        field.classList.remove('is-highlighted');
        void field.offsetWidth;
        field.classList.add('is-highlighted');
      });
    });
  }

  function init(config) {
    setupChannelLinks(config);

    const form = document.getElementById('contact-form');
    if (!form) return;

    const statusEl = form.querySelector('.form__status');
    setupInterestButtons(form);

    // Quita el error apenas el usuario corrige el campo
    form.addEventListener('input', (event) => {
      if (event.target.closest('.field.has-error')) clearError(event.target);
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!validate(form)) {
        setStatus(statusEl, 'Revisa los campos marcados.', 'error');
        return;
      }

      const channel = event.submitter && event.submitter.value === 'email' ? 'email' : 'whatsapp';
      const message = buildMessage(form);

      if (channel === 'whatsapp') {
        window.open(whatsappUrl(config.whatsappNumber, message), '_blank', 'noopener');
        setStatus(statusEl, 'Listo. Se abrió WhatsApp con tu mensaje; solo presiona enviar.', 'success');
      } else {
        const subject = `Consulta desde la web: ${selectedLabel(form.elements.interes)}`;
        window.location.href =
          `mailto:${config.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
        setStatus(statusEl, 'Listo. Se abrió tu aplicación de correo con el mensaje preparado.', 'success');
      }
    });
  }

  window.FN = window.FN || {};
  window.FN.contactForm = { init };
})();
