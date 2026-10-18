// ==========================================
// ÓRDENES (de trabajo, de reparación, arreglos, apartados)
// Ingreso, presupuesto, repuestos y mano de obra, abonos, estados,
// cobro y entrega con garantía. Se configura con RUBRO.ordenes.
// ==========================================

"use strict";

Object.assign(Datos, {
    ordenes: () => DB.leer("ordenes", []),
    guardarOrdenes: valor => DB.guardar("ordenes", valor),
    orden(id) { return this.ordenes().find(o => o.id === id) || null; }
});


function otCfg() {
    return (window.RUBRO && RUBRO.ordenes) || null;
}


// Configuracion efectiva de una orden: si el rubro tiene tipos (arreglo, apartado...), el tipo manda
function tipoCfg(tipoId) {
    const cfg = otCfg();
    if (!cfg || !cfg.tipos) return cfg;
    const t = cfg.tipos.find(x => x.id === tipoId) || cfg.tipos[0];
    const ids = t.estados || cfg.estados.map(e => e.id);
    return Object.assign({}, cfg, t, { estados: ids.map(id => cfg.estados.find(e => e.id === id)).filter(Boolean) });
}


// el cliente y la lista usan un "objeto" de referencia (el del primer tipo que tenga)
(function normalizarOrdenes() {
    const cfg = window.RUBRO && RUBRO.ordenes;
    if (cfg && !cfg.objeto) {
        const t = (cfg.tipos || []).find(x => x.objeto);
        cfg.objeto = t ? t.objeto : { nombre: "Pieza", plural: "Piezas", campos: [], titulo: () => "" };
    }
})();


function estadoDe(orden) {
    const cfg = otCfg();
    return cfg ? (cfg.estados.find(e => e.id === orden.estado) || { id: orden.estado, texto: orden.estado, clase: "" }) : null;
}


function totalOrden(orden) {
    const subtotal = (orden.items || []).reduce((s, i) => s + Math.round(Number(i.precio) * Number(i.cantidad)), 0);
    const descuento = Math.min(subtotal, Math.max(0, Number(orden.descuento) || 0));
    const total = subtotal - descuento;
    const abonado = (orden.abonos || []).reduce((s, a) => s + a.monto, 0);
    return { subtotal, descuento, total, abonado, saldo: total - abonado };
}


function ordenAbierta(o) {
    const cfg = otCfg();
    return o.estado !== cfg.estadoFinal && o.estado !== "anulada";
}


function numeroOrden(o) {
    return String(o.numero).padStart(5, "0");
}


const Ordenes = {

    filtro: "abiertas",
    texto: "",
    vistaMantencion: false,


    // ------------------------------------------
    // LISTA
    // ------------------------------------------
    render(vista) {

        const cfg = otCfg();

        vista.innerHTML = `
            <div class="cabecera-vista">
                <div><h1>${esc(cfg.titulo)}</h1><p class="sub">${esc(cfg.subtitulo || "")}</p></div>
                <button class="btn btn-primario btn-grande" id="otNueva">${icono("mas")} Nueva ${esc(cfg.singular)}</button>
            </div>
            <div class="tarjeta">
                <div class="barra-herramientas">
                    <div class="buscar" style="flex:1;position:relative;min-width:200px">${icono("buscar")}<input id="otBuscar" placeholder="Buscar por N°, cliente, ${esc((cfg.objeto.etiquetaClave || "dato").toLowerCase())} o texto" value="${esc(this.texto)}"></div>
                    ${cfg.recordatorio ? `<button class="btn ${this.vistaMantencion ? "btn-primario" : ""}" id="otMant">${icono("calendario")} Próximas mantenciones</button>` : ""}
                </div>
                <div class="barra-herramientas" style="padding-top:0"><div class="chips" id="otChips"></div></div>
                <div id="otTabla"></div>
            </div>
        `;

        $("#otNueva").addEventListener("click", () => this.nueva());
        $("#otBuscar").addEventListener("input", e => { this.texto = e.target.value; this.pintar(); });

        const mant = $("#otMant");
        if (mant) mant.addEventListener("click", () => { this.vistaMantencion = !this.vistaMantencion; this.render(vista); });

        $("#otChips").addEventListener("click", e => {
            const b = e.target.closest("[data-f]");
            if (b) { this.filtro = b.dataset.f; this.vistaMantencion = false; this.pintar(); }
        });

        $("#otTabla").addEventListener("click", e => {
            const b = e.target.closest("[data-ver]");
            if (b) this.ver(b.dataset.ver);
            const w = e.target.closest("[data-aviso]");
            if (w) this.avisarMantencion(w.dataset.aviso);
        });

        this.pintar();
    },


    pintar() {

        const cfg = otCfg();
        const todas = Datos.ordenes();
        const cuenta = f => todas.filter(o => this.coincide(o, f)).length;

        $("#otChips").innerHTML = [["abiertas", "Abiertas"], ...cfg.estados.filter(e => e.id !== cfg.estadoFinal).map(e => [e.id, e.texto]), [cfg.estadoFinal, "Entregadas"], ["anulada", "Anuladas"], ["todas", "Todas"]]
            .map(([k, t]) => `<button class="chip ${this.filtro === k && !this.vistaMantencion ? "activo" : ""}" data-f="${k}">${esc(t)} <span class="n">${cuenta(k)}</span></button>`).join("");

        if (this.vistaMantencion) { this.pintarMantenciones(); return; }

        const palabras = normalizar(this.texto).split(/\s+/).filter(Boolean);

        const lista = todas
            .filter(o => this.coincide(o, this.filtro))
            .filter(o => {
                if (!palabras.length) return true;
                const base = normalizar([numeroOrden(o), o.numero, o.clienteNombre, o.objetoTitulo, o.etiqueta, o.problema, o.diagnostico, (o.items || []).map(i => i.nombre).join(" ")].join(" "));
                return palabras.every(p => base.includes(p));
            })
            .sort((a, b) => b.fecha.localeCompare(a.fecha));

        if (!lista.length) {
            $("#otTabla").innerHTML = vacioHTML("herramienta", todas.length ? "Sin resultados" : `Aún no hay ${cfg.plural}`, `Ingrese la primera con el botón «Nueva ${cfg.singular}».`);
            return;
        }

        const hoy = hoyISO();

        $("#otTabla").innerHTML = `
            <div class="tabla-contenedor"><table class="tabla">
                <thead><tr><th>N°</th><th>Ingreso</th><th>Cliente</th><th>${esc(cfg.objeto.nombre)}</th><th>Estado</th><th>Prometida</th><th class="num">Total</th><th class="num">Saldo</th><th></th></tr></thead>
                <tbody>${lista.slice(0, 300).map(o => {
                    const t = totalOrden(o);
                    const e = estadoDe(o);
                    const atrasada = ordenAbierta(o) && o.fechaPrometida && o.fechaPrometida < hoy;
                    return `<tr class="${o.estado === "anulada" ? "anulada" : ""}">
                        <td class="negrita">${numeroOrden(o)}</td>
                        <td class="nowrap">${fechaCorta(o.fecha)}</td>
                        <td><div class="celda-titulo">${esc(o.clienteNombre || "—")}</div></td>
                        <td style="max-width:230px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(o.objetoTitulo)}">${o.etiqueta ? `<strong>${esc(o.etiqueta)}</strong> · ` : ""}${esc(o.objetoTitulo || "—")}</div></td>
                        <td><span class="badge ${e.clase || ""}">${esc(e.texto)}</span></td>
                        <td class="nowrap ${atrasada ? "rojo negrita" : ""}">${o.fechaPrometida ? fechaCorta(o.fechaPrometida) : "—"}${atrasada ? " ⚠" : ""}</td>
                        <td class="num">${t.total ? dinero(t.total) : "—"}</td>
                        <td class="num ${t.saldo > 0 && o.estado !== "anulada" ? "amarillo negrita" : ""}">${o.estado === "anulada" || o.ventaId ? "—" : t.total ? dinero(t.saldo) : "—"}</td>
                        <td class="acciones"><button class="btn btn-chico" data-ver="${o.id}">${icono("ojo")} Abrir</button></td>
                    </tr>`;
                }).join("")}</tbody>
            </table></div>
            <div class="pie-tabla"><span>${plural(lista.length, cfg.singular, cfg.plural)}</span></div>`;
    },


    coincide(o, f) {
        const cfg = otCfg();
        if (f === "todas") return true;
        if (f === "abiertas") return ordenAbierta(o);
        return o.estado === f;
    },


    // ------------------------------------------
    // MANTENCIONES (recordatorios)
    // ------------------------------------------
    pintarMantenciones() {

        const cfg = otCfg();
        const limite = sumarDias(hoyISO(), 30);
        const clientes = new Map(Datos.clientes().map(c => [c.id, c]));

        const lista = Datos.activos()
            .filter(a => a.proxima && a.proxima.fecha && a.proxima.fecha <= limite)
            .sort((a, b) => a.proxima.fecha.localeCompare(b.proxima.fecha));

        $("#otTabla").innerHTML = lista.length ? `
            <div class="tabla-contenedor"><table class="tabla">
                <thead><tr><th>${esc(cfg.objeto.nombre)}</th><th>Cliente</th><th>Teléfono</th><th>Toca el</th><th>Km</th><th></th></tr></thead>
                <tbody>${lista.map(a => {
                    const c = clientes.get(a.clienteId) || {};
                    const vencida = a.proxima.fecha < hoyISO();
                    return `<tr><td><div class="celda-titulo">${esc(etiquetaActivo(a))}</div><div class="celda-sub">${esc(tituloActivo(a))}</div></td>
                        <td>${esc(c.nombre || "—")}</td><td class="nowrap">${esc(c.telefono || "—")}</td>
                        <td class="nowrap ${vencida ? "rojo negrita" : "amarillo"}">${fechaCorta(a.proxima.fecha)}${vencida ? " (vencida)" : ""}</td>
                        <td class="nowrap">${a.proxima.km ? numero(a.proxima.km) : "—"}</td>
                        <td class="acciones">${c.telefono ? `<button class="btn btn-chico btn-primario" data-aviso="${a.id}">${icono("chat")} Avisar</button>` : ""}</td></tr>`;
                }).join("")}</tbody></table></div>
            <div class="pie-tabla"><span>${plural(lista.length, "aviso", "avisos")} para los próximos 30 días o vencidos</span></div>`
            : vacioHTML("calendario", "Sin mantenciones por vencer", "Al entregar un trabajo se agenda la próxima mantención automáticamente.");
    },


    avisarMantencion(activoId) {
        const a = Datos.activo(activoId);
        const c = a && Datos.cliente(a.clienteId);
        if (!c) return;
        const cfg = otCfg();
        const mensaje = (cfg.recordatorio.mensaje || "Hola {cliente}, le recordamos la próxima mantención de su {objeto} {detalle}. Escríbanos para agendar.")
            .replace("{cliente}", c.nombre.split(" ")[0]).replace("{objeto}", cfg.objeto.nombre.toLowerCase()).replace("{detalle}", tituloActivo(a));
        window.open("https://wa.me/" + telefonoWhatsApp(c.telefono) + "?text=" + encodeURIComponent(mensaje), "_blank");
    },


    // ------------------------------------------
    // NUEVA ORDEN
    // ------------------------------------------
    nueva(previo = {}) {

        const cfg = otCfg();
        const o = cfg.objeto;
        const e = { tipo: previo.tipo || (cfg.tipos ? cfg.tipos[0].id : null), cliente: previo.clienteId ? Datos.cliente(previo.clienteId) : null, activo: previo.activoId ? Datos.activo(previo.activoId) : null, nuevoCliente: false, nuevoActivo: false, texto: "" };
        const T = () => tipoCfg(e.tipo);

        const { raiz, cerrar } = abrirModal({
            titulo: "Nueva " + cfg.singular,
            clase: "ancho",
            html: '<div id="otPaso"></div>',
            botones: [
                { texto: "Cancelar" },
                { texto: "Ingresar " + cfg.singular, clase: "btn-primario", icono: "check", accion: () => crear() }
            ]
        });

        const pintar = () => {

            const cont = $("#otPaso", raiz);
            const tc = T();
            const o = tc.objeto;
            const activos = e.cliente && o ? Datos.activos().filter(a => a.clienteId === e.cliente.id) : [];

            let bloqueCliente;

            if (e.cliente) {
                bloqueCliente = `<div class="seleccionado">${icono("usuarios")}<div style="flex:1;min-width:0"><div class="negrita">${esc(e.cliente.nombre)}</div><div class="chico texto-2">${esc([e.cliente.telefono, e.cliente.rut].filter(Boolean).join(" · "))}</div></div><button class="btn btn-chico" type="button" data-accion="otro-cliente">Cambiar</button></div>`;
            } else if (e.nuevoCliente) {
                bloqueCliente = `<div class="rejilla rejilla-3">
                    <div class="campo" style="grid-column:span 2"><label class="requerido" for="ncNom">Nombre del cliente</label><input id="ncNom" autocomplete="off"></div>
                    <div class="campo"><label class="requerido" for="ncTel">Teléfono</label><input id="ncTel" inputmode="tel" placeholder="9 1234 5678"></div>
                    <div class="campo"><label for="ncRut">RUT (opcional)</label><input id="ncRut"></div>
                    <div class="col-todo"><button class="btn btn-chico" type="button" data-accion="buscar-cliente">Mejor buscar uno existente</button></div></div>`;
            } else {
                bloqueCliente = `<div class="campo"><label for="ncBuscar">Buscar cliente por nombre, teléfono, RUT o ${esc(((o || cfg.objeto).etiquetaClave || "dato").toLowerCase())}</label><input id="ncBuscar" value="${esc(e.texto)}" autocomplete="off" placeholder="Escriba para buscar"></div>
                    <div id="ncRes" style="margin:6px 0"></div>
                    <button class="btn btn-chico" type="button" data-accion="cliente-nuevo">${icono("mas")} Cliente nuevo</button>`;
            }

            let bloqueActivo = "";

            if (e.cliente || e.nuevoCliente) {

                if (!o) {
                    bloqueActivo = "";
                } else if (e.activo) {
                    bloqueActivo = `<div class="seleccionado" style="margin-top:12px">${icono("herramienta")}<div style="flex:1;min-width:0"><div class="negrita">${esc(o.nombre)}: ${esc(etiquetaActivo(e.activo) || "")}</div><div class="chico texto-2">${esc(tituloActivo(e.activo))}</div></div><button class="btn btn-chico" type="button" data-accion="otro-activo">Cambiar</button></div>`;
                } else if (e.nuevoActivo || !activos.length) {
                    bloqueActivo = `<h3 style="margin:14px 0 6px;font-size:14px">${esc(o.nombre)} (nuevo)</h3><div class="rejilla rejilla-3">${camposFormHTML(o.campos, {}, "na_")}</div>${activos.length ? '<button class="btn btn-chico" type="button" data-accion="elegir-activo">Elegir uno que ya tiene</button>' : ""}`;
                } else {
                    bloqueActivo = `<h3 style="margin:14px 0 6px;font-size:14px">${esc(o.nombre)}</h3><div class="chips">${activos.map(a => `<button class="chip" type="button" data-activo="${a.id}">${esc(etiquetaActivo(a) || tituloActivo(a))} <span class="n">${esc(tituloActivo(a))}</span></button>`).join("")}<button class="chip" type="button" data-accion="activo-nuevo">${icono("mas")} Otro</button></div>`;
                }

                bloqueActivo += `<div class="rejilla rejilla-3" style="margin-top:14px">
                    <div class="campo col-todo"><label class="requerido" for="noProb">${esc(tc.problema)}</label><textarea id="noProb" rows="2" placeholder="${esc(tc.problemaEjemplo || "")}"></textarea></div>
                    ${camposFormHTML(tc.camposOrden || [], {}, "no_")}
                    </div>`;
            }

            const chipsTipo = cfg.tipos ? `<div class="chips" style="margin-bottom:14px">${cfg.tipos.map(x => `<button type="button" class="chip ${x.id === e.tipo ? "activo" : ""}" data-tipo="${x.id}">${esc(x.texto)}</button>`).join("")}</div>` : "";

            cont.innerHTML = `${chipsTipo}${bloqueCliente}${bloqueActivo}<div id="otError" class="mensaje-error oculto" style="margin-top:12px"></div>`;

            if ($("#ncBuscar", raiz)) { $("#ncBuscar", raiz).focus(); mostrarResultados(); }
        };

        const mostrarResultados = () => {
            const cont = $("#ncRes", raiz);
            if (!cont) return;
            const t = e.texto.trim();
            if (!t) { cont.innerHTML = ""; return; }
            const lista = Clientes.buscar(t).slice(0, 8);
            cont.innerHTML = lista.length ? `<div class="lista-busqueda">${lista.map(c => `<button type="button" data-cliente="${c.id}"><div class="negrita">${esc(c.nombre)}</div><div class="chico texto-2">${esc([c.telefono, c.rut, Datos.activos().filter(a => a.clienteId === c.id).map(etiquetaActivo).filter(Boolean).join(", ")].filter(Boolean).join(" · "))}</div></button>`).join("")}</div>` : '<p class="chico texto-2">No se encontró. Use «Cliente nuevo».</p>';
        };

        raiz.addEventListener("input", ev => {
            if (ev.target.id === "ncBuscar") { e.texto = ev.target.value; mostrarResultados(); }
        });

        raiz.addEventListener("click", ev => {
            const b = ev.target.closest("[data-accion],[data-cliente],[data-activo],[data-tipo]");
            if (!b) return;
            if (b.dataset.tipo) { e.tipo = b.dataset.tipo; e.activo = null; e.nuevoActivo = false; pintar(); return; }
            if (b.dataset.cliente) { e.cliente = Datos.cliente(b.dataset.cliente); e.activo = null; e.nuevoActivo = false; pintar(); return; }
            if (b.dataset.activo) { e.activo = Datos.activo(b.dataset.activo); pintar(); return; }
            const a = b.dataset.accion;
            if (a === "otro-cliente") { e.cliente = null; e.activo = null; e.nuevoCliente = false; pintar(); }
            if (a === "cliente-nuevo") { e.nuevoCliente = true; e.activo = null; pintar(); }
            if (a === "buscar-cliente") { e.nuevoCliente = false; pintar(); }
            if (a === "otro-activo" || a === "elegir-activo") { e.activo = null; e.nuevoActivo = false; pintar(); }
            if (a === "activo-nuevo") { e.nuevoActivo = true; pintar(); }
        });

        const crear = () => {

            const error = $("#otError", raiz);
            const falla = t => { error.textContent = t; error.classList.remove("oculto"); };

            if (!e.cliente && !e.nuevoCliente) { falla("Elija o cree el cliente."); return; }

            const clientes = Datos.clientes();
            let cliente = e.cliente;

            if (!cliente) {
                const nombre = $("#ncNom", raiz).value.trim();
                const tel = $("#ncTel", raiz).value.trim();
                if (!nombre) { falla("Escriba el nombre del cliente."); return; }
                if (!tel) { falla("Escriba el teléfono del cliente."); return; }
                cliente = { id: nuevoId(), nombre, telefono: tel, rut: $("#ncRut", raiz).value.trim(), correo: "", direccion: "", notas: "", creado: new Date().toISOString() };
            }

            const tc = T();
            const o = tc.objeto;
            const activos = Datos.activos();
            let activo = e.activo;

            if (o && !activo) {
                const datos = leerCampos(o.campos, raiz, "na_");
                const faltante = o.campos.find(c => c.requerido && (datos[c.id] === "" || datos[c.id] === undefined));
                if (faltante) { falla("Complete: " + faltante.etiqueta + "."); return; }
                const clave = o.clave ? String(datos[o.clave] || "") : "";
                const repetido = clave && activos.find(a => normalizar(etiquetaActivo(a)) === normalizar(clave));
                if (repetido && repetido.clienteId !== cliente.id) {
                    const duenio = Datos.cliente(repetido.clienteId);
                    falla(`${o.etiquetaClave || "Ese dato"} ${clave} ya está registrado a nombre de ${duenio ? duenio.nombre : "otro cliente"}.`);
                    return;
                }
                activo = repetido || { id: nuevoId(), clienteId: cliente.id, datos, creado: new Date().toISOString() };
                if (repetido) Object.assign(repetido.datos, datos);
            }

            const problema = $("#noProb", raiz).value.trim();
            if (!problema) { falla("Escriba " + tc.problema.toLowerCase() + "."); return; }

            const extra = leerCampos(tc.camposOrden || [], raiz, "no_");
            const faltaOrden = (tc.camposOrden || []).find(c => c.requerido && (extra[c.id] === "" || extra[c.id] === undefined));
            if (faltaOrden) { falla("Complete: " + faltaOrden.etiqueta + "."); return; }

            if (!e.cliente) { clientes.push(cliente); Datos.guardarClientes(clientes); }
            if (activo && !activos.includes(activo)) activos.push(activo);
            if (activo) Datos.guardarActivos(activos);

            const usuario = Sesion.usuario();
            const ordenes = Datos.ordenes();
            const orden = {
                id: nuevoId(),
                numero: Datos.siguienteNumero("orden"),
                fecha: new Date().toISOString(),
                clienteId: cliente.id,
                clienteNombre: cliente.nombre,
                tipo: e.tipo,
                activoId: activo ? activo.id : null,
                objetoTitulo: activo ? tituloActivo(activo) : (tc.texto || ""),
                etiqueta: activo ? etiquetaActivo(activo) : "",
                problema,
                diagnostico: "",
                estado: tc.estadoInicial || tc.estados[0].id,
                estados: [{ estado: tc.estadoInicial || tc.estados[0].id, fecha: new Date().toISOString(), usuario: usuario.nombre }],
                items: [],
                descuento: 0,
                abonos: [],
                extra,
                fechaPrometida: extra.fechaPrometida || "",
                usuarioId: usuario.id,
                usuarioNombre: usuario.nombre
            };

            ordenes.unshift(orden);
            if (!Datos.guardarOrdenes(ordenes)) return;

            cerrar();
            avisar(`${cfg.singular[0].toUpperCase() + cfg.singular.slice(1)} N° ${numeroOrden(orden)} ingresada.`);

            if (Datos.config().imprimirAuto) this.imprimir(orden, "ingreso");

            this.ver(orden.id, true);
        };

        pintar();
    },


    // ------------------------------------------
    // VER / EDITAR
    // ------------------------------------------
    ver(id, recienCreada = false) {

        const cfg = otCfg();
        let orden = Datos.orden(id);
        if (!orden) return;

        const guardar = cambio => {
            const lista = Datos.ordenes();
            const real = lista.find(x => x.id === id);
            cambio(real);
            Datos.guardarOrdenes(lista);
            orden = real;
        };

        const { raiz, cerrar } = abrirModal({
            titulo: `${cfg.singular[0].toUpperCase() + cfg.singular.slice(1)} N° ${numeroOrden(orden)}`,
            clase: "muy-ancho",
            html: '<div id="otCuerpo"></div>',
            alCerrar: () => { if (document.getElementById("vista")) App.refrescar(); },
            botones: [{ texto: "Cerrar", clase: "btn-primario" }]
        });

        let busquedaTexto = "";

        const pintar = () => {

            orden = Datos.orden(id);

            const t = totalOrden(orden);
            const e = estadoDe(orden);
            const cerrada = !ordenAbierta(orden);
            const cliente = Datos.cliente(orden.clienteId) || {};
            const activo = Datos.activo(orden.activoId);
            const tc = tipoCfg(orden.tipo);
            const o = tc.objeto || { nombre: tc.texto || "Detalle", etiquetaClave: "" };

            const filaDato = (k, v) => v !== undefined && v !== "" && v !== null ? `<div><div class="etiqueta">${esc(k)}</div><div class="dato">${esc(v)}</div></div>` : "";

            const items = (orden.items || []).map((i, n) => `
                <tr>
                    <td class="celda-titulo">${esc(i.nombre)}<div class="chico texto-3">${i.tipo === "mano" ? "Mano de obra / servicio" : "Repuesto / producto"}</div></td>
                    <td class="num">${cerrada ? i.cantidad : `<input type="number" min="1" step="1" data-cant="${n}" value="${i.cantidad}" style="width:64px;text-align:right">`}</td>
                    <td class="num">${cerrada ? dinero(i.precio) : `<input type="text" inputmode="numeric" data-precio="${n}" value="${numero(i.precio)}" style="width:96px;text-align:right">`}</td>
                    <td class="num negrita">${dinero(Math.round(i.precio * i.cantidad))}</td>
                    <td class="acciones">${cerrada ? "" : `<button type="button" class="btn btn-chico btn-icono" data-quitar="${n}" aria-label="Quitar">${icono("cerrar")}</button>`}</td>
                </tr>`).join("");

            $("#otCuerpo", raiz).innerHTML = `
                <div class="ficha-datos" style="margin-bottom:14px">
                    ${filaDato("Cliente", cliente.nombre)}${filaDato("Teléfono", cliente.telefono)}
                    ${filaDato(o.nombre, tituloActivo(activo) || orden.objetoTitulo)}${tc.objeto ? filaDato(o.etiquetaClave || "Dato", etiquetaActivo(activo)) : ""}
                    ${filaDato("Ingreso", fechaHora(orden.fecha))}${filaDato("Recibió", orden.usuarioNombre)}
                    ${(tc.camposOrden || []).map(c => filaDato(c.etiqueta, c.tipo === "fecha" && orden.extra && orden.extra[c.id] ? fechaCorta(orden.extra[c.id]) : orden.extra && orden.extra[c.id])).join("")}
                </div>

                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
                    <span class="badge ${e.clase || ""}" style="font-size:13px;padding:6px 12px">${esc(e.texto)}</span>
                    ${cerrada ? "" : `<label class="chico texto-2" for="otEstado">Cambiar estado:</label>
                    <select id="otEstado" style="width:auto">${tc.estados.filter(x => x.id !== cfg.estadoFinal).map(x => `<option value="${x.id}" ${x.id === orden.estado ? "selected" : ""}>${esc(x.texto)}</option>`).join("")}</select>
                    <label class="chico texto-2" for="otPrometida">Prometida:</label><input type="date" id="otPrometida" value="${esc(orden.fechaPrometida || "")}" style="width:auto">`}
                    ${orden.ventaId ? `<span class="chico texto-2">Entregada el ${fechaHora(orden.fechaEntrega)}${orden.garantiaHasta ? " · garantía hasta " + fechaCorta(orden.garantiaHasta) : ""}</span>` : ""}
                </div>

                <div class="rejilla rejilla-2" style="margin-bottom:14px">
                    <div class="campo"><label for="otProb">${esc(tc.problema)}</label><textarea id="otProb" rows="3" ${cerrada ? "disabled" : ""}>${esc(orden.problema)}</textarea></div>
                    <div class="campo"><label for="otDiag">${esc(tc.diagnostico || "Diagnóstico / trabajo realizado")}</label><textarea id="otDiag" rows="3" ${cerrada ? "disabled" : ""}>${esc(orden.diagnostico || "")}</textarea></div>
                </div>

                <h3 style="margin:6px 0 8px;font-size:15px">Repuestos y trabajos</h3>
                ${(orden.items || []).length ? `<div class="tarjeta" style="margin-bottom:10px"><table class="tabla"><thead><tr><th>Detalle</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th><th></th></tr></thead><tbody>${items}</tbody></table></div>` : '<p class="chico texto-3" style="margin-bottom:10px">Aún no hay repuestos ni mano de obra.</p>'}

                ${cerrada ? "" : `
                <div class="dos-columnas" style="gap:14px;margin-bottom:10px">
                    <div class="tarjeta" style="padding:12px">
                        <div class="negrita chico" style="margin-bottom:6px">Agregar repuesto o producto</div>
                        <div class="con-boton"><input id="otBuscaProd" placeholder="Buscar por nombre, código o compatibilidad" value="${esc(busquedaTexto)}" autocomplete="off"><button type="button" class="btn btn-icono" id="otEscanear" aria-label="Escanear">${icono("codigo")}</button></div>
                        <div id="otResProd" style="margin-top:6px"></div>
                    </div>
                    <div class="tarjeta" style="padding:12px">
                        <div class="negrita chico" style="margin-bottom:6px">Agregar mano de obra o servicio</div>
                        ${(cfg.manoObra || []).length ? `<div class="chips" style="margin-bottom:8px">${cfg.manoObra.map((m, k) => `<button type="button" class="chip" data-preset="${k}">${esc(m.nombre)} <span class="n">${dinero(m.precio)}</span></button>`).join("")}</div>` : ""}
                        <div class="con-boton"><input id="otMoNombre" placeholder="Descripción" autocomplete="off"><input id="otMoPrecio" placeholder="Valor" inputmode="numeric" style="width:110px;text-align:right"><button type="button" class="btn" id="otMoAgregar">Agregar</button></div>
                    </div>
                </div>`}

                <div style="display:grid;grid-template-columns:1fr minmax(260px,330px);gap:18px;align-items:start">
                    <div>
                        <h3 style="margin:6px 0 8px;font-size:15px">Abonos</h3>
                        ${(orden.abonos || []).length ? `<ul class="lista-simple">${orden.abonos.map(a => `<li><span>${fechaHora(a.fecha)} · ${esc((METODOS_PAGO[a.metodo] || {}).texto || a.metodo)}${a.nota ? " · " + esc(a.nota) : ""}</span><strong class="${a.monto < 0 ? "rojo" : ""}">${a.monto < 0 ? "−" : ""}${dinero(Math.abs(a.monto))}</strong></li>`).join("")}</ul>` : '<p class="chico texto-3">Sin abonos.</p>'}
                    </div>
                    <div>
                        <div class="linea-total"><span>Subtotal</span><span>${dinero(t.subtotal)}</span></div>
                        <div class="linea-total"><span>Descuento</span><span>${cerrada ? "-" + dinero(t.descuento) : `<input type="text" inputmode="numeric" id="otDesc" value="${t.descuento ? numero(t.descuento) : ""}" placeholder="0" style="width:90px;text-align:right">`}</span></div>
                        <div class="linea-total" style="font-size:18px;font-weight:700;color:var(--texto)"><span>Total</span><span>${dinero(t.total)}</span></div>
                        <div class="linea-total"><span>Abonado</span><span>${dinero(t.abonado)}</span></div>
                        ${orden.ventaId || orden.estado === "anulada" ? "" : `<div class="linea-total" style="font-weight:700;color:var(--texto)"><span>Saldo por cobrar</span><span class="${t.saldo > 0 ? "amarillo" : ""}">${dinero(t.saldo)}</span></div>`}
                    </div>
                </div>
                <div id="otError" class="mensaje-error oculto" style="margin-top:12px"></div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid var(--borde)">
                    ${cerrada ? "" : `<button class="btn" data-acc="abono">${icono("dinero")} Registrar abono</button>`}
                    <button class="btn" data-acc="imp-ingreso">${icono("impresora")} Comprobante de ingreso</button>
                    ${t.total ? `<button class="btn" data-acc="imp-presupuesto">${icono("impresora")} Presupuesto</button>` : ""}
                    ${orden.ventaId ? `<button class="btn" data-acc="imp-entrega">${icono("impresora")} Comprobante de entrega</button>` : ""}
                    ${!cerrada && Sesion.esAdmin() ? `<button class="btn btn-peligro" data-acc="anular">Anular</button>` : ""}
                    <span class="espacio"></span>
                    ${cerrada ? "" : `<button class="btn btn-exito btn-grande" data-acc="cobrar">${icono("check")} Cobrar y entregar</button>`}
                </div>
            `;

            if (recienCreada) { recienCreada = false; }
            mostrarProductos();
        };

        const aviso = texto => {
            const caja = $("#otError", raiz);
            if (caja) { caja.textContent = texto; caja.classList.remove("oculto"); }
            else avisar(texto, "error");
        };

        const mostrarProductos = () => {

            const cont = $("#otResProd", raiz);
            if (!cont) return;

            const palabras = normalizar(busquedaTexto).split(/\s+/).filter(Boolean);

            if (!palabras.length) { cont.innerHTML = ""; return; }

            const lista = Datos.productos()
                .filter(p => p.activo !== false)
                .filter(p => palabras.every(x => normalizar([p.nombre, p.marca, p.codigoBarras, p.categoria, typeof textoExtra === "function" ? textoExtra(p) : ""].join(" ")).includes(x)))
                .slice(0, 8);

            cont.innerHTML = lista.length ? `<div class="lista-busqueda">${lista.map(p => `<button type="button" data-prod="${p.id}"><div class="negrita">${esc(p.nombre)}</div><div class="chico texto-2">${dinero(p.precio)} · ${esc(textoStock(p))}${typeof textoExtra === "function" && textoExtra(p, true) ? " · " + esc(textoExtra(p, true)) : ""}</div></button>`).join("")}</div>` : '<p class="chico texto-2">No se encontró en el inventario.</p>';
        };

        const agregarRepuesto = productoId => {

            const productos = Datos.productos();
            const p = productos.find(x => x.id === productoId);
            if (!p) return;

            if (controlaStock(p) && Number(p.stock) < 1) { aviso("No hay stock de " + p.nombre + "."); return; }

            if (controlaStock(p)) {
                descontarStock(productos, p.id, 1);
                Datos.guardarProductos(productos);
                Datos.registrarMovimiento({ tipo: "baja", productoId: p.id, producto: p.nombre, unidades: -1, detalle: `${cfg.singular} N° ${numeroOrden(orden)}` });
            }

            guardar(x => {
                const ya = x.items.find(i => i.productoId === p.id);
                if (ya) ya.cantidad += 1;
                else x.items.push({ id: nuevoId(), productoId: p.id, nombre: p.nombre, categoria: p.categoria || "", cantidad: 1, precio: Number(p.precio) || 0, costo: Number(p.costo) || 0, tipo: "repuesto" });
            });

            busquedaTexto = "";
            pintar();
        };

        const agregarMano = (nombre, precio) => {
            if (!nombre) return;
            guardar(x => x.items.push({ id: nuevoId(), productoId: null, nombre, categoria: "Mano de obra", cantidad: 1, precio: Math.max(0, aEntero(precio)), costo: 0, tipo: "mano" }));
            pintar();
        };

        raiz.addEventListener("input", ev => {
            if (ev.target.id === "otBuscaProd") { busquedaTexto = ev.target.value; mostrarProductos(); }
            if (ev.target.dataset.precio !== undefined || ev.target.id === "otDesc" || ev.target.id === "otMoPrecio") {
                ev.target.value = ev.target.value.trim() ? numero(aEntero(ev.target.value)) : "";
            }
        });

        raiz.addEventListener("change", ev => {

            const el = ev.target;

            if (el.id === "otEstado") {
                guardar(x => { x.estado = el.value; x.estados.push({ estado: el.value, fecha: new Date().toISOString(), usuario: Sesion.nombre() }); });
                avisar("Estado actualizado.");
                pintar();
            } else if (el.id === "otPrometida") {
                guardar(x => { x.fechaPrometida = el.value; });
            } else if (el.id === "otProb") {
                guardar(x => { x.problema = el.value.trim(); });
            } else if (el.id === "otDiag") {
                guardar(x => { x.diagnostico = el.value.trim(); });
            } else if (el.id === "otDesc") {
                guardar(x => { x.descuento = aEntero(el.value); });
                pintar();
            } else if (el.dataset.precio !== undefined) {
                guardar(x => { x.items[Number(el.dataset.precio)].precio = aEntero(el.value); });
                pintar();
            } else if (el.dataset.cant !== undefined) {
                const n = Number(el.dataset.cant);
                const nueva = Math.max(1, Math.floor(Number(el.value) || 1));
                const item = Datos.orden(id).items[n];
                const dif = nueva - item.cantidad;

                if (item.productoId && dif !== 0) {
                    const productos = Datos.productos();
                    const p = productos.find(x => x.id === item.productoId);
                    if (p && controlaStock(p)) {
                        if (dif > 0 && Number(p.stock) < dif) { aviso("No alcanza el stock de " + p.nombre + "."); pintar(); return; }
                        if (dif > 0) descontarStock(productos, p.id, dif); else devolverStock(productos, p.id, -dif);
                        Datos.guardarProductos(productos);
                        Datos.registrarMovimiento({ tipo: dif > 0 ? "baja" : "ingreso", productoId: p.id, producto: p.nombre, unidades: -dif, detalle: `${cfg.singular} N° ${numeroOrden(orden)}` });
                    }
                }

                guardar(x => { x.items[n].cantidad = nueva; });
                pintar();
            }
        });

        raiz.addEventListener("click", async ev => {

            const b = ev.target.closest("button");
            if (!b) return;

            if (b.dataset.prod) { agregarRepuesto(b.dataset.prod); return; }

            if (b.dataset.preset !== undefined) { const m = cfg.manoObra[Number(b.dataset.preset)]; agregarMano(m.nombre, m.precio); return; }

            if (b.id === "otMoAgregar") {
                const nombre = $("#otMoNombre", raiz).value.trim();
                if (!nombre) { aviso("Escriba la descripción del trabajo."); return; }
                agregarMano(nombre, $("#otMoPrecio", raiz).value);
                return;
            }

            if (b.id === "otEscanear") {
                const codigo = await escanearCodigo();
                if (codigo) { busquedaTexto = codigo; $("#otBuscaProd", raiz).value = codigo; mostrarProductos(); const unico = Datos.productos().filter(p => p.codigoBarras === codigo); if (unico.length === 1) agregarRepuesto(unico[0].id); }
                return;
            }

            if (b.dataset.quitar !== undefined) {
                const n = Number(b.dataset.quitar);
                const item = Datos.orden(id).items[n];
                if (item.productoId) {
                    const productos = Datos.productos();
                    devolverStock(productos, item.productoId, item.cantidad);
                    Datos.guardarProductos(productos);
                    Datos.registrarMovimiento({ tipo: "ingreso", productoId: item.productoId, producto: item.nombre, unidades: item.cantidad, detalle: `Devuelto de ${cfg.singular} N° ${numeroOrden(orden)}` });
                }
                guardar(x => x.items.splice(n, 1));
                pintar();
                return;
            }

            const acc = b.dataset.acc;

            if (acc === "imp-ingreso") this.imprimir(Datos.orden(id), "ingreso");
            if (acc === "imp-presupuesto") this.imprimir(Datos.orden(id), "presupuesto");
            if (acc === "imp-entrega") this.imprimir(Datos.orden(id), "entrega");
            if (acc === "abono") this.abonar(id, pintar);
            if (acc === "cobrar") { const hecho = await this.cobrar(id); if (hecho) { cerrar(); } }
            if (acc === "anular") { const hecho = await this.anular(id); if (hecho) cerrar(); }
        });

        pintar();
    },


    // ------------------------------------------
    // ABONOS
    // ------------------------------------------
    abonar(id, despues) {

        const orden = Datos.orden(id);
        const t = totalOrden(orden);
        const caja = Datos.cajaActual();

        if (!caja) { avisar("Abra la caja para recibir un abono.", "error"); return; }

        let metodo = "efectivo";

        abrirModal({
            titulo: "Registrar abono",
            clase: "angosto",
            html: `
                <p class="texto-2" style="margin-bottom:10px">Total ${dinero(t.total)} · Abonado ${dinero(t.abonado)} · Saldo <strong>${dinero(t.saldo)}</strong></p>
                <div class="campo"><label for="abMonto">Monto del abono</label><input id="abMonto" inputmode="numeric" style="height:46px;font-size:20px;font-weight:700;text-align:right" value="${t.saldo > 0 ? numero(t.saldo) : ""}"></div>
                <div class="metodos-pago" id="abMetodos" style="margin-top:12px">${Object.entries(METODOS_PAGO).map(([k, m]) => `<button type="button" class="metodo ${k === metodo ? "activo" : ""}" data-metodo="${k}">${icono(m.icono)} ${m.texto}</button>`).join("")}</div>
                <div class="campo" style="margin-top:12px"><label for="abNota">Nota (opcional)</label><input id="abNota" placeholder="Ej: para comprar repuestos"></div>
                <div id="abError" class="mensaje-error oculto" style="margin-top:12px"></div>
            `,
            alAbrir: raiz => {
                $("#abMonto", raiz).addEventListener("input", e => { e.target.value = e.target.value.trim() ? numero(aEntero(e.target.value)) : ""; });
                $("#abMetodos", raiz).addEventListener("click", e => {
                    const bt = e.target.closest("[data-metodo]");
                    if (!bt) return;
                    metodo = bt.dataset.metodo;
                    $$(".metodo", raiz).forEach(x => x.classList.toggle("activo", x === bt));
                });
                $("#abMonto", raiz).focus();
            },
            botones: [
                { texto: "Cancelar" },
                {
                    texto: "Guardar abono",
                    clase: "btn-primario",
                    accion: (cerrar, raiz) => {
                        const monto = aEntero($("#abMonto", raiz).value);
                        const error = $("#abError", raiz);
                        if (monto <= 0) { error.textContent = "Escriba el monto."; error.classList.remove("oculto"); return; }
                        const tt = totalOrden(Datos.orden(id));
                        if (tt.total > 0 && monto > tt.saldo) { error.textContent = "El abono no puede ser mayor que el saldo (" + dinero(tt.saldo) + ")."; error.classList.remove("oculto"); return; }
                        const lista = Datos.ordenes();
                        const real = lista.find(x => x.id === id);
                        real.abonos.push({ id: nuevoId(), fecha: new Date().toISOString(), monto, metodo, cajaId: Datos.cajaActual().id, usuarioNombre: Sesion.nombre(), nota: $("#abNota", raiz).value.trim() });
                        Datos.guardarOrdenes(lista);
                        cerrar();
                        avisar("Abono registrado.");
                        if (despues) despues();
                    }
                }
            ]
        });
    },


    // ------------------------------------------
    // COBRAR Y ENTREGAR
    // ------------------------------------------
    async cobrar(id) {

        const cfg = otCfg();
        const orden = Datos.orden(id);
        const t = totalOrden(orden);
        const caja = Datos.cajaActual();

        if (!orden.items.length) { avisar("Agregue al menos un repuesto o trabajo antes de cobrar.", "error"); return false; }
        if (!caja) { avisar("Abra la caja para cobrar.", "error"); return false; }

        let pago = { metodo: (orden.abonos[orden.abonos.length - 1] || {}).metodo || "efectivo", recibido: 0, vuelto: 0 };

        if (t.saldo > 0) {
            pago = await pedirPago(t.saldo, { titulo: "Cobrar saldo", boton: "Cobrar y entregar" });
            if (!pago) return false;
        } else if (!(await confirmar({ titulo: "Entregar", mensaje: `El total (${dinero(t.total)}) ya está pagado con abonos. ¿Registrar la entrega?`, textoSi: "Entregar" }))) {
            return false;
        }

        const usuario = Sesion.usuario();

        const venta = {
            id: nuevoId(),
            numero: Datos.siguienteNumero("venta"),
            fecha: new Date().toISOString(),
            items: orden.items.map(i => ({
                productoId: i.productoId, nombre: i.nombre, categoria: i.categoria || "", cantidad: i.cantidad, precio: i.precio,
                subtotal: Math.round(i.precio * i.cantidad), costo: Math.round((i.costo || 0) * i.cantidad)
            })),
            subtotal: t.subtotal,
            descuento: t.descuento,
            iva: 0,
            total: t.total,
            metodo: pago.metodo,
            recibido: t.saldo > 0 ? pago.recibido : t.total,
            vuelto: pago.vuelto || 0,
            abonoPrevio: t.abonado,
            clienteNombre: orden.clienteNombre,
            usuarioId: usuario.id,
            usuarioNombre: usuario.nombre,
            cajaId: caja.id,
            estado: "valida",
            ordenId: orden.id,
            ordenNumero: orden.numero
        };

        const ventas = Datos.ventas();
        ventas.unshift(venta);
        if (!Datos.guardarVentas(ventas)) return false;

        const lista = Datos.ordenes();
        const real = lista.find(x => x.id === id);
        const ahora = new Date().toISOString();

        real.estado = cfg.estadoFinal;
        real.estados.push({ estado: cfg.estadoFinal, fecha: ahora, usuario: usuario.nombre });
        real.ventaId = venta.id;
        real.fechaEntrega = ahora;
        const garantia = tipoCfg(real.tipo).garantiaDias;
        if (garantia) real.garantiaHasta = sumarDias(hoyISO(), garantia);
        Datos.guardarOrdenes(lista);

        // próxima mantención (taller)
        if (cfg.recordatorio) {
            const activos = Datos.activos();
            const a = activos.find(x => x.id === real.activoId);
            if (a) {
                const km = Number((real.extra || {}).kmIngreso) || Number((a.datos || {}).km) || 0;
                a.proxima = { fecha: sumarDias(hoyISO(), cfg.recordatorio.dias || 180), km: km && cfg.recordatorio.km ? km + cfg.recordatorio.km : 0, orden: real.numero };
                if (km) a.datos.km = km;
                Datos.guardarActivos(activos);
            }
        }

        abrirModal({
            titulo: "Entrega registrada",
            clase: "angosto",
            html: `<div class="venta-lista-exito"><div class="circulo">${icono("check")}</div>
                <div class="texto-2">${cfg.singular[0].toUpperCase() + cfg.singular.slice(1)} N° ${numeroOrden(real)} entregada</div>
                <div style="font-size:26px;font-weight:800;margin:4px 0">${dinero(t.total)}</div>
                <div class="texto-2">${t.saldo > 0 ? "Cobrado hoy: " + dinero(t.saldo) + " · " + esc(METODOS_PAGO[pago.metodo].texto) : "Pagado con abonos"}${t.abonado ? " · abonos " + dinero(t.abonado) : ""}</div>
                ${pago.metodo === "efectivo" && t.saldo > 0 ? `<div class="vuelto" style="margin-top:14px"><span>Vuelto</span><span>${dinero(pago.vuelto || 0)}</span></div>` : ""}
                ${real.garantiaHasta ? `<div class="chico texto-2" style="margin-top:10px">Garantía hasta el ${fechaCorta(real.garantiaHasta)}</div>` : ""}</div>`,
            alCerrar: () => App.refrescar(),
            botones: [
                { texto: "Boleta", icono: "impresora", accion: () => Impresion.boleta(venta) },
                { texto: "Comprobante de entrega", icono: "impresora", accion: () => this.imprimir(real, "entrega") },
                { texto: "Listo", clase: "btn-primario" }
            ]
        });

        if (Datos.config().imprimirAuto) this.imprimir(real, "entrega");

        return true;
    },


    // ------------------------------------------
    // ANULAR
    // ------------------------------------------
    async anular(id) {

        const cfg = otCfg();
        const orden = Datos.orden(id);
        const t = totalOrden(orden);
        const caja = Datos.cajaActual();

        if (t.abonado > 0 && !caja) { avisar("Abra la caja para devolver los abonos antes de anular.", "error"); return false; }

        const motivo = await pedirTexto({
            titulo: `Anular ${cfg.singular} N° ${numeroOrden(orden)}`,
            mensaje: `Los repuestos vuelven al inventario${t.abonado ? " y se devuelven los abonos (" + dinero(t.abonado) + ")" : ""}.`,
            etiqueta: "Motivo", opciones: ["El cliente no aprobó el presupuesto", "El cliente se arrepintió", "Error al ingresar", "Otro"], textoSi: "Anular", peligro: true
        });

        if (!motivo) return false;

        const productos = Datos.productos();
        orden.items.forEach(i => { if (i.productoId) { devolverStock(productos, i.productoId, i.cantidad); Datos.registrarMovimiento({ tipo: "ingreso", productoId: i.productoId, producto: i.nombre, unidades: i.cantidad, detalle: `${cfg.singular} N° ${numeroOrden(orden)} anulada` }); } });
        Datos.guardarProductos(productos);

        const lista = Datos.ordenes();
        const real = lista.find(x => x.id === id);

        // devolución de los abonos: queda como movimiento negativo en la caja de hoy
        Object.entries((real.abonos || []).reduce((m, a) => { m[a.metodo] = (m[a.metodo] || 0) + a.monto; return m; }, {})).forEach(([metodo, monto]) => {
            if (monto > 0) real.abonos.push({ id: nuevoId(), fecha: new Date().toISOString(), monto: -monto, metodo, cajaId: caja.id, usuarioNombre: Sesion.nombre(), nota: "Devolución por anulación" });
        });

        real.estado = "anulada";
        real.estados.push({ estado: "anulada", fecha: new Date().toISOString(), usuario: Sesion.nombre(), motivo });
        Datos.guardarOrdenes(lista);

        avisar(cfg.singular[0].toUpperCase() + cfg.singular.slice(1) + " anulada.");

        return true;
    },


    // ------------------------------------------
    // IMPRESIÓN
    // ------------------------------------------
    imprimir(orden, modo) {

        const cfg = otCfg();
        const config = Datos.config();
        const t = totalOrden(orden);
        const cliente = Datos.cliente(orden.clienteId) || {};
        const activo = Datos.activo(orden.activoId);
        const tc = tipoCfg(orden.tipo);
        const o = tc.objeto || { campos: [] };
        const titulos = { ingreso: "COMPROBANTE DE INGRESO", presupuesto: "PRESUPUESTO", entrega: "COMPROBANTE DE ENTREGA" };

        const datosObj = (o.campos || []).map(c => activo && activo.datos && activo.datos[c.id] ? `<tr><td>${esc(c.etiqueta)}</td><td class="d">${esc(activo.datos[c.id])}</td></tr>` : "").join("");
        const datosOrden = (tc.camposOrden || []).map(c => orden.extra && orden.extra[c.id] ? `<tr><td>${esc(c.etiqueta)}</td><td class="d">${esc(c.tipo === "fecha" ? fechaCorta(orden.extra[c.id]) : orden.extra[c.id])}</td></tr>` : "").join("");

        const cuerpo = `
            ${Impresion.cabecera(config)}
            <hr>
            <div class="centro titulo">${titulos[modo]}</div>
            <div class="centro">N° ${numeroOrden(orden)}</div>
            <div class="centro peq">${fechaHora(orden.fecha)} · Recibió: ${esc(orden.usuarioNombre)}</div>
            ${orden.estado === "anulada" ? '<div class="centro titulo">*** ANULADA ***</div>' : ""}
            <hr>
            <table>
                <tr><td>Cliente</td><td class="d">${esc(orden.clienteNombre || "")}</td></tr>
                ${cliente.telefono ? `<tr><td>Teléfono</td><td class="d">${esc(cliente.telefono)}</td></tr>` : ""}
                ${datosObj}${datosOrden}
            </table>
            <hr>
            <div class="peq"><strong>${esc(tc.problema)}:</strong><br>${esc(orden.problema)}</div>
            ${modo === "entrega" && orden.diagnostico ? `<div class="peq" style="margin-top:4px"><strong>Trabajo realizado:</strong><br>${esc(orden.diagnostico)}</div>` : ""}
            ${modo !== "ingreso" || orden.items.length ? `
            <hr>
            <table>
                ${orden.items.map(i => `<tr><td colspan="2">${esc(i.nombre)}</td></tr><tr><td class="peq">&nbsp;${i.cantidad} x ${dinero(i.precio)}</td><td class="d">${dinero(Math.round(i.precio * i.cantidad))}</td></tr>`).join("")}
            </table>
            <hr>
            <table>
                ${t.descuento ? `<tr><td>Subtotal</td><td class="d">${dinero(t.subtotal)}</td></tr><tr><td>Descuento</td><td class="d">-${dinero(t.descuento)}</td></tr>` : ""}
                <tr><td>Neto</td><td class="d">${dinero(t.total - Math.round(t.total - t.total / 1.19))}</td></tr><tr><td>IVA (19%)</td><td class="d">${dinero(Math.round(t.total - t.total / 1.19))}</td></tr>
                <tr class="total"><td>TOTAL</td><td class="d">${dinero(t.total)}</td></tr>
                ${t.abonado ? `<tr><td>Abonado</td><td class="d">${dinero(t.abonado)}</td></tr><tr><td>Saldo</td><td class="d">${dinero(t.saldo)}</td></tr>` : ""}
            </table>` : ""}
            ${modo === "entrega" && orden.garantiaHasta ? `<hr><div class="centro titulo">GARANTÍA hasta el ${fechaCorta(orden.garantiaHasta)}</div><div class="peq centro">${esc(cfg.textoGarantia || "La garantía cubre el trabajo y los repuestos instalados. No cubre mal uso.")}</div>` : ""}
            ${modo === "ingreso" ? `<hr><div class="peq">${esc(cfg.condiciones || "Los equipos no retirados en 30 días podrán ser considerados abandonados.")}</div><br><br><div class="centro">______________________</div><div class="centro peq">Firma del cliente</div>` : ""}
            <hr>
            <div class="centro peq">Documento interno, no válido como boleta</div>
        `;

        imprimirHTML(Impresion.ticket(cuerpo, config.anchoPapel));
    },


    // ------------------------------------------
    // INICIO
    // ------------------------------------------
    resumenInicio() {

        const cfg = otCfg();
        const abiertas = Datos.ordenes().filter(ordenAbierta);
        const listas = abiertas.filter(o => o.estado === cfg.estadoLista).length;
        const hoy = hoyISO();
        const atrasadas = abiertas.filter(o => o.fechaPrometida && o.fechaPrometida < hoy).length;
        const mant = cfg.recordatorio ? Datos.activos().filter(a => a.proxima && a.proxima.fecha && a.proxima.fecha <= sumarDias(hoy, 30)).length : 0;

        return `
            <div class="kpis" style="margin-bottom:18px">
                <a class="kpi" href="#ordenes" style="text-decoration:none;color:inherit"><div class="kpi-icono">${icono("herramienta")}</div>
                    <div><div class="etiqueta">${esc(cfg.titulo)} abiertas</div><div class="valor">${abiertas.length}</div><div class="detalle">En proceso</div></div></a>
                <a class="kpi" href="#ordenes" style="text-decoration:none;color:inherit" onclick="Ordenes.filtro='${cfg.estadoLista}'"><div class="kpi-icono verde">${icono("check")}</div>
                    <div><div class="etiqueta">Listas para entregar</div><div class="valor">${listas}</div><div class="detalle">Avise al cliente</div></div></a>
                <a class="kpi" href="#ordenes" style="text-decoration:none;color:inherit"><div class="kpi-icono ${atrasadas ? "rojo" : "verde"}">${icono("alerta")}</div>
                    <div><div class="etiqueta">Atrasadas</div><div class="valor">${atrasadas}</div><div class="detalle">Pasaron su fecha prometida</div></div></a>
                ${cfg.recordatorio ? `<a class="kpi" href="#ordenes" style="text-decoration:none;color:inherit" onclick="Ordenes.vistaMantencion=true"><div class="kpi-icono amarillo">${icono("calendario")}</div>
                    <div><div class="etiqueta">Mantenciones por avisar</div><div class="valor">${mant}</div><div class="detalle">Próximos 30 días</div></div></a>` : ""}
            </div>`;
    }
};


Modulos.ordenes = {
    titulo: (window.RUBRO && RUBRO.ordenes && RUBRO.ordenes.menu) || "Órdenes",
    icono: "herramienta",
    roles: ["admin", "vendedor"],
    render: vista => Ordenes.render(vista)
};
