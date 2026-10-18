// ==========================================
// CLIENTES
// Ficha del cliente, sus vehículos / equipos / piezas y su historial
// ==========================================

"use strict";

Object.assign(Datos, {
    clientes: () => DB.leer("clientes", []),
    guardarClientes: valor => DB.guardar("clientes", valor),
    activos: () => DB.leer("activos", []),
    guardarActivos: valor => DB.guardar("activos", valor),
    cliente(id) { return this.clientes().find(c => c.id === id) || null; },
    activo(id) { return this.activos().find(a => a.id === id) || null; }
});


function objetoCfg() {
    return (window.RUBRO && RUBRO.ordenes && RUBRO.ordenes.objeto) || { nombre: "Equipo", plural: "Equipos", campos: [], titulo: a => "" };
}


function tituloActivo(a) {
    if (!a) return "";
    const o = objetoCfg();
    try { return o.titulo ? o.titulo(a.datos || {}) : ""; } catch (e) { return ""; }
}


function etiquetaActivo(a) {
    const o = objetoCfg();
    return a && a.datos && o.clave ? String(a.datos[o.clave] || "") : "";
}


function telefonoWhatsApp(texto) {
    const d = String(texto || "").replace(/\D/g, "");
    if (!d) return "";
    if (d.length === 9 && d.startsWith("9")) return "56" + d;
    if (d.length === 8) return "569" + d;
    return d;
}


// Campos de un formulario generado a partir de la configuración
function camposFormHTML(campos, valores, prefijo) {
    return campos.map(c => {
        const id = prefijo + c.id;
        const v = valores && valores[c.id] !== undefined && valores[c.id] !== null ? valores[c.id] : "";
        const ancho = c.ancho === 2 ? ' style="grid-column:span 2"' : "";
        const req = c.requerido ? " requerido" : "";
        if (c.tipo === "opcion") {
            return `<div class="campo"${ancho}><label class="${req.trim()}" for="${id}">${esc(c.etiqueta)}</label><select id="${id}"><option value="">—</option>${(c.opciones || []).map(o => `<option ${String(o) === String(v) ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`;
        }
        if (c.tipo === "textarea") {
            return `<div class="campo col-todo"><label class="${req.trim()}" for="${id}">${esc(c.etiqueta)}</label><textarea id="${id}" rows="2" placeholder="${esc(c.placeholder || "")}">${esc(v)}</textarea></div>`;
        }
        const tipo = c.tipo === "fecha" ? 'type="date"' : c.tipo === "numero" ? 'type="text" inputmode="decimal"' : "";
        return `<div class="campo"${ancho}><label class="${req.trim()}" for="${id}">${esc(c.etiqueta)}</label><input id="${id}" ${tipo} value="${esc(v)}" placeholder="${esc(c.placeholder || "")}" ${c.mayus ? 'style="text-transform:uppercase"' : ""} autocomplete="off"></div>`;
    }).join("");
}


function leerCampos(campos, raiz, prefijo) {
    const datos = {};
    campos.forEach(c => {
        const el = $("#" + prefijo + c.id, raiz);
        if (!el) return;
        let t = el.value.trim();
        if (c.mayus) t = t.toUpperCase();
        datos[c.id] = c.tipo === "numero" ? (t === "" ? "" : Number(t.replace(/\./g, "").replace(",", ".")) || 0) : t;
    });
    return datos;
}


const Clientes = {

    texto: "",


    render(vista) {

        vista.innerHTML = `
            <div class="cabecera-vista">
                <div><h1>Clientes</h1><p class="sub">Sus datos, ${esc(objetoCfg().plural.toLowerCase())} e historial de trabajos.</p></div>
                <button class="btn btn-primario btn-grande" id="clNuevo">${icono("mas")} Nuevo cliente</button>
            </div>
            <div class="tarjeta">
                <div class="barra-herramientas"><div class="buscar" style="flex:1;position:relative">${icono("buscar")}<input id="clBuscar" placeholder="Buscar por nombre, teléfono, RUT o ${esc((objetoCfg().etiquetaClave || "dato").toLowerCase())}" value="${esc(this.texto)}"></div></div>
                <div id="clTabla"></div>
            </div>
        `;

        $("#clBuscar").addEventListener("input", e => { this.texto = e.target.value; this.pintar(); });
        $("#clNuevo").addEventListener("click", () => this.ficha(null));
        $("#clTabla").addEventListener("click", e => {
            const b = e.target.closest("[data-id]");
            if (b) this.ficha(b.dataset.id);
        });

        this.pintar();
    },


    buscar(texto) {

        const palabras = normalizar(texto).split(/\s+/).filter(Boolean);
        const activos = Datos.activos();

        return Datos.clientes().filter(c => {
            const base = normalizar([c.nombre, c.telefono, c.rut, c.correo, activos.filter(a => a.clienteId === c.id).map(a => etiquetaActivo(a) + " " + tituloActivo(a)).join(" ")].join(" "));
            return palabras.every(p => base.includes(p));
        });
    },


    pintar() {

        const lista = this.buscar(this.texto).sort((a, b) => a.nombre.localeCompare(b.nombre));
        const ordenes = (Datos.ordenes ? Datos.ordenes() : []);
        const activos = Datos.activos();

        if (!lista.length) {
            $("#clTabla").innerHTML = vacioHTML("usuarios", Datos.clientes().length ? "Sin resultados" : "Aún no hay clientes", "Los clientes se crean al ingresar una orden, o con el botón «Nuevo cliente».");
            return;
        }

        $("#clTabla").innerHTML = `
            <div class="tabla-contenedor"><table class="tabla">
                <thead><tr><th>Cliente</th><th>Teléfono</th><th>${esc(objetoCfg().plural)}</th><th class="num">Órdenes</th><th></th></tr></thead>
                <tbody>${lista.slice(0, 300).map(c => {
                    const mios = activos.filter(a => a.clienteId === c.id);
                    return `<tr>
                        <td><div class="celda-titulo">${esc(c.nombre)}</div><div class="celda-sub">${esc(c.rut || "")}</div></td>
                        <td class="nowrap">${esc(c.telefono || "—")}</td>
                        <td style="max-width:280px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(mios.map(a => etiquetaActivo(a) || tituloActivo(a)).join(", ") || "—")}</div></td>
                        <td class="num">${ordenes.filter(o => o.clienteId === c.id).length}</td>
                        <td class="acciones"><button class="btn btn-chico" data-id="${c.id}">${icono("ojo")} Ver</button></td>
                    </tr>`;
                }).join("")}</tbody>
            </table></div>
            <div class="pie-tabla"><span>${plural(lista.length, "cliente", "clientes")}</span></div>`;
    },


    // Ficha (crear o editar)
    ficha(id, alGuardar) {

        const c = id ? Datos.cliente(id) : { nombre: "", telefono: "", rut: "", correo: "", direccion: "", notas: "" };
        const o = objetoCfg();
        const misActivos = id ? Datos.activos().filter(a => a.clienteId === id) : [];
        const misOrdenes = id && Datos.ordenes ? Datos.ordenes().filter(x => x.clienteId === id).sort((a, b) => b.fecha.localeCompare(a.fecha)) : [];
        const gastado = misOrdenes.filter(x => x.ventaId).reduce((s, x) => s + totalOrden(x).total, 0);

        abrirModal({
            titulo: id ? "Cliente · " + c.nombre : "Nuevo cliente",
            clase: "ancho",
            html: `
                <div class="rejilla rejilla-2">
                    <div class="campo"><label class="requerido" for="cfNom">Nombre</label><input id="cfNom" value="${esc(c.nombre)}" autocomplete="off"></div>
                    <div class="campo"><label for="cfTel">Teléfono / WhatsApp</label><input id="cfTel" value="${esc(c.telefono)}" inputmode="tel" placeholder="9 1234 5678"></div>
                    <div class="campo"><label for="cfRut">RUT</label><input id="cfRut" value="${esc(c.rut)}" placeholder="12.345.678-9"></div>
                    <div class="campo"><label for="cfCorreo">Correo</label><input id="cfCorreo" type="email" value="${esc(c.correo)}"></div>
                    <div class="campo col-todo"><label for="cfDir">Dirección</label><input id="cfDir" value="${esc(c.direccion)}"></div>
                    <div class="campo col-todo"><label for="cfNotas">Notas</label><input id="cfNotas" value="${esc(c.notas)}" placeholder="Preferencias, advertencias…"></div>
                    <div id="cfError" class="mensaje-error col-todo oculto"></div>
                </div>
                ${id ? `
                    <h3 style="margin:18px 0 8px;font-size:15px">${esc(o.plural)} (${misActivos.length})</h3>
                    ${misActivos.length ? `<ul class="lista-simple">${misActivos.map(a => `<li><span><strong>${esc(etiquetaActivo(a) || "—")}</strong> <span class="texto-2">${esc(tituloActivo(a))}</span></span><span class="chico texto-3">${misOrdenes.filter(x => x.activoId === a.id).length} órdenes</span></li>`).join("")}</ul>` : '<p class="chico texto-3">Aún no tiene.</p>'}
                    <h3 style="margin:18px 0 8px;font-size:15px">Historial (${misOrdenes.length}${gastado ? " · " + dinero(gastado) + " en trabajos entregados" : ""})</h3>
                    ${misOrdenes.length ? `<ul class="lista-simple">${misOrdenes.slice(0, 12).map(x => `<li><span><strong>N° ${String(x.numero).padStart(5, "0")}</strong> · ${fechaCorta(x.fecha)} <span class="texto-2">${esc(x.objetoTitulo || "")}</span></span><span class="badge ${(estadoDe(x) || {}).clase || ""}">${esc((estadoDe(x) || {}).texto || x.estado)}</span></li>`).join("")}</ul>` : '<p class="chico texto-3">Sin órdenes todavía.</p>'}
                ` : ""}
            `,
            botones: [
                ...(id && c.telefono ? [{ texto: "WhatsApp", icono: "chat", accion: () => window.open("https://wa.me/" + telefonoWhatsApp(c.telefono), "_blank") }] : []),
                ...(id && typeof Ordenes !== "undefined" ? [{ texto: "Nueva orden", accion: cerrar => { cerrar(); Ordenes.nueva({ clienteId: id }); } }] : []),
                { texto: "Cancelar" },
                {
                    texto: "Guardar",
                    clase: "btn-primario",
                    accion: (cerrar, raiz) => {

                        const error = $("#cfError", raiz);
                        const datos = { nombre: $("#cfNom", raiz).value.trim(), telefono: $("#cfTel", raiz).value.trim(), rut: $("#cfRut", raiz).value.trim(), correo: $("#cfCorreo", raiz).value.trim(), direccion: $("#cfDir", raiz).value.trim(), notas: $("#cfNotas", raiz).value.trim() };

                        if (!datos.nombre) { error.textContent = "Escriba el nombre del cliente."; error.classList.remove("oculto"); return; }

                        const lista = Datos.clientes();

                        if (id) Object.assign(lista.find(x => x.id === id), datos);
                        else lista.push(Object.assign({ id: nuevoId(), creado: new Date().toISOString() }, datos));

                        Datos.guardarClientes(lista);
                        cerrar();
                        avisar("Cliente guardado.");
                        if (alGuardar) alGuardar(); else App.refrescar();
                    }
                }
            ]
        });
    }
};


Modulos.clientes = {
    titulo: "Clientes",
    icono: "usuarios",
    roles: ["admin", "vendedor"],
    render: vista => Clientes.render(vista)
};
