// ==========================================
// SPORTPOS — POSVENTA
// Cambios de talla o producto, devoluciones y
// garantías, siempre ligados a una venta
// ==========================================

"use strict";

const TIPOS_POSVENTA = {
    cambio:     { texto: "Cambio",     clase: "b-azul",    detalle: "Otra talla, color o producto" },
    devolucion: { texto: "Devolución", clase: "b-aviso",   detalle: "Se devuelve el dinero" },
    garantia:   { texto: "Garantía",   clase: "b-peligro", detalle: "Falla de fábrica o desgaste anormal" }
};

const MOTIVOS_POSVENTA = {
    cambio:     ["Talla muy grande", "Talla muy chica", "No le gustó el color", "Se equivocó de modelo", "Otro"],
    devolucion: ["No le gustó", "No le quedó y no hay talla", "Regalo repetido", "Otro"],
    garantia:   ["Suela despegada", "Costura abierta", "Falla de fábrica", "Cierre o elástico roto", "Desgaste anormal", "Otro"]
};

const RESOLUCIONES = {
    cambio:    "Cambio por otro producto",
    reembolso: "Devolver el dinero",
    reparacion: "Enviar a reparación (sin movimiento de dinero)",
    rechazada: "No procede (se rechaza)"
};


// Lo que se puede devolver todavía de una venta (descuenta lo ya devuelto en otros casos)
function disponiblesVenta(venta) {

    const usado = {};

    Datos.posventa()
        .filter(c => c.ventaId === venta.id && c.estado !== "anulado" && (c.resolucion === "cambio" || c.resolucion === "reembolso"))
        .forEach(c => c.devueltos.forEach(d => { usado[d.productoId] = (usado[d.productoId] || 0) + d.cantidad; }));

    const factor = venta.subtotal ? venta.total / venta.subtotal : 1;

    return venta.items
        .filter(i => i.productoId)
        .map(i => ({
            productoId: i.productoId,
            nombre: i.nombre,
            vendido: i.cantidad,
            disponible: Math.max(0, i.cantidad - (usado[i.productoId] || 0)),
            valor: Math.round(i.subtotal / i.cantidad * factor),
            costo: Math.round((i.costo || 0) / i.cantidad)
        }));
}


// Suma el efecto de la posventa en un período (para inicio y reportes)
function posventaEntre(desde, hasta, usuarioId) {

    const r = { diferencia: 0, costo: 0, iva: 0, casos: 0 };

    Datos.posventa().forEach(c => {
        if (c.estado === "anulado") return;
        const d = fechaISO(new Date(c.fecha));
        if (d < desde || d > hasta) return;
        if (usuarioId && c.usuarioId !== usuarioId) return;
        r.diferencia += c.diferencia || 0;
        r.costo += c.costoNeto || 0;
        r.iva += c.diferencia ? Math.round(c.diferencia - c.diferencia / 1.19) : 0;
        r.casos++;
    });

    return r;
}


const Posventa = {

    tipo: "",
    texto: "",
    ventaInicial: null,


    render(vista) {

        const mes = hoyISO().slice(0, 7);
        const delMes = Datos.posventa().filter(c => c.estado !== "anulado" && fechaISO(new Date(c.fecha)).slice(0, 7) === mes);
        const devuelto = delMes.reduce((s, c) => s + (c.diferencia < 0 ? -c.diferencia : 0), 0);
        const pendientes = Datos.posventa().filter(c => c.estado === "en_reparacion").length;

        vista.innerHTML = `
            <div class="cabecera-vista">
                <div>
                    <h1>Posventa</h1>
                    <p class="sub">Cambios de talla, devoluciones y garantías. Plazo de cambio: ${DIAS_CAMBIO} días · Garantía: ${MESES_GARANTIA} meses.</p>
                </div>
                <button class="btn btn-primario btn-grande" id="pvNuevo">${icono("mas")} Nuevo caso</button>
            </div>

            <div class="kpis">
                <div class="kpi"><div class="kpi-icono">${icono("cambio")}</div>
                    <div><div class="etiqueta">Casos del mes</div><div class="valor">${delMes.length}</div><div class="detalle">${delMes.filter(c => c.tipo === "cambio").length} cambios · ${delMes.filter(c => c.tipo === "devolucion").length} devoluciones · ${delMes.filter(c => c.tipo === "garantia").length} garantías</div></div></div>
                <div class="kpi"><div class="kpi-icono rojo">${icono("dinero")}</div>
                    <div><div class="etiqueta">Dinero devuelto en el mes</div><div class="valor">${dinero(devuelto)}</div></div></div>
                <div class="kpi"><div class="kpi-icono ${pendientes ? "amarillo" : "verde"}">${icono("alerta")}</div>
                    <div><div class="etiqueta">En reparación</div><div class="valor">${pendientes}</div><div class="detalle">Garantías esperando respuesta</div></div></div>
            </div>

            <div class="tarjeta">
                <div class="barra-herramientas">
                    <div class="buscar" style="flex:1;position:relative;min-width:200px">${icono("buscar")}<input id="pvBuscar" placeholder="Buscar por N° de caso, de venta o producto" value="${esc(this.texto)}"></div>
                    <select id="pvTipo" aria-label="Tipo" style="width:auto">
                        <option value="">Todos</option>
                        ${Object.entries(TIPOS_POSVENTA).map(([k, t]) => `<option value="${k}" ${this.tipo === k ? "selected" : ""}>${t.texto}</option>`).join("")}
                    </select>
                </div>
                <div id="pvTabla"></div>
            </div>
        `;

        $("#pvNuevo").addEventListener("click", () => this.nuevo());
        $("#pvBuscar").addEventListener("input", e => { this.texto = e.target.value; this.pintar(); });
        $("#pvTipo").addEventListener("change", e => { this.tipo = e.target.value; this.pintar(); });

        $("#pvTabla").addEventListener("click", e => {
            const b = e.target.closest("[data-accion]");
            if (!b) return;
            const caso = Datos.posventa().find(c => c.id === b.dataset.id);
            if (!caso) return;
            if (b.dataset.accion === "ver") this.ver(caso);
            if (b.dataset.accion === "imprimir") Impresion.posventa(caso);
            if (b.dataset.accion === "anular") this.anular(caso);
        });

        this.pintar();

        if (this.ventaInicial) {
            const venta = Datos.ventas().find(v => v.id === this.ventaInicial);
            this.ventaInicial = null;
            if (venta) this.nuevo(venta);
        }
    },


    pintar() {

        const palabras = normalizar(this.texto).split(/\s+/).filter(Boolean);
        const esAdmin = Sesion.esAdmin();
        const usuario = Sesion.usuario();

        const lista = Datos.posventa().filter(c => {
            if (!esAdmin && c.usuarioId !== usuario.id) return false;
            if (this.tipo && c.tipo !== this.tipo) return false;
            const base = normalizar([c.numero, c.ventaNumero, c.devueltos.map(d => d.nombre).join(" "), c.entregados.map(d => d.nombre).join(" ")].join(" "));
            return palabras.every(p => base.includes(p));
        });

        if (!lista.length) {
            $("#pvTabla").innerHTML = vacioHTML("cambio", Datos.posventa().length ? "Sin resultados" : "Aún no hay casos de posventa", "Registre un cambio, una devolución o una garantía con el botón «Nuevo caso».");
            return;
        }

        $("#pvTabla").innerHTML = `
            <div class="tabla-contenedor">
                <table class="tabla">
                    <thead><tr><th>N°</th><th>Fecha</th><th>Tipo</th><th>Venta</th><th>Producto</th><th>Resultado</th><th class="num">Dinero</th><th></th></tr></thead>
                    <tbody>${lista.slice(0, 300).map(c => {
                        const t = TIPOS_POSVENTA[c.tipo];
                        const resumen = c.devueltos.map(d => d.nombre + (d.cantidad > 1 ? " x" + d.cantidad : "")).join(", ");
                        return `
                            <tr class="${c.estado === "anulado" ? "anulada" : ""}">
                                <td class="negrita">${String(c.numero).padStart(4, "0")}</td>
                                <td class="nowrap">${fechaHora(c.fecha)}</td>
                                <td><span class="badge ${t.clase}">${t.texto}</span></td>
                                <td>${String(c.ventaNumero).padStart(6, "0")}</td>
                                <td style="max-width:260px"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(resumen)}">${esc(resumen)}</div></td>
                                <td>${c.estado === "anulado" ? '<span class="badge b-peligro">Anulado</span>' : esc(this.textoResultado(c))}</td>
                                <td class="num negrita ${c.diferencia < 0 ? "rojo" : ""}">${c.diferencia ? (c.diferencia > 0 ? "+" : "−") + dinero(Math.abs(c.diferencia)) : "—"}</td>
                                <td class="acciones">
                                    <button class="btn btn-chico" data-accion="ver" data-id="${c.id}">${icono("ojo")} Ver</button>
                                    <button class="btn btn-chico btn-icono" data-accion="imprimir" data-id="${c.id}" title="Imprimir" aria-label="Imprimir">${icono("impresora")}</button>
                                </td>
                            </tr>`;
                    }).join("")}</tbody>
                </table>
            </div>
            <div class="pie-tabla"><span>${plural(lista.length, "caso", "casos")}</span></div>
        `;
    },


    textoResultado(c) {
        if (c.resolucion === "cambio") return "Cambiado por " + c.entregados.map(e => e.nombre).join(", ");
        if (c.resolucion === "reembolso") return "Dinero devuelto";
        if (c.resolucion === "reparacion") return c.estado === "en_reparacion" ? "En reparación" : "Reparado";
        return "No procede";
    },


    // ------------------------------------------
    // NUEVO CASO
    // ------------------------------------------

    nuevo(ventaPrevia = null) {

        if (!Datos.ventas().length) {
            avisar("Aún no hay ventas. Haga una venta primero: el cambio siempre se liga a una venta.", "error");
            return;
        }

        const e = { venta: ventaPrevia, tipo: "cambio", cant: {}, motivo: "", nota: "", falla: false, resolucion: "cambio", entregados: [], metodo: "efectivo", fuera: false, busca: "" };
        const esAdmin = Sesion.esAdmin();

        const dias = () => Math.floor((Date.now() - new Date(e.venta.fecha).getTime()) / 86400000);
        const plazo = () => e.tipo === "garantia" ? Math.round(MESES_GARANTIA * 30.5) : DIAS_CAMBIO;

        const calculo = () => {
            const disp = disponiblesVenta(e.venta);
            const devueltos = disp.filter(d => (e.cant[d.productoId] || 0) > 0).map(d => ({
                productoId: d.productoId, nombre: d.nombre, cantidad: e.cant[d.productoId], valor: d.valor, costo: d.costo,
                estado: e.tipo === "garantia" || e.falla ? "falla" : "bueno"
            }));
            const valorDevuelto = devueltos.reduce((s, d) => s + d.valor * d.cantidad, 0);
            const resolucion = e.tipo === "cambio" ? "cambio" : e.tipo === "devolucion" ? "reembolso" : e.resolucion;
            const entregados = resolucion === "cambio" ? e.entregados : [];
            const valorEntregado = entregados.reduce((s, x) => s + x.precio * x.cantidad, 0);
            let diferencia = 0;
            let costoNeto = 0;
            if (resolucion === "cambio") {
                diferencia = valorEntregado - valorDevuelto;
                costoNeto = entregados.reduce((s, x) => s + x.costo * x.cantidad, 0) - devueltos.filter(d => d.estado === "bueno").reduce((s, d) => s + d.costo * d.cantidad, 0);
            } else if (resolucion === "reembolso") {
                diferencia = -valorDevuelto;
                costoNeto = -devueltos.filter(d => d.estado === "bueno").reduce((s, d) => s + d.costo * d.cantidad, 0);
            }
            return { disp, devueltos, valorDevuelto, resolucion, entregados, valorEntregado, diferencia, costoNeto };
        };

        const pintarVentas = raiz => {
            const palabras = normalizar(e.busca).split(/\s+/).filter(Boolean);
            const lista = Datos.ventas()
                .filter(v => v.estado !== "anulada")
                .filter(v => !palabras.length || palabras.every(p => normalizar(String(v.numero).padStart(6, "0") + " " + v.numero + " " + v.items.map(i => i.nombre).join(" ")).includes(p)))
                .slice(0, 15);
            $("#pvVentas", raiz).innerHTML = lista.length ? `<div class="lista-busqueda">${lista.map(v => `
                <button type="button" data-venta="${v.id}">
                    <div class="negrita">N° ${String(v.numero).padStart(6, "0")} · ${fechaHora(v.fecha)} · ${dinero(v.total)}</div>
                    <div class="chico texto-2" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(v.items.map(i => i.nombre).join(", "))}</div>
                </button>`).join("")}</div>` : '<p class="chico texto-2">No se encontró esa venta.</p>';
        };

        const pintarBusquedaCambio = raiz => {
            const palabras = normalizar($("#pvProd", raiz).value).split(/\s+/).filter(Boolean);
            const lista = palabras.length ? Datos.productos()
                .filter(p => p.activo !== false && controlaStock(p) && Number(p.stock) > 0)
                .filter(p => palabras.every(x => normalizar([p.nombre, p.categoria, p.codigoBarras].join(" ")).includes(x)))
                .slice(0, 10) : [];
            $("#pvProdRes", raiz).innerHTML = lista.length ? `<div class="lista-busqueda">${lista.map(p => `
                <button type="button" data-elegir="${p.id}">
                    <div class="negrita">${esc(p.nombre)}</div>
                    <div class="chico texto-2">${dinero(p.precio)} · ${esc(textoStock(p))}</div>
                </button>`).join("")}</div>` : (palabras.length ? '<p class="chico texto-2">Sin stock o no existe.</p>' : "");
        };

        const pintarPaso = raiz => {

            const cont = $("#pvPaso", raiz);

            if (!e.venta) {
                cont.innerHTML = `
                    <p class="texto-2" style="margin-bottom:10px">Busque la venta original por su número o por el producto.</p>
                    <div class="campo"><label for="pvBusca">N° de venta o producto</label><input id="pvBusca" value="${esc(e.busca)}" placeholder="Ej: 12 o Pegasus" autocomplete="off"></div>
                    <div id="pvVentas" style="margin-top:8px"></div>`;
                pintarVentas(raiz);
                return;
            }

            const c = calculo();
            const fuera = dias() > plazo();

            cont.innerHTML = `
                <div class="seleccionado" style="margin-bottom:14px">
                    ${icono("boleta")}
                    <div style="flex:1;min-width:0">
                        <div class="negrita">Venta N° ${String(e.venta.numero).padStart(6, "0")} · ${dinero(e.venta.total)}</div>
                        <div class="chico texto-2">${fechaHora(e.venta.fecha)} · hace ${plural(dias(), "día", "días")}</div>
                    </div>
                    <button class="btn btn-chico" type="button" id="pvOtraVenta">Cambiar</button>
                </div>

                <div class="chips" id="pvTipos" style="margin-bottom:14px">
                    ${Object.entries(TIPOS_POSVENTA).map(([k, t]) => `<button type="button" class="chip ${e.tipo === k ? "activo" : ""}" data-tipo="${k}">${t.texto}<span class="chico texto-3" style="margin-left:6px;display:none">${t.detalle}</span></button>`).join("")}
                </div>
                <p class="chico texto-2" style="margin:-6px 0 12px">${TIPOS_POSVENTA[e.tipo].detalle}.</p>

                ${fuera ? `<div class="mensaje-error" style="margin-bottom:12px">Esta venta está fuera del plazo (${e.tipo === "garantia" ? MESES_GARANTIA + " meses de garantía" : DIAS_CAMBIO + " días para cambios y devoluciones"}).
                    ${esAdmin ? `<label class="check" style="margin-top:8px"><input type="checkbox" id="pvFuera" ${e.fuera ? "checked" : ""}> Autorizo hacerlo igual</label>` : " Pida a un administrador que lo autorice."}</div>` : ""}

                <div class="tarjeta" style="margin-bottom:14px">
                    <table class="tabla">
                        <thead><tr><th>Lo que trae el cliente</th><th class="num">Pagó</th><th class="num" style="width:96px">Cantidad</th></tr></thead>
                        <tbody>${c.disp.map(d => `
                            <tr>
                                <td class="celda-titulo">${esc(d.nombre)}<div class="chico texto-3">Se puede devolver: ${d.disponible} de ${d.vendido}</div></td>
                                <td class="num">${dinero(d.valor)}</td>
                                <td class="num"><input type="number" min="0" max="${d.disponible}" step="1" data-cant="${d.productoId}" value="${e.cant[d.productoId] || 0}" ${d.disponible ? "" : "disabled"} style="width:72px;text-align:right"></td>
                            </tr>`).join("")}</tbody>
                    </table>
                </div>

                <div class="rejilla">
                    <div class="campo"><label for="pvMotivo">Motivo</label><select id="pvMotivo">${MOTIVOS_POSVENTA[e.tipo].map(m => `<option ${m === e.motivo ? "selected" : ""}>${m}</option>`).join("")}</select></div>
                    ${e.tipo === "garantia"
                        ? `<div class="campo"><label for="pvRes">¿Qué se hará?</label><select id="pvRes">${Object.entries(RESOLUCIONES).map(([k, t]) => `<option value="${k}" ${k === e.resolucion ? "selected" : ""}>${t}</option>`).join("")}</select></div>`
                        : `<div class="campo"><label>Estado del producto</label><label class="check"><input type="checkbox" id="pvFalla" ${e.falla ? "checked" : ""}> Viene con falla o muy usado (no vuelve al stock)</label></div>`}
                    <div class="campo col-todo"><label for="pvNota">Observación</label><input id="pvNota" value="${esc(e.nota)}" placeholder="Opcional"></div>
                </div>

                ${c.resolucion === "cambio" ? `
                    <h3 style="margin:16px 0 8px;font-size:15px">Se lleva</h3>
                    <div class="campo"><input id="pvProd" placeholder="Buscar la talla o el modelo nuevo" autocomplete="off"></div>
                    <div id="pvProdRes" style="margin:6px 0"></div>
                    ${e.entregados.length ? `<div class="tarjeta"><table class="tabla"><tbody>${e.entregados.map((x, i) => `
                        <tr><td class="celda-titulo">${esc(x.nombre)}</td><td class="num">${dinero(x.precio)}</td>
                        <td class="num"><input type="number" min="1" step="1" data-ent="${i}" value="${x.cantidad}" style="width:64px;text-align:right"></td>
                        <td class="acciones"><button type="button" class="btn btn-chico btn-icono" data-quitar="${i}" aria-label="Quitar">${icono("cerrar")}</button></td></tr>`).join("")}</tbody></table></div>` : '<p class="chico texto-3">Aún no elige qué se lleva.</p>'}` : ""}

                <div style="max-width:340px;margin:16px 0 0 auto">
                    <div class="linea-total"><span>Valor de lo que devuelve</span><span>${dinero(c.valorDevuelto)}</span></div>
                    ${c.resolucion === "cambio" ? `<div class="linea-total"><span>Valor de lo que se lleva</span><span>${dinero(c.valorEntregado)}</span></div>` : ""}
                    <div class="linea-total" style="font-size:18px;font-weight:700;color:var(--texto)">
                        <span>${c.diferencia > 0 ? "Cliente paga" : c.diferencia < 0 ? "Se devuelve al cliente" : "Sin diferencia de dinero"}</span>
                        <span>${c.diferencia ? dinero(Math.abs(c.diferencia)) : "—"}</span>
                    </div>
                </div>

                ${c.diferencia ? `<div class="campo" style="margin-top:12px"><label for="pvMetodo">${c.diferencia > 0 ? "Forma de pago de la diferencia" : "Cómo se devuelve el dinero"}</label>
                    <select id="pvMetodo">${Object.entries(METODOS_PAGO).map(([k, m]) => `<option value="${k}" ${k === e.metodo ? "selected" : ""}>${m.texto}</option>`).join("")}</select></div>` : ""}

                <div id="pvError" class="mensaje-error oculto" style="margin-top:12px"></div>`;

            if (c.resolucion === "cambio") pintarBusquedaCambio(raiz);
        };

        abrirModal({
            titulo: "Nuevo caso de posventa",
            clase: "ancho",
            html: '<div id="pvPaso"></div>',
            alAbrir: raiz => {

                pintarPaso(raiz);

                raiz.addEventListener("input", ev => {
                    if (ev.target.id === "pvBusca") { e.busca = ev.target.value; pintarVentas(raiz); }
                    if (ev.target.id === "pvProd") pintarBusquedaCambio(raiz);
                    if (ev.target.id === "pvNota") e.nota = ev.target.value;
                });

                raiz.addEventListener("change", ev => {
                    const t = ev.target;
                    if (t.dataset.cant !== undefined) {
                        const d = disponiblesVenta(e.venta).find(x => x.productoId === t.dataset.cant);
                        e.cant[t.dataset.cant] = Math.max(0, Math.min(d ? d.disponible : 0, Math.floor(Number(t.value) || 0)));
                    } else if (t.dataset.ent !== undefined) {
                        const x = e.entregados[Number(t.dataset.ent)];
                        const p = Datos.producto(x.productoId);
                        x.cantidad = Math.max(1, Math.min(Number(p.stock) || 1, Math.floor(Number(t.value) || 1)));
                    } else if (t.id === "pvMotivo") e.motivo = t.value;
                    else if (t.id === "pvRes") e.resolucion = t.value;
                    else if (t.id === "pvFalla") e.falla = t.checked;
                    else if (t.id === "pvFuera") e.fuera = t.checked;
                    else if (t.id === "pvMetodo") e.metodo = t.value;
                    else return;
                    pintarPaso(raiz);
                });

                raiz.addEventListener("click", ev => {
                    const t = ev.target.closest("button");
                    if (!t) return;
                    if (t.dataset.venta) { e.venta = Datos.ventas().find(v => v.id === t.dataset.venta); e.cant = {}; e.entregados = []; e.motivo = MOTIVOS_POSVENTA[e.tipo][0]; pintarPaso(raiz); }
                    else if (t.id === "pvOtraVenta") { e.venta = null; pintarPaso(raiz); }
                    else if (t.dataset.tipo) { e.tipo = t.dataset.tipo; e.motivo = MOTIVOS_POSVENTA[e.tipo][0]; e.resolucion = e.tipo === "garantia" ? "cambio" : e.resolucion; pintarPaso(raiz); }
                    else if (t.dataset.elegir) {
                        const p = Datos.producto(t.dataset.elegir);
                        const ya = e.entregados.find(x => x.productoId === p.id);
                        if (ya) ya.cantidad = Math.min(Number(p.stock), ya.cantidad + 1);
                        else e.entregados.push({ productoId: p.id, nombre: p.nombre, cantidad: 1, precio: Number(p.precio) || 0, costo: Number(p.costo) || 0 });
                        pintarPaso(raiz);
                    }
                    else if (t.dataset.quitar !== undefined) { e.entregados.splice(Number(t.dataset.quitar), 1); pintarPaso(raiz); }
                });

                e.motivo = MOTIVOS_POSVENTA[e.tipo][0];
                if (e.venta) pintarPaso(raiz);
            },
            botones: [
                { texto: "Cancelar" },
                {
                    texto: "Registrar caso",
                    clase: "btn-primario",
                    icono: "check",
                    accion: (cerrar, raiz) => {

                        const falla = t => {
                            const caja = $("#pvError", raiz);
                            if (caja) { caja.textContent = t; caja.classList.remove("oculto"); } else avisar(t, "error");
                        };

                        if (!e.venta) { avisar("Primero elija la venta original.", "error"); return; }

                        const c = calculo();

                        if (!c.devueltos.length) { falla("Marque la cantidad de productos que trae el cliente."); return; }
                        if (dias() > plazo() && !e.fuera) { falla("Está fuera de plazo. Solo un administrador puede autorizarlo."); return; }
                        if (c.resolucion === "cambio" && !c.entregados.length) { falla("Elija qué producto se lleva el cliente."); return; }

                        const caja = Datos.cajaActual();

                        if (c.diferencia && !caja) { falla("Hay dinero involucrado: abra la caja primero."); return; }

                        if (c.diferencia < 0 && e.metodo === "efectivo" && -c.diferencia > resumenCaja(caja).efectivoEsperado) {
                            falla("No hay suficiente efectivo en la caja para devolver. Elija otra forma de devolución o ingrese dinero a la caja.");
                            return;
                        }

                        const productos = Datos.productos();

                        for (const x of c.entregados) {
                            const p = productos.find(q => q.id === x.productoId);
                            if (!p || Number(p.stock) < x.cantidad) { falla("No alcanza el stock de " + x.nombre + "."); return; }
                        }

                        const usuario = Sesion.usuario();
                        const numero = Datos.siguienteNumero("posventa");
                        const nombreCaso = "Posventa N° " + String(numero).padStart(4, "0");

                        c.devueltos.forEach(d => {
                            if (d.estado === "bueno" && (c.resolucion === "cambio" || c.resolucion === "reembolso")) {
                                devolverStock(productos, d.productoId, d.cantidad);
                                Datos.registrarMovimiento({ tipo: "ingreso", productoId: d.productoId, producto: d.nombre, unidades: d.cantidad, detalle: nombreCaso + " (vuelve al stock)" });
                            }
                        });

                        c.entregados.forEach(x => {
                            descontarStock(productos, x.productoId, x.cantidad);
                            Datos.registrarMovimiento({ tipo: "baja", productoId: x.productoId, producto: x.nombre, unidades: -x.cantidad, detalle: nombreCaso + " (entregado en cambio)" });
                        });

                        const caso = {
                            id: nuevoId(),
                            numero,
                            fecha: new Date().toISOString(),
                            tipo: e.tipo,
                            ventaId: e.venta.id,
                            ventaNumero: e.venta.numero,
                            motivo: e.motivo,
                            nota: e.nota.trim(),
                            resolucion: c.resolucion,
                            devueltos: c.devueltos,
                            entregados: c.entregados,
                            valorDevuelto: c.valorDevuelto,
                            valorEntregado: c.valorEntregado,
                            diferencia: c.diferencia,
                            costoNeto: c.costoNeto,
                            metodo: c.diferencia ? e.metodo : null,
                            cajaId: caja ? caja.id : null,
                            usuarioId: usuario.id,
                            usuarioNombre: usuario.nombre,
                            clienteNombre: e.venta.clienteNombre || "",
                            fueraDePlazo: dias() > plazo(),
                            estado: c.resolucion === "reparacion" ? "en_reparacion" : "cerrado"
                        };

                        const lista = Datos.posventa();
                        lista.unshift(caso);

                        if (!Datos.guardarPosventa(lista)) return;

                        Datos.guardarProductos(productos);

                        cerrar();
                        this.exito(caso);
                    }
                }
            ]
        });
    },


    exito(caso) {

        if (Datos.config().imprimirAuto) Impresion.posventa(caso);

        abrirModal({
            titulo: "Caso registrado",
            clase: "angosto",
            html: `
                <div class="venta-lista-exito">
                    <div class="circulo">${icono("check")}</div>
                    <div class="texto-2">${TIPOS_POSVENTA[caso.tipo].texto} N° ${String(caso.numero).padStart(4, "0")}</div>
                    <div style="font-size:26px;font-weight:800;margin:4px 0">${caso.diferencia ? (caso.diferencia > 0 ? "Cobrar " : "Devolver ") + dinero(Math.abs(caso.diferencia)) : "Sin movimiento de dinero"}</div>
                    <div class="texto-2">${esc(this.textoResultado(caso))}</div>
                </div>`,
            alCerrar: () => App.refrescar(),
            botones: [
                { texto: "Imprimir comprobante", icono: "impresora", accion: () => Impresion.posventa(caso) },
                { texto: "Listo", clase: "btn-primario" }
            ]
        });
    },


    ver(caso) {

        const t = TIPOS_POSVENTA[caso.tipo];

        abrirModal({
            titulo: `${t.texto} N° ${String(caso.numero).padStart(4, "0")}`,
            clase: "ancho",
            html: `
                <div class="ficha-datos">
                    <div><div class="etiqueta">Fecha</div><div class="dato">${fechaHora(caso.fecha)}</div></div>
                    <div><div class="etiqueta">Venta original</div><div class="dato">N° ${String(caso.ventaNumero).padStart(6, "0")}</div></div>
                    <div><div class="etiqueta">Atendió</div><div class="dato">${esc(caso.usuarioNombre)}</div></div>
                    <div><div class="etiqueta">Motivo</div><div class="dato">${esc(caso.motivo)}</div></div>
                </div>
                ${caso.estado === "anulado" ? `<div class="mensaje-error" style="margin-bottom:12px">Anulado el ${fechaHora(caso.anulacion.fecha)} por ${esc(caso.anulacion.usuario)}.</div>` : ""}
                ${caso.fueraDePlazo ? '<div class="mensaje-info" style="margin-bottom:12px">Se hizo fuera de plazo, con autorización.</div>' : ""}
                <div class="tarjeta" style="margin-bottom:12px">
                    <table class="tabla">
                        <thead><tr><th>Devuelve</th><th class="num">Cant.</th><th>Estado</th><th class="num">Valor</th></tr></thead>
                        <tbody>${caso.devueltos.map(d => `<tr><td class="celda-titulo">${esc(d.nombre)}</td><td class="num">${d.cantidad}</td><td>${d.estado === "bueno" ? "Vuelve al stock" : "Con falla"}</td><td class="num">${dinero(d.valor * d.cantidad)}</td></tr>`).join("")}</tbody>
                    </table>
                </div>
                ${caso.entregados.length ? `<div class="tarjeta" style="margin-bottom:12px"><table class="tabla">
                    <thead><tr><th>Se lleva</th><th class="num">Cant.</th><th class="num">Valor</th></tr></thead>
                    <tbody>${caso.entregados.map(x => `<tr><td class="celda-titulo">${esc(x.nombre)}</td><td class="num">${x.cantidad}</td><td class="num">${dinero(x.precio * x.cantidad)}</td></tr>`).join("")}</tbody></table></div>` : ""}
                <div style="max-width:320px;margin:0 0 0 auto">
                    <div class="linea-total" style="font-size:17px;font-weight:700;color:var(--texto)"><span>${caso.diferencia > 0 ? "Cliente pagó" : caso.diferencia < 0 ? "Se devolvió" : "Dinero"}</span><span>${caso.diferencia ? dinero(Math.abs(caso.diferencia)) : "—"}</span></div>
                    ${caso.metodo ? `<div class="linea-total"><span>Forma</span><span>${esc(METODOS_PAGO[caso.metodo].texto)}</span></div>` : ""}
                </div>
                ${caso.nota ? `<p class="chico texto-2" style="margin-top:12px">Observación: ${esc(caso.nota)}</p>` : ""}
            `,
            botones: [
                ...(caso.estado === "en_reparacion" && Sesion.esAdmin() ? [{
                    texto: "Marcar reparado",
                    accion: cerrar => {
                        const lista = Datos.posventa();
                        lista.find(c => c.id === caso.id).estado = "cerrado";
                        Datos.guardarPosventa(lista);
                        cerrar();
                        App.refrescar();
                    }
                }] : []),
                ...(caso.estado !== "anulado" && Sesion.esAdmin() ? [{ texto: "Anular caso", clase: "btn-peligro", accion: cerrar => { cerrar(); this.anular(caso); } }] : []),
                { texto: "Imprimir", icono: "impresora", accion: () => Impresion.posventa(caso) },
                { texto: "Cerrar", clase: "btn-primario" }
            ]
        });
    },


    async anular(caso) {

        if (!Sesion.esAdmin() || caso.estado === "anulado") return;

        if (!(await confirmar({
            titulo: "Anular caso de posventa",
            mensaje: "Se deshacen los movimientos de stock y de dinero de este caso. ¿Continuar?",
            textoSi: "Anular caso",
            peligro: true
        }))) return;

        const productos = Datos.productos();

        // se deshace: lo entregado vuelve, lo devuelto en buen estado sale otra vez
        for (const d of caso.devueltos) {
            if (d.estado === "bueno" && (caso.resolucion === "cambio" || caso.resolucion === "reembolso")) {
                const p = productos.find(q => q.id === d.productoId);
                if (p && controlaStock(p) && Number(p.stock) < d.cantidad) { avisar("No se puede anular: ya se vendió el stock de " + d.nombre + ".", "error"); return; }
            }
        }

        caso.entregados.forEach(x => devolverStock(productos, x.productoId, x.cantidad));
        caso.devueltos.forEach(d => { if (d.estado === "bueno" && (caso.resolucion === "cambio" || caso.resolucion === "reembolso")) descontarStock(productos, d.productoId, d.cantidad); });

        const lista = Datos.posventa();
        const registro = lista.find(c => c.id === caso.id);

        registro.estado = "anulado";
        registro.anulacion = { fecha: new Date().toISOString(), usuario: Sesion.nombre() };

        Datos.guardarPosventa(lista);
        Datos.guardarProductos(productos);

        avisar("Caso anulado.");
        App.refrescar();
    }
};


Modulos.posventa = {
    titulo: "Posventa",
    icono: "cambio",
    roles: ["admin", "vendedor"],
    render: vista => Posventa.render(vista)
};
