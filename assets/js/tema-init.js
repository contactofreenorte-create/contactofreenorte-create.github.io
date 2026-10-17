// Aplica el tema guardado antes de pintar la página, para que no parpadee (por defecto: oro)
try {
  var t = localStorage.getItem('fn-tema');
  if (t === 'azul' || t === 'oro') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}