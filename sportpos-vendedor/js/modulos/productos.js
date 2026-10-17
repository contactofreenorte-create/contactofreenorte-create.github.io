// ==========================================
// SPORTPOS — PRODUCTOS
// Catálogo simple con categorías, precio,
// costo, stock, foto e importación desde Excel
// ==========================================

"use strict";

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
                        <div class="buscar" style="flex:1;position:relative">${icono("buscar")}<input id="prBuscar" placeholder="Buscar por marca, modelo, color, talla o código" value="${esc(this.texto)}"></div>
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
                if (palabras.length && !palabras.every(x => normalizar([p.nombre, p.marca, p.codigoBarras, p.categoria].join(" ")).includes(x))) return false;
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
                                        <div style="min-width:0"><div class="celda-titulo">${esc(p.nombre)}</div><div class="celda-sub">${esc([p.marca, p.codigoBarras].filter(Boolean).join(" · "))}</div></div>
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


    COLUMNAS: [
        ["marca", "Marca"],
        ["modelo", "Modelo"],
        ["color", "Color"],
        ["talla", "Talla"],
        ["genero", "Género"],
        ["categoria", "Categoría"],
        ["codigoBarras", "Código de barras"],
        ["precio", "Precio"],
        ["costo", "Costo"],
        ["stock", "Stock"],
        ["stockMinimo", "Stock mínimo"],
        ["unidad", "Unidad"]
    ],


    exportar() {

        const filas = [this.COLUMNAS.map(c => c[1])].concat(Datos.productos().map(p => this.COLUMNAS.map(([k]) => p[k] ?? "")));

        descargarArchivo("productos.csv", aCSV(filas), "text/csv");
    },


    importar() {

        abrirModal({
            titulo: "Importar productos desde Excel",
            clase: "ancho",
            html: `
                <ol style="margin:0 0 16px;padding-left:20px;line-height:1.9">
                    <li>Descargue la plantilla y ábrala en Excel.</li>
                    <li>Complete una fila por cada talla y color (Modelo y Precio son obligatorios).</li>
                    <li>Guárdela como <strong>CSV (delimitado por punto y coma)</strong> y súbala aquí.</li>
                </ol>
                <button class="btn" type="button" id="ipPlantilla">${icono("descargar")} Descargar plantilla</button>
                <div class="campo" style="margin-top:16px"><label for="ipArchivo">Archivo CSV</label><input type="file" id="ipArchivo" accept=".csv,text/csv"></div>
                <div class="mensaje-info" style="margin-top:14px">Si el producto ya existe (mismo código o misma marca, modelo, color y talla) se actualizan sus datos y precio. El stock de los existentes no cambia.</div>
                <div id="ipResultado" style="margin-top:14px"></div>
            `,
            alAbrir: raiz => {
                $("#ipPlantilla", raiz).addEventListener("click", () => descargarArchivo("plantilla-productos.csv", aCSV([
                    this.COLUMNAS.map(c => c[1]),
                    ["Nike", "Pegasus 40", "Negro", "42", "Hombre", "Zapatillas running", "7801234567890", "89990", "52000", "4", "1", "par"]
                ]), "text/csv"));
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

                            this.COLUMNAS.forEach(([k, t]) => { const i = enc.findIndex(e => e === normalizar(t) || e === normalizar(k)); if (i >= 0) col[k] = i; });

                            if (col.modelo === undefined || col.precio === undefined) throw new Error('Faltan las columnas "Modelo" y "Precio". Use la plantilla.');

                            const productos = Datos.productos();
                            let nuevos = 0, actualizados = 0;
                            const errores = [];

                            filas.slice(1).forEach((f, n) => {

                                const v = k => col[k] === undefined ? "" : String(f[col[k]] ?? "").trim();
                                const precio = aEntero(v("precio"));

                                if (!v("modelo") || precio <= 0) { errores.push(`Fila ${n + 2}: falta el modelo o el precio.`); return; }

                                const datos = { marca: v("marca"), modelo: v("modelo"), color: v("color"), talla: v("talla"), genero: v("genero"), precio, categoria: v("categoria"), codigoBarras: v("codigoBarras").replace(/\s/g, ""), costo: aEntero(v("costo")), stockMinimo: aEntero(v("stockMinimo")), unidad: v("unidad") || "par" };
                                datos.nombre = nombreVariante(datos);
                                const nombre = datos.nombre;
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

function formularioProducto(id, alGuardar) {

    const producto = id ? Datos.producto(id) : null;
    const p = producto || { unidad: "par", stock: 0, stockMinimo: 1 };
    let foto = null;
    const tallasNuevas = [];

    abrirModal({
        titulo: producto ? "Editar producto" : "Nuevo producto (modelo y tallas)",
        clase: "ancho",
        html: `
            <div class="rejilla rejilla-3">
                <div class="campo col-todo"><label>Foto</label><div id="fpFoto"></div></div>
                <div class="campo"><label for="fpMarca">Marca</label><input id="fpMarca" value="${esc(p.marca || "")}" placeholder="Nike"></div>
                <div class="campo" style="grid-column:span 2"><label class="requerido" for="fpModelo">Modelo</label><input id="fpModelo" value="${esc(p.modelo || (producto && !p.talla ? p.nombre : "") || "")}" placeholder="Pegasus 40"></div>
                <div class="campo"><label for="fpColor">Color</label><input id="fpColor" value="${esc(p.color || "")}" placeholder="Negro"></div>
                <div class="campo"><label for="fpGenero">Género</label><select id="fpGenero"><option value="">—</option>${GENEROS.map(g => `<option ${g === p.genero ? "selected" : ""}>${g}</option>`).join("")}</select></div>
                <div class="campo"><label for="fpCategoria">Categoría</label><input id="fpCategoria" list="fpCategorias" value="${esc(p.categoria || "")}"><datalist id="fpCategorias">${Datos.categorias().map(c => `<option value="${esc(c)}">`).join("")}</datalist></div>
                ${producto
                    ? `<div class="campo"><label for="fpTalla">Talla</label><input id="fpTalla" value="${esc(p.talla || "")}" placeholder="42 o M"></div>`
                    : `<div class="campo col-todo">
                        <label class="requerido">Tallas y cantidad de cada una</label>
                        <div class="chips" id="fpGrupos">${GRUPOS_TALLAS.map((g, i) => `<button type="button" class="chip ${i === 0 ? "activo" : ""}" data-grupo="${g.id}">${g.texto}</button>`).join("")}</div>
                        <div class="chips" id="fpRapidas" style="margin-top:8px"></div>
                        <div class="con-boton" style="margin-top:8px">
                            <input id="fpTallaNueva" placeholder="Otra talla a mano (ej: 27, 41.5, 10 años, 2XL)" autocomplete="off">
                            <button type="button" class="btn" id="fpTallaAgregar">${icono("mas")} Agregar</button>
                        </div>
                        <div id="fpTallasLista" style="margin-top:8px"></div>
                        <span class="ayuda">Toque las tallas que llegaron o escriba una a mano. Anote cuántos pares o prendas hay de cada una. Se crea un producto por talla.</span>
                    </div>`}
                <div class="campo" style="grid-column:span 2">
                    <label for="fpCodigo">Código de barras</label>
                    <div class="con-boton">
                        <input id="fpCodigo" value="${esc(p.codigoBarras || "")}" placeholder="Escanee o escriba">
                        <button type="button" class="btn btn-icono" id="fpEscanear" title="Escanear" aria-label="Escanear con la cámara">${icono("codigo")}</button>
                    </div>
                </div>
                <div class="campo"><label class="requerido" for="fpPrecio">Precio de venta</label><input id="fpPrecio" type="text" inputmode="numeric" value="${p.precio ? numero(p.precio) : ""}"></div>
                <div class="campo"><label for="fpCosto">Costo</label><input id="fpCosto" type="text" inputmode="numeric" value="${p.costo ? numero(p.costo) : ""}"><span class="ayuda" id="fpMargen"></span></div>
                <div class="campo"><label for="fpUnidad">Se vende por</label><select id="fpUnidad">${UNIDADES.map(u => `<option ${u === p.unidad ? "selected" : ""}>${u}</option>`).join("")}</select></div>
                <label class="check col-todo"><input type="checkbox" id="fpControla" ${controlaStock(p) ? "checked" : ""}> Controlar stock (desmarque para servicios o recargas)</label>
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

            ["#fpPrecio", "#fpCosto"].forEach(s => $(s, raiz).addEventListener("input", e => {
                e.target.value = e.target.value.trim() ? numero(aEntero(e.target.value)) : "";
                margen();
            }));

            margen();

            if (!producto) {

                let grupo = GRUPOS_TALLAS[0];

                const pintarTallas = () => {

                    $("#fpGrupos", raiz).querySelectorAll("[data-grupo]").forEach(b => b.classList.toggle("activo", b.dataset.grupo === grupo.id));

                    $("#fpRapidas", raiz).innerHTML = grupo.tallas
                        .map(t => `<button type="button" class="chip ${tallasNuevas.some(x => x.talla === t) ? "activo" : ""}" data-talla="${esc(t)}">${esc(t)}</button>`).join("");

                    $("#fpTallasLista", raiz).innerHTML = tallasNuevas.length
                        ? `<div class="tarjeta"><table class="tabla"><thead><tr><th>Talla</th><th class="num" style="width:110px">Cantidad</th><th></th></tr></thead><tbody>${tallasNuevas.map((x, i) => `
                            <tr><td class="celda-titulo">${esc(x.talla)}</td>
                            <td class="num"><input type="number" min="0" step="1" data-cant="${i}" value="${x.stock}" style="width:84px;text-align:right"></td>
                            <td class="acciones"><button type="button" class="btn btn-chico btn-icono" data-quitar="${i}" aria-label="Quitar">${icono("cerrar")}</button></td></tr>`).join("")}</tbody></table></div>`
                        : '<p class="chico texto-3">Aún no agrega tallas.</p>';
                };

                const agregar = talla => {
                    talla = String(talla).trim();
                    if (!talla) return;
                    if (tallasNuevas.some(x => normalizar(x.talla) === normalizar(talla))) return;
                    tallasNuevas.push({ talla, stock: 1 });
                    pintarTallas();
                };

                const poner = g => { grupo = g; $("#fpUnidad", raiz).value = g.unidad; pintarTallas(); };

                $("#fpGrupos", raiz).addEventListener("click", e => {
                    const b = e.target.closest("[data-grupo]");
                    if (b) poner(GRUPOS_TALLAS.find(g => g.id === b.dataset.grupo));
                });

                $("#fpRapidas", raiz).addEventListener("click", e => {
                    const b = e.target.closest("[data-talla]");
                    if (!b) return;
                    const i = tallasNuevas.findIndex(x => x.talla === b.dataset.talla);
                    if (i >= 0) { tallasNuevas.splice(i, 1); pintarTallas(); } else agregar(b.dataset.talla);
                });

                $("#fpTallaAgregar", raiz).addEventListener("click", () => {
                    agregar($("#fpTallaNueva", raiz).value);
                    $("#fpTallaNueva", raiz).value = "";
                    $("#fpTallaNueva", raiz).focus();
                });

                $("#fpTallaNueva", raiz).addEventListener("keydown", e => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    $("#fpTallaAgregar", raiz).click();
                });

                $("#fpTallasLista", raiz).addEventListener("change", e => {
                    if (e.target.dataset.cant !== undefined) tallasNuevas[Number(e.target.dataset.cant)].stock = Math.max(0, Math.floor(Number(e.target.value) || 0));
                });

                $("#fpTallasLista", raiz).addEventListener("click", e => {
                    const b = e.target.closest("[data-quitar]");
                    if (b) { tallasNuevas.splice(Number(b.dataset.quitar), 1); pintarTallas(); }
                });

                poner(grupo);
            }

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

                    const datos = {
                        modelo: $("#fpModelo", raiz).value.trim(),
                        color: $("#fpColor", raiz).value.trim(),
                        genero: $("#fpGenero", raiz).value,
                        categoria: $("#fpCategoria", raiz).value.trim(),
                        marca: $("#fpMarca", raiz).value.trim(),
                        codigoBarras: $("#fpCodigo", raiz).value.replace(/\s/g, ""),
                        precio: aEntero($("#fpPrecio", raiz).value),
                        costo: aEntero($("#fpCosto", raiz).value),
                        unidad: $("#fpUnidad", raiz).value,
                        controlaStock: $("#fpControla", raiz).checked,
                        stockMinimo: Math.max(0, aEntero($("#fpMinimo", raiz).value))
                    };

                    if (!datos.modelo) { mostrarError("Escriba el modelo."); return; }
                    if (datos.precio <= 0) { mostrarError("Escriba el precio de venta."); return; }

                    const tallas = producto ? [$("#fpTalla", raiz).value.trim()] : tallasNuevas.map(x => x.talla);

                    if (!producto && !tallas.length) { mostrarError("Agregue al menos una talla (o escriba Única)."); return; }
                    if (!producto && datos.codigoBarras && tallas.length > 1) { mostrarError("Con varias tallas deje vacío el código de barras: cada talla lleva el suyo y se agrega después, al editar."); return; }

                    const productos = Datos.productos();

                    if (datos.codigoBarras && productos.some(x => x.codigoBarras === datos.codigoBarras && x.id !== id)) {
                        mostrarError("Ya existe otro producto con ese código de barras.");
                        return;
                    }

                    let idFinal = id;

                    if (producto) {
                        datos.talla = tallas[0];
                        datos.nombre = nombreVariante(datos);
                        Object.assign(productos.find(x => x.id === id), datos);
                    } else {
                        const repetidas = [];

                        tallasNuevas.forEach(({ talla, stock: cantidad }) => {
                            const stock = datos.controlaStock ? cantidad : 0;
                            const d = Object.assign({}, datos, { talla });
                            d.nombre = nombreVariante(d);
                            if (productos.some(x => normalizar(x.nombre) === normalizar(d.nombre))) { repetidas.push(talla); return; }
                            const nuevo = Object.assign({ id: nuevoId(), activo: true, creado: new Date().toISOString(), stock }, d);
                            productos.push(nuevo);
                            idFinal = nuevo.id;
                            if (stock > 0) Datos.registrarMovimiento({ tipo: "ingreso", productoId: nuevo.id, producto: nuevo.nombre, unidades: stock, detalle: "Stock inicial" });
                        });

                        if (repetidas.length === tallas.length) { mostrarError("Esas tallas ya existen para ese modelo y color."); return; }
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
