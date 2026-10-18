// ==========================================
// PRODUCTOS (genérico para todos los rubros)
// Catálogo con categorías, precio, costo, stock, foto, importación desde Excel
// y campos propios del rubro (RUBRO.camposProducto).
// ==========================================

"use strict";

// Campos propios del rubro: [{ id, etiqueta, tipo: "texto" | "numero" | "opcion", opciones: [], placeholder, enLista }]
function camposExtra() {
    return (window.RUBRO && RUBRO.camposProducto) || [];
}


// Texto con todos los datos propios del producto (para buscar y para mostrar en la lista)
function textoExtra(p, soloLista) {
    return camposExtra()
        .filter(c => !soloLista || c.enLista)
        .map(c => p[c.id] !== undefined && p[c.id] !== "" && p[c.id] !== null ? (c.sufijo ? p[c.id] + " " + c.sufijo : p[c.id]) : "")
        .filter(Boolean)
        .join(" · ");
}


const Productos = {

    texto: "",
    categoria: "",
    estado: "activos",


    render(vista) {

        const esAdmin = Sesion.esAdmin();

        vista.innerHTML = `
            <div class="tarjeta">
                <div class="barra-herramientas">
                    <div class="con-boton" style="flex:1;min-width:220px">
                        <div class="buscar" style="flex:1;position:relative">${icono("buscar")}<input id="prBuscar" placeholder="Buscar por nombre, marca, compatibilidad o código" value="${esc(this.texto)}"></div>
                        <button type="button" class="btn btn-icono" id="prEscanear" title="Escanear" aria-label="Escanear código">${icono("codigo")}</button>
                    </div>
                    <select id="prEstado" aria-label="Estado" style="width:auto">
                        <option value="activos" ${this.estado === "activos" ? "selected" : ""}>Activos</option>
                        <option value="bajo" ${this.estado === "bajo" ? "selected" : ""}>Stock bajo</option>
                        <option value="sin" ${this.estado === "sin" ? "selected" : ""}>Sin stock</option>
                        <option value="inactivos" ${this.estado === "inactivos" ? "selected" : ""}>Desactivados</option>
                    </select>
                    ${esAdmin ? `
                        <button class="btn" id="prImportar">${icono("subir")} Importar</button>
                        <button class="btn" id="prExportar">${icono("descargar")} Exportar</button>
                        <button class="btn btn-primario" id="prNuevo">${icono("mas")} Nuevo producto</button>` : ""}
                </div>
                <div class="barra-herramientas" style="padding-top:0"><div class="chips" id="prCategorias"></div></div>
                <div id="prTabla"></div>
            </div>
        `;

        $("#prBuscar").addEventListener("input", e => { this.texto = e.target.value; this.pintar(); });
        $("#prEstado").addEventListener("change", e => { this.estado = e.target.value; this.pintar(); });

        $("#prEscanear").addEventListener("click", async () => {
            const codigo = await escanearCodigo();
            if (!codigo) return;
            this.texto = codigo;
            $("#prBuscar").value = codigo;
            this.pintar();
        });

        $("#prCategorias").addEventListener("click", e => {
            const c = e.target.closest("[data-cat]");
            if (c) { this.categoria = c.dataset.cat; this.pintar(); }
        });

        if (esAdmin) {
            $("#prNuevo").addEventListener("click", () => formularioProducto(null, () => this.pintar()));
            $("#prImportar").addEventListener("click", () => this.importar());
            $("#prExportar").addEventListener("click", () => this.exportar());
        }

        $("#prTabla").addEventListener("click", e => {
            const b = e.target.closest("[data-accion]");
            if (!b) return;
            if (b.dataset.accion === "editar") formularioProducto(b.dataset.id, () => this.pintar());
            if (b.dataset.accion === "ajustar") ajustarStock(b.dataset.id, () => this.pintar());
        });

        this.pintar();
    },


    pintar() {

        const productos = Datos.productos();
        const usadas = Array.from(new Set(productos.filter(p => p.activo !== false).map(p => p.categoria).filter(Boolean))).sort();

        $("#prCategorias").innerHTML = [["", "Todas"], ...usadas.map(c => [c, c])]
            .map(([k, t]) => `<button class="chip ${this.categoria === k ? "activo" : ""}" data-cat="${esc(k)}">${esc(t)} <span class="n">${productos.filter(p => p.activo !== false && (!k || p.categoria === k)).length}</span></button>`).join("");

        const palabras = normalizar(this.texto).split(/\s+/).filter(Boolean);

        const lista = productos
            .filter(p => {
                const activo = p.activo !== false;
                if (this.estado === "activos" && !activo) return false;
                if (this.estado === "inactivos" && activo) return false;
                if (this.estado === "bajo" && !(activo && stockBajo(p))) return false;
                if (this.estado === "sin" && !(activo && controlaStock(p) && Number(p.stock) <= 0)) return false;
                if (this.categoria && p.categoria !== this.categoria) return false;
                if (palabras.length && !palabras.every(x => normalizar([p.nombre, p.marca, p.codigoBarras, p.categoria, textoExtra(p)].join(" ")).includes(x))) return false;
                return true;
            })
            .sort((a, b) => a.nombre.localeCompare(b.nombre));

        const esAdmin = Sesion.esAdmin();

        if (!productos.length) {
            $("#prTabla").innerHTML = vacioHTML("inventario", "Aún no hay productos", "Agréguelos uno por uno o impórtelos desde Excel.",
                esAdmin ? '<button class="btn btn-primario" onclick="formularioProducto(null, () => Productos.pintar())">Nuevo producto</button>' : "");
            return;
        }

        if (!lista.length) {
            $("#prTabla").innerHTML = vacioHTML("buscar", "Sin resultados");
            return;
        }

        const mostrar = lista.slice(0, 300);

        $("#prTabla").innerHTML = `
            <div class="tabla-contenedor">
                <table class="tabla">
                    <thead><tr><th>Producto</th><th>Categoría</th><th class="num">Precio</th>${esAdmin ? '<th class="num">Margen</th>' : ""}<th>Stock</th><th></th></tr></thead>
                    <tbody>${mostrar.map(p => {
                        const foto = Fotos.producto(p.id);
                        const sin = controlaStock(p) && Number(p.stock) <= 0;
                        const margen = p.costo && p.precio ? Math.round((p.precio - p.costo) / p.precio * 100) : null;
                        return `
                            <tr class="${p.activo === false ? "anulada" : ""}">
                                <td>
                                    <div class="celda-producto">
                                        <span class="miniatura">${foto ? `<img src="${foto}" alt="" loading="lazy">` : icono("inventario")}</span>
                                        <div style="min-width:0"><div class="celda-titulo">${esc(p.nombre)}</div><div class="celda-sub">${esc([p.marca, textoExtra(p, true), p.codigoBarras].filter(Boolean).join(" · "))}</div></div>
                                    </div>
                                </td>
                                <td>${insigniaCategoria(p) || '<span class="texto-3">—</span>'}</td>
                                <td class="num negrita">${dinero(p.precio)}</td>
                                ${esAdmin ? `<td class="num ${margen !== null && margen < 15 ? "rojo" : ""}">${margen !== null ? margen + "%" : "—"}</td>` : ""}
                                <td class="nowrap"><span class="negrita ${sin ? "rojo" : stockBajo(p) ? "amarillo" : !controlaStock(p) ? "texto-3" : ""}">${esc(textoStock(p))}</span></td>
                                <td class="acciones">${esAdmin ? `
                                    ${controlaStock(p) ? `<button class="btn btn-chico" data-accion="ajustar" data-id="${p.id}">Stock</button>` : ""}
                                    <button class="btn btn-chico btn-icono" data-accion="editar" data-id="${p.id}" title="Editar" aria-label="Editar">${icono("editar")}</button>` : ""}</td>
                            </tr>`;
                    }).join("")}</tbody>
                </table>
            </div>
            <div class="pie-tabla"><span>${lista.length > mostrar.length ? `Mostrando ${mostrar.length} de ${lista.length}` : plural(lista.length, "producto", "productos")}</span></div>
        `;
    },


    columnas() {
        return [
            ["nombre", "Nombre"],
            ["categoria", "Categoría"],
            ["marca", "Marca"],
            ...camposExtra().map(c => [c.id, c.etiqueta]),
            ["codigoBarras", "Código de barras"],
            ["precio", "Precio"],
            ["costo", "Costo"],
            ["stock", "Stock"],
            ["stockMinimo", "Stock mínimo"],
            ["unidad", "Unidad"]
        ];
    },


    exportar() {

        const cols = this.columnas();
        const filas = [cols.map(c => c[1])].concat(Datos.productos().map(p => cols.map(([k]) => p[k] ?? "")));

        descargarArchivo("productos.csv", aCSV(filas), "text/csv");
    },


    importar() {

        const cols = this.columnas();
        const ejemplo = (window.RUBRO && RUBRO.ejemploImportar) || ["Producto de ejemplo", "Varios", "", ...camposExtra().map(() => ""), "7801234567890", "5990", "3000", "10", "2", "unidad"];

        abrirModal({
            titulo: "Importar productos desde Excel",
            clase: "ancho",
            html: `
                <ol style="margin:0 0 16px;padding-left:20px;line-height:1.9">
                    <li>Descargue la plantilla y ábrala en Excel.</li>
                    <li>Complete una fila por producto (Nombre y Precio son obligatorios).</li>
                    <li>Guárdela como <strong>CSV (delimitado por punto y coma)</strong> y súbala aquí.</li>
                </ol>
                <button class="btn" type="button" id="ipPlantilla">${icono("descargar")} Descargar plantilla</button>
                <div class="campo" style="margin-top:16px"><label for="ipArchivo">Archivo CSV</label><input type="file" id="ipArchivo" accept=".csv,text/csv"></div>
                <div class="mensaje-info" style="margin-top:14px">Si el producto ya existe (mismo código o mismo nombre) se actualizan sus datos y precio. El stock de los existentes no cambia.</div>
                <div id="ipResultado" style="margin-top:14px"></div>
            `,
            alAbrir: raiz => {
                $("#ipPlantilla", raiz).addEventListener("click", () => descargarArchivo("plantilla-productos.csv", aCSV([cols.map(c => c[1]), ejemplo]), "text/csv"));
            },
            botones: [
                { texto: "Cancelar" },
                {
                    texto: "Importar",
                    clase: "btn-primario",
                    icono: "subir",
                    accion: async (cerrar, raiz) => {

                        const archivo = $("#ipArchivo", raiz).files[0];
                        const resultado = $("#ipResultado", raiz);

                        if (!archivo) { resultado.innerHTML = '<div class="mensaje-error">Elija el archivo CSV.</div>'; return; }

                        try {

                            const filas = leerCSV(await leerArchivoTexto(archivo));

                            if (filas.length < 2) throw new Error("El archivo no tiene filas con datos.");

                            const enc = filas[0].map(normalizar);
                            const col = {};

                            cols.forEach(([k, t]) => { const i = enc.findIndex(e => e === normalizar(t) || e === normalizar(k)); if (i >= 0) col[k] = i; });

                            if (col.nombre === undefined || col.precio === undefined) throw new Error('Faltan las columnas "Nombre" y "Precio". Use la plantilla.');

                            const productos = Datos.productos();
                            let nuevos = 0, actualizados = 0;
                            const errores = [];

                            filas.slice(1).forEach((f, n) => {

                                const v = k => col[k] === undefined ? "" : String(f[col[k]] ?? "").trim();
                                const nombre = v("nombre");
                                const precio = aEntero(v("precio"));

                                if (!nombre || precio <= 0) { errores.push(`Fila ${n + 2}: falta el nombre o el precio.`); return; }

                                const datos = { nombre, precio, categoria: v("categoria"), marca: v("marca"), codigoBarras: v("codigoBarras").replace(/\s/g, ""), costo: aEntero(v("costo")), stockMinimo: aEntero(v("stockMinimo")), unidad: v("unidad") || UNIDADES[0] };
                                camposExtra().forEach(c => { if (col[c.id] !== undefined) datos[c.id] = c.tipo === "numero" ? Number(String(v(c.id)).replace(",", ".")) || "" : v(c.id); });
                                const existente = productos.find(p => (datos.codigoBarras && p.codigoBarras === datos.codigoBarras) || normalizar(p.nombre) === normalizar(nombre));

                                if (existente) {
                                    Object.assign(existente, datos);
                                    actualizados++;
                                } else {
                                    productos.push(Object.assign({ id: nuevoId(), activo: true, creado: new Date().toISOString(), stock: Math.max(0, Number(v("stock").replace(",", ".")) || 0) }, datos));
                                    nuevos++;
                                }
                            });

                            Datos.guardarProductos(productos);
                            this.pintar();

                            resultado.innerHTML = `<div class="mensaje-info"><strong>${nuevos}</strong> nuevos · <strong>${actualizados}</strong> actualizados${errores.length ? ` · <span class="rojo">${errores.length} con error</span>` : ""}</div>`;

                            if (!errores.length) {
                                cerrar();
                                avisar(`Importación lista: ${nuevos} nuevos, ${actualizados} actualizados.`);
                            }

                        } catch (error) {
                            resultado.innerHTML = `<div class="mensaje-error">${esc(error.message)}</div>`;
                        }
                    }
                }
            ]
        });
    }
};


// ==========================================
// FORMULARIO
// ==========================================

function campoExtraHTML(c, valor) {

    const id = "fx_" + c.id;
    const v = valor === undefined || valor === null ? "" : valor;
    const ancho = c.ancho === 2 ? ' style="grid-column:span 2"' : "";

    if (c.tipo === "opcion") {
        return `<div class="campo"${ancho}><label for="${id}">${esc(c.etiqueta)}</label><select id="${id}"><option value="">—</option>${(c.opciones || []).map(o => `<option ${String(o) === String(v) ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`;
    }

    return `<div class="campo"${ancho}><label for="${id}">${esc(c.etiqueta)}</label><input id="${id}" ${c.tipo === "numero" ? 'type="text" inputmode="decimal"' : ""} value="${esc(v)}" placeholder="${esc(c.placeholder || "")}"></div>`;
}


function leerExtras(raiz) {

    const datos = {};

    camposExtra().forEach(c => {
        const el = $("#fx_" + c.id, raiz);
        if (!el) return;
        const t = el.value.trim();
        datos[c.id] = c.tipo === "numero" ? (t === "" ? "" : Number(t.replace(",", ".")) || 0) : t;
    });

    return datos;
}


function formularioProducto(id, alGuardar) {

    const producto = id ? Datos.producto(id) : null;
    const p = producto || { unidad: UNIDADES[0], stock: 0, stockMinimo: 0 };
    let foto = null;

    abrirModal({
        titulo: producto ? "Editar producto" : "Nuevo producto",
        clase: "ancho",
        html: `
            <div class="rejilla rejilla-3">
                <div class="campo col-todo"><label>Foto</label><div id="fpFoto"></div></div>
                <div class="campo" style="grid-column:span 2"><label class="requerido" for="fpNombre">Nombre</label><input id="fpNombre" value="${esc(p.nombre || "")}" placeholder="${esc((window.RUBRO && RUBRO.ejemploNombre) || "Nombre del producto")}"></div>
                <div class="campo"><label for="fpCategoria">Categoría</label><input id="fpCategoria" list="fpCategorias" value="${esc(p.categoria || "")}"><datalist id="fpCategorias">${Datos.categorias().map(c => `<option value="${esc(c)}">`).join("")}</datalist></div>
                <div class="campo"><label for="fpMarca">Marca</label><input id="fpMarca" value="${esc(p.marca || "")}"></div>
                ${camposExtra().map(c => campoExtraHTML(c, p[c.id])).join("")}
                <div class="campo" style="grid-column:span 2">
                    <label for="fpCodigo">Código de barras</label>
                    <div class="con-boton">
                        <input id="fpCodigo" value="${esc(p.codigoBarras || "")}" placeholder="Escanee o escriba">
                        <button type="button" class="btn btn-icono" id="fpEscanear" title="Escanear" aria-label="Escanear con la cámara">${icono("codigo")}</button>
                    </div>
                </div>
                <div class="campo"><label class="requerido" for="fpPrecio">Precio de venta</label><input id="fpPrecio" type="text" inputmode="numeric" value="${p.precio ? numero(p.precio) : ""}"><span class="ayuda" id="fpSugerido"></span></div>
                <div class="campo"><label for="fpCosto">Costo</label><input id="fpCosto" type="text" inputmode="numeric" value="${p.costo ? numero(p.costo) : ""}"><span class="ayuda" id="fpMargen"></span></div>
                <div class="campo"><label for="fpUnidad">Se vende por</label><select id="fpUnidad">${UNIDADES.map(u => `<option ${u === p.unidad ? "selected" : ""}>${u}</option>`).join("")}</select></div>
                <label class="check col-todo"><input type="checkbox" id="fpControla" ${controlaStock(p) ? "checked" : ""}> Controlar stock (desmarque para servicios o mano de obra)</label>
                ${!producto ? `<div class="campo"><label for="fpStock">Stock inicial</label><input id="fpStock" type="text" inputmode="decimal" value="0"></div>` : ""}
                <div class="campo"><label for="fpMinimo">Stock mínimo</label><input id="fpMinimo" type="number" min="0" value="${aEntero(p.stockMinimo)}"><span class="ayuda">Avisa cuando quede menos</span></div>
                <div id="fpError" class="mensaje-error col-todo oculto"></div>
            </div>
        `,
        alAbrir(raiz) {

            foto = campoFoto($("#fpFoto", raiz), { inicial: producto ? Fotos.producto(producto.id) : null, maximo: 500 });

            const margen = () => {
                const precio = aEntero($("#fpPrecio", raiz).value);
                const costo = aEntero($("#fpCosto", raiz).value);
                $("#fpMargen", raiz).textContent = precio && costo ? `Ganancia ${dinero(precio - costo)} (${Math.round((precio - costo) / precio * 100)}%)` : "";
            };

            // rubros con precio calculado (por ejemplo, joyas por peso y valor del día)
            const sugerido = () => {
                const fn = window.RUBRO && RUBRO.precioSugerido;
                const caja = $("#fpSugerido", raiz);
                if (!fn) return;
                const datos = Object.assign({}, p, leerExtras(raiz), { costo: aEntero($("#fpCosto", raiz).value) });
                const valor = fn(datos);
                caja.innerHTML = valor ? `Sugerido: <strong>${dinero(valor)}</strong> <button type="button" class="btn btn-chico" id="fpUsarSug">Usar</button>` : "";
                const b = $("#fpUsarSug", raiz);
                if (b) b.addEventListener("click", () => { $("#fpPrecio", raiz).value = numero(valor); margen(); });
            };

            ["#fpPrecio", "#fpCosto"].forEach(s => $(s, raiz).addEventListener("input", e => {
                e.target.value = e.target.value.trim() ? numero(aEntero(e.target.value)) : "";
                margen();
            }));

            raiz.addEventListener("input", e => { if (/^fx_|fpCosto/.test(e.target.id)) sugerido(); });
            raiz.addEventListener("change", e => { if (/^fx_/.test(e.target.id)) sugerido(); });

            margen();
            sugerido();

            $("#fpCodigo", raiz).addEventListener("keydown", e => { if (e.key === "Enter") e.preventDefault(); });

            $("#fpEscanear", raiz).addEventListener("click", async () => {
                const codigo = await escanearCodigo();
                if (codigo) $("#fpCodigo", raiz).value = codigo;
            });
        },
        botones: [
            ...(producto ? [{
                texto: producto.activo === false ? "Reactivar" : "Desactivar",
                clase: producto.activo === false ? "" : "btn-peligro",
                accion: async cerrar => {
                    const productos = Datos.productos();
                    const r = productos.find(x => x.id === id);
                    if (r.activo !== false && !(await confirmar({ titulo: "Desactivar producto", mensaje: "Dejará de aparecer para vender. Puede reactivarlo después.", textoSi: "Desactivar", peligro: true }))) return;
                    r.activo = r.activo === false;
                    Datos.guardarProductos(productos);
                    cerrar();
                    if (alGuardar) alGuardar();
                }
            }] : []),
            { texto: "Cancelar" },
            {
                texto: producto ? "Guardar" : "Crear producto",
                clase: "btn-primario",
                accion: async (cerrar, raiz) => {

                    const error = $("#fpError", raiz);
                    const mostrarError = t => { error.textContent = t; error.classList.remove("oculto"); };

                    const datos = Object.assign({
                        nombre: $("#fpNombre", raiz).value.trim(),
                        categoria: $("#fpCategoria", raiz).value.trim(),
                        marca: $("#fpMarca", raiz).value.trim(),
                        codigoBarras: $("#fpCodigo", raiz).value.replace(/\s/g, ""),
                        precio: aEntero($("#fpPrecio", raiz).value),
                        costo: aEntero($("#fpCosto", raiz).value),
                        unidad: $("#fpUnidad", raiz).value,
                        controlaStock: $("#fpControla", raiz).checked,
                        stockMinimo: Math.max(0, aEntero($("#fpMinimo", raiz).value))
                    }, leerExtras(raiz));

                    if (!datos.nombre) { mostrarError("Escriba el nombre del producto."); return; }
                    if (datos.precio <= 0) { mostrarError("Escriba el precio de venta."); return; }

                    const productos = Datos.productos();

                    if (datos.codigoBarras && productos.some(x => x.codigoBarras === datos.codigoBarras && x.id !== id)) {
                        mostrarError("Ya existe otro producto con ese código de barras.");
                        return;
                    }

                    let idFinal = id;

                    if (producto) {
                        Object.assign(productos.find(x => x.id === id), datos);
                    } else {
                        const stock = datos.controlaStock ? Math.max(0, Number(String($("#fpStock", raiz).value).replace(",", ".")) || 0) : 0;
                        const nuevo = Object.assign({ id: nuevoId(), activo: true, creado: new Date().toISOString(), stock }, datos);
                        productos.push(nuevo);
                        idFinal = nuevo.id;
                        if (stock > 0) Datos.registrarMovimiento({ tipo: "ingreso", productoId: nuevo.id, producto: nuevo.nombre, unidades: stock, detalle: "Stock inicial" });
                    }

                    if (!Datos.guardarProductos(productos)) return;

                    if (foto && foto.cambiado) {
                        try {
                            if (foto.valor) await Fotos.guardar("p:" + idFinal, foto.valor);
                            else await Fotos.borrar("p:" + idFinal);
                        } catch (e) {
                            avisar("No se pudo guardar la foto.", "error");
                        }
                    }

                    cerrar();
                    avisar(producto ? "Producto guardado." : "Producto creado.");
                    if (alGuardar) alGuardar();
                }
            }
        ]
    });
}


function verFichaProducto(id) {
    if (Sesion.esAdmin()) formularioProducto(id, () => App.refrescar());
}


function ajustarStock(id, alTerminar) {

    const p = Datos.producto(id);

    abrirModal({
        titulo: "Stock · " + p.nombre,
        clase: "angosto",
        html: `
            <p class="texto-2" style="margin-bottom:12px">Stock actual: <strong>${esc(textoStock(p))}</strong></p>
            <div class="rejilla">
                <div class="campo"><label for="asCantidad">Cantidad real (conteo)</label><input id="asCantidad" type="text" inputmode="decimal" value="${Number(p.stock) || 0}"></div>
                <div class="campo"><label for="asMotivo">Motivo</label><select id="asMotivo"><option>Conteo</option><option>Producto dañado</option><option>Pérdida</option><option>Error de ingreso</option></select></div>
            </div>
        `,
        botones: [
            { texto: "Cancelar" },
            {
                texto: "Guardar",
                clase: "btn-primario",
                accion: (cerrar, raiz) => {

                    const productos = Datos.productos();
                    const r = productos.find(x => x.id === id);
                    const nuevo = Math.max(0, Number(String($("#asCantidad", raiz).value).replace(",", ".")) || 0);
                    const diferencia = Math.round((nuevo - Number(r.stock)) * 1000) / 1000;

                    if (diferencia !== 0) {
                        r.stock = nuevo;
                        Datos.guardarProductos(productos);
                        Datos.registrarMovimiento({ tipo: diferencia < 0 && $("#asMotivo", raiz).value !== "Conteo" ? "baja" : "ajuste", productoId: id, producto: r.nombre, unidades: diferencia, detalle: $("#asMotivo", raiz).value });
                        avisar("Stock actualizado.");
                    }

                    cerrar();
                    if (alTerminar) alTerminar();
                }
            }
        ]
    });
}


Modulos.productos = {
    titulo: "Productos",
    icono: "inventario",
    roles: ["admin", "vendedor"],
    render: vista => Productos.render(vista)
};
