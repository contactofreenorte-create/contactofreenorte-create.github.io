/* ==========================================================================
   SISTEMAS — Filtros del catálogo, ventana de detalles y WhatsApp por sistema
   Para cambiar lo que dice cada sistema, edita SISTEMAS más abajo.
   ========================================================================== */

(function () {
  'use strict';

  const SISTEMAS = {
    gestiona: {
      nombre: 'GESTIONA POS',
      rubro: 'Tiendas de ropa, calzado y accesorios',
      acento: 'var(--color-primary)',
      imagen: null,
      demo: null,
      video: 'assets/videos/gestiona.mp4',
      poster: 'assets/videos/gestiona.jpg',
      resumen: 'Nuestro sistema más completo para tiendas con tallas y colores. Ya funciona en negocios reales, con escáner desde el celular y datos en la nube.',
      modulos: [
        ['Punto de venta', 'Busca por código, nombre o talla y cobra con cualquier medio de pago.'],
        ['Inventario por talla y color', 'Stock al día, mínimos, alertas y kardex de movimientos.'],
        ['Escáner con celular', 'Conecta el celular con un código y úsalo como lector.'],
        ['Compras y proveedores', 'Ingreso de mercadería con documento y costo.'],
        ['Cierre de caja', 'Apertura, ingresos, retiros, arqueo e historial.'],
        ['Reportes y metas', 'Ventas, ganancia, margen, meta diaria y exportación.'],
        ['Usuarios y roles', 'Administradores y vendedores con sus permisos.'],
        ['Nube y respaldos', 'Varios equipos con los mismos datos y copias de seguridad.'],
        ['Dashboard', 'Ventas del día, ticket promedio y avance de la meta.']
      ]
    },
    farmacia: {
      nombre: 'FarmaPOS',
      rubro: 'Farmacias y droguerías',
      acento: '#3b82f6',
      imagen: 'assets/img/sistemas/farmacia.png',
      demo: null,
      video: 'assets/videos/farmacia.mp4',
      poster: 'assets/videos/farmacia.jpg',
      resumen: 'Venta de medicamentos por caja, blíster o unidad, con control de lotes y vencimientos, recetas y libro de recetas.',
      modulos: [
        ['Venta por caja, blíster o unidad', 'El stock se descuenta en unidades exactas.'],
        ['Lotes y vencimientos', 'Sale primero lo que vence antes; alertas a 30 y 90 días.'],
        ['Recetas', 'Venta directa, receta simple, retenida y receta cheque.'],
        ['Libro de recetas', 'Médico, paciente y RUT registrados automáticamente.'],
        ['Principio activo', 'Busca alternativas y bioequivalentes en segundos.'],
        ['Inventario', 'Ingreso por lote, stock bajo y pedido sugerido.'],
        ['Caja con arqueo', 'Apertura, ingresos, retiros y cierre por billetes.'],
        ['Reportes', 'Ventas, ganancia, lo más vendido y por vendedor.'],
        ['Celular y cámara', 'Instalable, lector de códigos y fotos de productos.']
      ]
    },
    optica: {
      nombre: 'VisiónPOS',
      rubro: 'Ópticas',
      acento: '#14b8a6',
      imagen: 'assets/img/sistemas/optica.png',
      demo: null,
      video: 'assets/videos/optica.mp4',
      poster: 'assets/videos/optica.jpg',
      resumen: 'Órdenes de trabajo con receta, abono y saldo, desde el encargo hasta la entrega, con aviso por WhatsApp cuando los lentes están listos.',
      modulos: [
        ['Órdenes de trabajo', 'Recibida, laboratorio, taller, lista y entregada.'],
        ['Recetas ópticas', 'Esfera, cilindro, eje, adición, DP y altura de cada ojo.'],
        ['Abonos y saldos', 'Cobra un abono al encargar y el saldo al entregar.'],
        ['Aviso por WhatsApp', 'Avisa al cliente cuando sus lentes están listos.'],
        ['Hoja para laboratorio', 'Graduación y armazón impresos, sin precios.'],
        ['Clientes', 'Historial de recetas, control anual y cumpleaños.'],
        ['Catálogo', 'Armazones, cristales, lentes de contacto, sol y servicios.'],
        ['Caja y ventas', 'Venta de mostrador, caja con arqueo y reportes.'],
        ['Celular y cámara', 'Fotos de la receta y lector de códigos.']
      ]
    },
    mineria: {
      nombre: 'FaenaPro',
      rubro: 'Minería y contratistas',
      acento: '#f59e0b',
      imagen: 'assets/img/sistemas/mineria.png',
      demo: null,
      video: 'assets/videos/mineria.mp4',
      poster: 'assets/videos/mineria.jpg',
      resumen: 'Gestión de la faena en un solo lugar: producción, equipos, mantención, combustible, bodega, personal y seguridad. Cada empresa activa solo lo que usa.',
      modulos: [
        ['Producción', 'Toneladas por turno contra la meta, leyes y despachos.'],
        ['Combustible', 'Cargas por equipo, estanques y litros por hora.'],
        ['Equipos', 'Horómetro, estado y documentos con vencimiento.'],
        ['Mantención', 'Preventivas por horas, fallas, repuestos y costos.'],
        ['Bodega y pañol', 'Vales de salida, préstamo de herramientas y EPP.'],
        ['Personal y turnos', '7x7, 4x3 y otros; quién está en faena y documentos.'],
        ['Seguridad', 'Días sin accidentes, incidentes, charlas y entrega de EPP.'],
        ['Compras', 'Solicitudes, órdenes de compra con IVA y recepción.'],
        ['Varias faenas y roles', 'Administrador, supervisor, bodeguero y operador.']
      ]
    },
    articulos: {
      nombre: 'VentaFácil',
      rubro: 'Bazares, minimarkets, librerías y ferreterías',
      acento: '#6366f1',
      imagen: 'assets/img/sistemas/articulos.png',
      demo: 'demos/articulos/index.html',
      video: 'assets/videos/articulos.mp4',
      poster: 'assets/videos/articulos.jpg',
      resumen: 'Un punto de venta simple para vender rápido, saber qué tienes y cuadrar la caja. Se aprende a usar en minutos.',
      modulos: [
        ['Venta rápida', 'Busca o escanea, descuento y cobro con vuelto.'],
        ['Monto libre', 'Vende lo que no tiene código escribiendo el precio.'],
        ['Por kilo, litro o metro', 'Cantidades con decimales y su stock exacto.'],
        ['Productos', 'Categorías, precio, costo, ganancia y foto.'],
        ['Importar desde Excel', 'Carga todo tu catálogo de una vez.'],
        ['Inventario', 'Ingreso de mercadería y productos por agotarse.'],
        ['Caja', 'Apertura, ingresos, retiros y cierre por billetes.'],
        ['Reportes', 'Ventas, ganancia, categorías y vendedores.'],
        ['Celular y cámara', 'Instalable y con lector de códigos.']
      ]
    },
    perfumeria: {
      nombre: 'POS Perfumería',
      rubro: 'Perfumerías y tiendas de fragancias',
      acento: '#d4a857',
      imagen: 'assets/img/sistemas/perfumeria.png',
      demo: null,
      video: 'assets/videos/perfumeria.mp4',
      poster: 'assets/videos/perfumeria.jpg',
      resumen: 'Elegante y pensado para perfumes: catálogo con foto, venta de decants, caja con arqueo y temas noche y oro o blanco y rosa.',
      modulos: [
        ['Catálogo de perfumes', 'Marca, tipo (EDP, EDT…), ml, género y familia olfativa.'],
        ['Decants', 'Vende 5 o 10 ml y descuenta del frasco.'],
        ['Venta con fotos', 'Busca rápido y vende también desde el celular.'],
        ['Caja completa', 'Arqueo por billetes, tarjetas y fondo para mañana.'],
        ['Ventas', 'Reimprimir, enviar por WhatsApp y anular con motivo.'],
        ['Reportes', 'Por marca, género, medio de pago y vendedor.'],
        ['Vendedores', 'Ven solo la venta y anulan solo lo del día.'],
        ['Dos temas', 'Noche y oro o blanco y rosa.'],
        ['Respaldos', 'Copias de seguridad y recuperación de acceso.']
      ]
    }
  };

  let config = {};

  function whatsappUrl(texto) {
    return `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(texto)}`;
  }

  function esc(texto) {
    return String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- Filtros por rubro ---------- */
  function setupFiltros() {

    const filtros = document.querySelector('[data-filtros-sistemas]');

    if (!filtros) return;

    filtros.addEventListener('click', (e) => {

      const boton = e.target.closest('button[data-filtro]');

      if (!boton) return;

      filtros.querySelectorAll('button').forEach(b => b.classList.toggle('is-active', b === boton));

      const filtro = boton.dataset.filtro;

      document.querySelectorAll('.sistema-card[data-grupo]').forEach((card) => {
        card.hidden = filtro !== 'todos' && !card.dataset.grupo.split(' ').includes(filtro);
      });
    });
  }

  /* ---------- Ventana de detalles ---------- */
  function medio(s, conVideo) {
    if (s.video) {
      return `<div class="modal-sistema__media modal-sistema__media--video">
        <video src="${s.video}" poster="${s.poster || ''}" controls playsinline preload="${conVideo ? 'auto' : 'none'}" ${conVideo ? 'autoplay' : ''}></video>
      </div>`;
    }
    return s.imagen ? `<div class="modal-sistema__media"><img src="${s.imagen}" alt="Pantalla de ${esc(s.nombre)}"></div>` : '';
  }

  function abrirDetalle(id, conVideo = false) {

    const s = SISTEMAS[id];
    const modal = document.getElementById('modal-sistema');

    if (!s || !modal) return;

    const mensaje = `Hola FREENORTE, me interesa ${s.nombre} para mi negocio. ¿Me pueden dar más información?`;

    modal.style.setProperty('--accent', s.acento);

    modal.querySelector('[data-modal-contenido]').innerHTML = `
      ${medio(s, conVideo)}
      <div class="modal-sistema__body">
        <p class="eyebrow">${esc(s.rubro)}</p>
        <h2>${esc(s.nombre)}</h2>
        <p class="modal-sistema__lead">${esc(s.resumen)}</p>
        <ul class="modal-sistema__modulos">
          ${s.modulos.map(([t, d]) => `<li><strong>${esc(t)}</strong><span>${esc(d)}</span></li>`).join('')}
        </ul>
        <div class="modal-sistema__acciones">
          ${s.demo ? `<a class="btn btn--primary" href="${s.demo}" target="_blank" rel="noopener">Probar gratis<svg class="icon btn__arrow" aria-hidden="true"><use href="#i-arrow"/></svg></a>` : ''}
          <a class="btn btn--whatsapp" href="${whatsappUrl(mensaje)}" target="_blank" rel="noopener"><svg class="icon" aria-hidden="true"><use href="#i-chat"/></svg>Cotizar por WhatsApp</a>
          <a class="btn btn--ghost" href="#contacto" data-cerrar-modal data-interest="demo-${id}">Solicitar demostración</a>
        </div>
      </div>
    `;

    modal.showModal();
    document.body.classList.add('modal-abierto');
    modal.scrollTop = 0;

    const video = modal.querySelector('video');
    if (video && conVideo) video.play().catch(() => {});
  }

  function setupModal() {

    const modal = document.getElementById('modal-sistema');

    if (!modal) return;

    document.addEventListener('click', (e) => {
      const boton = e.target.closest('[data-detalle], [data-video]');
      if (boton) {
        e.preventDefault();
        if (boton.dataset.video) abrirDetalle(boton.dataset.video, true);
        else abrirDetalle(boton.dataset.detalle);
      }
    });

    // Al cerrar se detiene el video
    modal.addEventListener('close', () => {
      document.body.classList.remove('modal-abierto');
      modal.querySelectorAll('video').forEach(v => v.pause());
    });

    modal.addEventListener('click', (e) => {

      // Clic fuera del contenido: cerrar
      if (e.target === modal) modal.close();

      if (e.target.closest('[data-cerrar-modal]')) {

        const interes = e.target.closest('[data-interest]');
        modal.close();

        // Deja elegida la opción en el formulario de contacto
        const select = document.getElementById('interes');
        if (interes && select && select.querySelector(`option[value="${interes.dataset.interest}"]`)) {
          select.value = interes.dataset.interest;
        }
      }
    });
  }

  /* ---------- Botones "Cotizar" de cada tarjeta ---------- */
  function setupWhatsappSistemas() {
    document.querySelectorAll('[data-whatsapp-sistema]').forEach((a) => {
      const s = SISTEMAS[a.dataset.whatsappSistema];
      if (!s) return;
      a.href = whatsappUrl(`Hola FREENORTE, me interesa ${s.nombre} para mi negocio. ¿Me pueden dar más información?`);
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  function init(cfg) {
    config = cfg || {};
    setupFiltros();
    setupModal();
    setupWhatsappSistemas();
  }

  window.FN = window.FN || {};
  window.FN.sistemas = { init };
})();
