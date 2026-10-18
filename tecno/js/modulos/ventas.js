// ==========================================
// TECNOPOS — VENTAS
// Historial, detalle, reimpresión y anulación
// ==========================================

"use strict";

const Ventas = {

    desde: null,
    hasta: null,
    texto: "",
    metodo: "",


    render(vista) {

        if (!this.desde) {
            this.desde = hoyISO();
            this.hasta = hoyISO();
        }

        const esAdmin = Sesion.esAdmin();

        vista.innerHTML = `
            <div class="kpis" id="vtKpis"></div>
            <div class="tarjeta">
                <div class="barra-herramientas">
                    <div class="buscar">
                        ${icono("buscar")}
                        <input id="vtBuscar" placeholder="Buscar por N°, producto o cliente" value="${esc(this.texto)}">
                    </div>
                    <input type="date" id="vtDesde" value="${this.desde}" aria-label="Desde">
                    <input type="date" id="vtHasta" value="${this.hasta}" aria-label="Hasta">
                    <select id="vtMetodo" aria-label="Forma de pago">
                        <option value="">Todas las formas de pago</option>
                        ${Object.entries(METODOS_PAGO).map(([k, m]) => `<option value="${k}" ${k === this.metodo ? "selected" : ""}>${m.texto}</option>`).join("")}
                    </select>
                    ${esAdmin ? `<button class="btn" id="vtExportar">${icono("descargar")} Exportar</button>` : ""}
                </div>
                <div id="vtTabla"></div>
            </div>
            ${!esAdmin ? '<p class="chico texto-3" style="margin-top:10px">Usted ve solo sus ventas y puede anular las del día.</p>' : ""}
        `;

        const filtrar = () => {
            this.texto = $("#vtBuscar").value;
            this.desde = $("#vtDesde").value || hoyISO();
            this.hasta = $("#vtHasta").value || this.desde;
            this.metodo = $("#vtMetodo").value;
            this.pintar();
        };

        $("#vtBuscar").addEventListener("input", filtrar);
        $("#vtDesde").addEventListener("change", filtrar);
        $("#vtHasta").addEventListener("change", filtrar);
        $("#vtMetodo").addEventListener("change", filtrar);

        if (esAdmin) $("#vtExportar").addEventListener("click", () => this.exportar());

        $("#vtTabla").addEventListener("click", evento => {
            const boton = evento.target.closest("[data-accion]");
            if (!boton) return;
            const venta = Datos.ventas().find(v => v.id === boton.dataset.id);
            if (!venta) return;
            if (boton.dataset.accion === "ver") this.verDetalle(venta);
            if (boton.dataset.accion === "imprimir") Impresion.boleta(venta);
            if (boton.dataset.accion === "anular") this.anular(venta);
        });

        this.pintar();
    },


    filtradas() {

        const usuario = Sesion.usuario();
        const palabras = normalizar(this.texto).split(/\s+/).filter(Boolean);
        const desde = this.desde <= this.hasta ? this.desde : this.hasta;
        const hasta = this.desde <= this.hasta ? this.hasta : this.desde;

        return Datos.ventas().filter(v => {
            const dia = fechaISO(new Date(v.fecha));
            if (dia < desde || dia > hasta) return false;
            if (usuario.rol !== "admin" && v.usuarioId !== usuario.id) return false;
            if (this.metodo && v.metodo !== this.metodo) return false;
            if (palabras.length) {
                const pajar = normalizar(String(v.numero) + " " + (v.clienteNombre || "") + " " + v.items.map(i => i.nombre).join(" "));
                if (!palabras.every(p => pajar.includes(p))) return false;
            }
            return true;
        });
    },


    puedeAnular(venta) {

        const usuario = Sesion.usuario();

        if (venta.estado === "anulada") return false;
        if (usuario.rol === "admin") return true;

        return venta.usuarioId === usuario.id && fechaISO(new Date(venta.fecha)) === hoyISO();
    },


    pintar() {

        const lista = this.filtradas();
        const validas = lista.filter(v => v.estado !== "anulada");
        const total = validas.reduce((s, v) => s + v.total, 0);

        $("#vtKpis").innerHTML = `
            <div class="kpi"><div class="kpi-icono verde">${icono("tendencia")}</div>
                <div><div class="etiqueta">Total vendido</div><div class="valor">${dinero(total)}</div><div class="detalle">${plural(validas.length, "venta", "ventas")}</div></div></div>
            <div class="kpi"><div class="kpi-icono">${icono("boleta")}</div>
                <div><div class="etiqueta">Venta promedio</div><div class="valor">${dinero(validas.length ? total / validas.length : 0)}</div></div></div>
            <div class="kpi"><div class="kpi-icono rojo">${icono("prohibido")}</div>
                <div><div class="etiqueta">Anuladas</div><div class="valor">${numero(lista.length - validas.length)}</div></div></div>
        `;

        if (!lista.length) {
            $("#vtTabla").innerHTML = vacioHTML("boleta", "No hay ventas en este período", "Cambie las fechas o la búsqueda.");
            return;
        }

        const mostrar = lista.slice(0, 300);

        $("#vtTabla").innerHTML = `
            <div class="tabla-contenedor">
                <table class="tabla">
                    <thead><tr><th>N°</th><th>Fecha</th><th>Productos</th><th>Vendedor</th><th>Pago</th><th class="num">Total</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                        ${mostrar.map(v => {
                            const resumen = v.items.map(i => i.nombre + (i.cantidad > 1 ? " x" + i.cantidad : "")).join(", ");
                            return `
                                <tr class="${v.estado === "anulada" ? "anulada" : ""}">
                                    <td class="negrita">${String(v.numero).padStart(6, "0")}</td>
                                    <td class="nowrap">${fechaHora(v.fecha)}</td>
                                    <td style="max-width:300px"><div class="tachado" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(resumen)}">${esc(resumen)}</div></td>
                                    <td>${esc(v.usuarioNombre)}</td>
                                    <td>${esc((METODOS_PAGO[v.metodo] || {}).texto || v.metodo)}</td>
                                    <td class="num negrita"><span class="tachado">${dinero(v.total)}</span></td>
                                    <td>${v.estado === "anulada" ? '<span class="badge b-peligro">Anulada</span>' : '<span class="badge b-ok">Válida</span>'}</td>
                                    <td class="acciones">
                                        <button class="btn btn-chico" data-accion="ver" data-id="${v.id}">${icono("ojo")} Ver</button>
                                        <button class="btn btn-chico btn-icono" data-accion="imprimir" data-id="${v.id}" title="Imprimir" aria-label="Imprimir">${icono("impresora")}</button>
                                        ${this.puedeAnular(v) ? `<button class="btn btn-chico btn-peligro" data-accion="anular" data-id="${v.id}">Anular</button>` : ""}
                                    </td>
                                </tr>`;
                        }).join("")}
                    </tbody>
                </table>
            </div>
            <div class="pie-tabla">
                <span>${lista.length > mostrar.length ? `Mostrando ${mostrar.length} de ${lista.length}. Acote las fechas para ver más.` : plural(lista.length, "venta", "ventas")}</span>
                <span>Total válido: <strong>${dinero(total)}</strong></span>
            </div>
        `;
    },


    verDetalle(venta) {

        abrirModal({
            titulo: "Venta N° " + String(venta.numero).padStart(6, "0"),
            clase: "ancho",
            html: `
                <div class="ficha-datos">
                    <div><div class="etiqueta">Fecha</div><div class="dato">${fechaHora(venta.fecha)}</div></div>
                    <div><div class="etiqueta">Vendedor</div><div class="dato">${esc(venta.usuarioNombre)}</div></div>
                </div>
                ${venta.estado === "anulada" ? `<div class="mensaje-error" style="margin-bottom:14px">Anulada el ${fechaHora(venta.anulacion.fecha)} por ${esc(venta.anulacion.usuario)}. Motivo: ${esc(venta.anulacion.motivo)}</div>` : ""}
                <div class="tarjeta">
                    <table class="tabla">
                        <thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th></tr></thead>
                        <tbody>
                            ${venta.items.map(i => `<tr><td class="celda-titulo">${esc(i.nombre)}</td><td class="num">${i.cantidad}</td><td class="num">${dinero(i.precio)}</td><td class="num negrita">${dinero(i.subtotal)}</td></tr>`).join("")}
                        </tbody>
                    </table>
                </div>
                <div style="max-width:300px;margin:14px 0 0 auto">
                    ${venta.descuento ? `<div class="linea-total"><span>Subtotal</span><span>${dinero(venta.subtotal)}</span></div><div class="linea-total"><span>Descuento</span><span class="rojo">-${dinero(venta.descuento)}</span></div>` : ""}
                    ${venta.descuento ? "" : `<div class="linea-total"><span>Neto</span><span>${dinero(venta.total - ivaDe(venta))}</span></div>`}<div class="linea-total"><span>IVA (19%)</span><span>${dinero(ivaDe(venta))}</span></div>
                    <div class="linea-total" style="font-size:18px;font-weight:700;color:var(--texto)"><span>Total</span><span>${dinero(venta.total)}</span></div>
                    <div class="linea-total"><span>${esc((METODOS_PAGO[venta.metodo] || {}).texto || "")}</span><span>${dinero(venta.metodo === "efectivo" ? venta.recibido : venta.total)}</span></div>
                    ${venta.metodo === "efectivo" ? `<div class="linea-total"><span>Vuelto</span><span>${dinero(venta.vuelto)}</span></div>` : ""}
                </div>
            `,
            botones: [
                ...(this.puedeAnular(venta) ? [{ texto: "Anular venta", clase: "btn-peligro", accion: cerrar => { cerrar(); this.anular(venta); } }] : []),
                { texto: "Compartir", icono: "compartir", accion: () => compartirVenta(venta) },
                { texto: "Imprimir", icono: "impresora", accion: () => Impresion.boleta(venta) },
                { texto: "Cerrar", clase: "btn-primario" }
            ]
        });
    },


    async anular(venta) {

        if (!this.puedeAnular(venta)) {
            avisar("No tiene permiso para anular esta venta.", "error");
            return;
        }

        if (venta.ordenId) {
            avisar("Esta venta viene de una orden entregada. No se puede anular desde aquí.", "error");
            return;
        }

        const motivo = await pedirTexto({
            titulo: "Anular venta N° " + String(venta.numero).padStart(6, "0"),
            mensaje: `Se anulará la venta por <strong>${dinero(venta.total)}</strong> y los productos volverán al stock.`,
            etiqueta: "Motivo de la anulación",
            opciones: ["Error al registrar", "Cliente se arrepintió", "Cambio de producto", "Error en el cobro", "Otro"],
            textoSi: "Anular venta",
            peligro: true
        });

        if (!motivo) return;

        const ventas = Datos.ventas();
        const registro = ventas.find(v => v.id === venta.id);

        if (!registro || registro.estado === "anulada") return;

        const productos = Datos.productos();

        registro.items.forEach(i => devolverStock(productos, i.productoId, i.cantidad));

        registro.estado = "anulada";
        registro.anulacion = { motivo, fecha: new Date().toISOString(), usuario: Sesion.nombre() };

        if (!Datos.guardarVentas(ventas)) return;

        Datos.guardarProductos(productos);

        avisar("Venta anulada. Los productos volvieron al stock.");

        this.pintar();
    },


    exportar() {

        const filas = [["N°", "Fecha", "Hora", "Vendedor", "Cliente", "Producto", "Categoría", "Cantidad", "Precio", "Subtotal", "Descuento venta", "IVA venta", "Total venta", "Pago", "Estado"]];

        this.filtradas().forEach(v => v.items.forEach(i => filas.push([
            v.numero, fechaCorta(v.fecha), hora(v.fecha), v.usuarioNombre, v.clienteNombre || "",
            i.nombre, i.categoria || "", String(i.cantidad).replace(".", ","), i.precio, i.subtotal,
            v.descuento, v.iva || 0, v.total, (METODOS_PAGO[v.metodo] || {}).texto || v.metodo, v.estado === "anulada" ? "Anulada" : "Válida"
        ])));

        descargarArchivo(`ventas-${this.desde}-a-${this.hasta}.csv`, aCSV(filas), "text/csv");
    }
};


Modulos.ventas = {
    titulo: "Ventas",
    icono: "boleta",
    roles: ["admin", "vendedor"],
    render: vista => Ventas.render(vista)
};
