// ==========================================
// SPORTPOS — INVENTARIO
// Ingreso de mercadería, stock bajo y movimientos
// ==========================================

"use strict";

const Inventario = {

    pestana: "ingreso",
    productoElegido: null,
    tipoMovimiento: "",


    render(vista) {

        const bajos = Datos.productos().filter(p => p.activo !== false && stockBajo(p)).length;

        vista.innerHTML = `
            <div class="pestanas" id="invPestanas">
                <button class="pestana" data-pestana="ingreso">${icono("camion")} <span class="texto-largo">Ingreso de mercadería</span><span class="texto-corto">Ingreso</span></button>
                <button class="pestana" data-pestana="bajo">${icono("alerta")} <span>Stock bajo</span> ${bajos ? `<span class="badge b-aviso">${bajos}</span>` : ""}</button>
                <button class="pestana" data-pestana="movimientos">${icono("libro")} <span>Movimientos</span></button>
            </div>
            <div id="invContenido"></div>
        `;

        $("#invPestanas").addEventListener("click", evento => {
            const boton = evento.target.closest("[data-pestana]");
            if (boton) {
                this.pestana = boton.dataset.pestana;
                this.pintar();
            }
        });

        this.pintar();
    },


    pintar() {

        $$("#invPestanas .pestana").forEach(p => p.classList.toggle("activa", p.dataset.pestana === this.pestana));

        const anterior = $("#invContenido");
        anterior.replaceWith(anterior.cloneNode(false));

        if (this.pestana === "bajo") this.pintarStockBajo();
        else if (this.pestana === "movimientos") this.pintarMovimientos();
        else this.pintarIngreso();
    },


    pintarIngreso() {

        const hoy = hoyISO();
        const ingresosHoy = Datos.movimientos().filter(m => m.tipo === "ingreso" && fechaISO(new Date(m.fecha)) === hoy);
        const proveedores = Array.from(new Set(Datos.movimientos().map(m => m.proveedor).filter(Boolean)));

        $("#invContenido").innerHTML = `
            <div class="dos-columnas">
                <div class="tarjeta">
                    <div class="tarjeta-cabeza"><h3>Registrar ingreso</h3><span class="chico texto-2">Factura o guía del proveedor</span></div>
                    <div class="tarjeta-cuerpo">
                        <div class="rejilla rejilla-2">
                            <div class="campo col-todo">
                                <label class="requerido" for="inBuscar">Producto</label>
                                <div id="inElegido"></div>
                                <div id="inBuscador">
                                    <div class="con-boton">
                                        <input id="inBuscar" placeholder="Buscar marca, modelo o código" autocomplete="off">
                                        <button type="button" class="btn btn-icono" id="inEscanear" title="Escanear con la cámara" aria-label="Escanear con la cámara">${icono("codigo")}</button>
                                    </div>
                                    <div id="inResultados"></div>
                                </div>
                            </div>
                            <div class="campo"><label class="requerido" for="inCantidad">Cantidad</label><input id="inCantidad" type="text" inputmode="decimal" placeholder="0"></div>
                            <div class="campo"><label for="inCosto">Costo unitario</label><input id="inCosto" type="text" inputmode="numeric" placeholder="Opcional"><span class="ayuda">Actualiza el costo del producto</span></div>
                            <div class="campo">
                                <label for="inProveedor">Proveedor</label>
                                <input id="inProveedor" list="inProveedores" placeholder="Distribuidor">
                                <datalist id="inProveedores">${proveedores.map(p => `<option value="${esc(p)}">`).join("")}</datalist>
                            </div>
                            <div class="campo"><label for="inDocumento">N° factura o guía</label><input id="inDocumento" placeholder="Opcional"></div>
                            <div id="inError" class="mensaje-error col-todo oculto"></div>
                            <button class="btn btn-primario btn-grande col-todo" id="inGuardar" type="button">${icono("check")} Ingresar al stock</button>
                        </div>
                    </div>
                </div>
                <div class="tarjeta">
                    <div class="tarjeta-cabeza"><h3>Ingresado hoy</h3><span class="chico texto-2">${plural(ingresosHoy.length, "ingreso", "ingresos")}</span></div>
                    ${ingresosHoy.length ? `<ul class="lista-simple">${ingresosHoy.map(m => `
                        <li><div style="min-width:0"><div class="negrita">${esc(m.producto)}</div><div class="chico texto-2">${esc(m.detalle || "")}</div></div><span class="badge b-ok">+${numero(m.unidades)}</span></li>`).join("")}</ul>`
                        : vacioHTML("camion", "Nada ingresado hoy")}
                </div>
            </div>
        `;

        this.pintarElegido();

        const buscar = $("#inBuscar");

        buscar.addEventListener("input", () => this.pintarBusqueda(buscar.value));

        buscar.addEventListener("keydown", evento => {
            if (evento.key !== "Enter") return;
            evento.preventDefault();
            const texto = buscar.value.trim();
            const porCodigo = Datos.productos().find(p => p.codigoBarras && p.codigoBarras === texto);
            const lista = porCodigo ? [porCodigo] : this.buscarProductos(texto);
            if (lista.length === 1) this.elegir(lista[0].id);
        });

        $("#inEscanear").addEventListener("click", async () => {
            const codigo = await escanearCodigo();
            if (!codigo) return;
            const producto = Datos.productos().find(p => p.codigoBarras === codigo);
            if (producto) this.elegir(producto.id);
            else {
                buscar.value = codigo;
                this.pintarBusqueda(codigo);
                avisar("No hay un producto con ese código. Créelo primero en Productos.", "aviso");
            }
        });

        $("#inResultados").addEventListener("click", evento => {
            const boton = evento.target.closest("[data-elegir]");
            if (boton) this.elegir(boton.dataset.elegir);
        });

        $("#inCosto").addEventListener("input", e => { e.target.value = e.target.value.trim() ? numero(aEntero(e.target.value)) : ""; });

        $("#inGuardar").addEventListener("click", () => this.guardarIngreso());
    },


    buscarProductos(texto) {

        const palabras = normalizar(texto).split(/\s+/).filter(Boolean);

        if (!palabras.length) return [];

        return Datos.productos()
            .filter(p => controlaStock(p))
            .filter(p => palabras.every(x => normalizar([p.nombre, p.marca, p.categoria, p.codigoBarras].join(" ")).includes(x)))
            .slice(0, 12);
    },


    pintarBusqueda(texto) {

        const lista = this.buscarProductos(texto);

        $("#inResultados").innerHTML = texto.trim()
            ? lista.length
                ? `<div class="lista-busqueda">${lista.map(p => `
                    <button type="button" data-elegir="${p.id}">
                        <div class="negrita">${esc(p.nombre)}</div>
                        <div class="chico texto-2">${esc(p.categoria || "")} · ${esc(textoStock(p))}</div>
                    </button>`).join("")}</div>`
                : '<p class="chico texto-2" style="margin-top:6px">No se encontró. Créelo primero en Productos.</p>'
            : "";
    },


    elegir(id) {
        this.productoElegido = id;
        this.pintarElegido();
        $("#inCantidad").focus();
    },


    pintarElegido() {

        const p = this.productoElegido && Datos.producto(this.productoElegido);

        $("#inBuscador").classList.toggle("oculto", Boolean(p));

        if (!p) {
            $("#inElegido").innerHTML = "";
            return;
        }

        $("#inElegido").innerHTML = `
            <div class="seleccionado">
                ${icono("inventario")}
                <div style="flex:1;min-width:0">
                    <div class="negrita">${esc(p.nombre)}</div>
                    <div class="chico texto-2">Stock actual: ${esc(textoStock(p))}${p.costo ? " · Costo " + dinero(p.costo) : ""}</div>
                </div>
                <button class="btn btn-chico" type="button" id="inCambiar">Cambiar</button>
            </div>
        `;

        $("#inCambiar").addEventListener("click", () => {
            this.productoElegido = null;
            this.pintarElegido();
            $("#inBuscar").value = "";
            $("#inResultados").innerHTML = "";
            $("#inBuscar").focus();
        });
    },


    guardarIngreso() {

        const error = $("#inError");
        const mostrarError = t => { error.textContent = t; error.classList.remove("oculto"); };

        const productos = Datos.productos();
        const p = this.productoElegido && productos.find(x => x.id === this.productoElegido);

        if (!p) { mostrarError("Elija el producto."); return; }

        const cantidad = Math.max(0, Number(String($("#inCantidad").value).replace(",", ".")) || 0);

        if (cantidad <= 0) { mostrarError("Escriba la cantidad que ingresa."); return; }

        const costo = aEntero($("#inCosto").value);
        const proveedor = $("#inProveedor").value.trim();
        const documento = $("#inDocumento").value.trim();

        p.stock = Math.round((Number(p.stock) + cantidad) * 1000) / 1000;
        if (costo) p.costo = costo;

        if (!Datos.guardarProductos(productos)) return;

        Datos.registrarMovimiento({
            tipo: "ingreso",
            productoId: p.id,
            producto: p.nombre,
            unidades: cantidad,
            proveedor,
            detalle: [proveedor, documento ? "Doc. " + documento : "", costo ? "Costo " + dinero(costo) : ""].filter(Boolean).join(" · ")
        });

        avisar(`Ingresado: ${cantidad} de ${p.nombre}.`);

        this.productoElegido = null;

        this.pintar();

        $("#inProveedor").value = proveedor;
        $("#inDocumento").value = documento;

        App.pintarMenu("inventario");
    },


    pintarStockBajo() {

        const lista = Datos.productos()
            .filter(p => p.activo !== false && stockBajo(p))
            .map(p => ({ p, pedir: Math.max(1, Math.ceil(aEntero(p.stockMinimo) * 2 - Number(p.stock))) }))
            .sort((a, b) => Number(a.p.stock) - Number(b.p.stock));

        $("#invContenido").innerHTML = `
            <div class="tarjeta">
                <div class="tarjeta-cabeza">
                    <div><h3>Productos bajo el stock mínimo</h3><p class="chico texto-2">Sugerencia de pedido: completar el doble del mínimo.</p></div>
                    ${lista.length ? `<div class="fila"><button class="btn" id="sbImprimir">${icono("impresora")} Imprimir pedido</button><button class="btn" id="sbExportar">${icono("descargar")} Exportar</button></div>` : ""}
                </div>
                ${lista.length ? `
                    <div class="tabla-contenedor">
                        <table class="tabla">
                            <thead><tr><th>Producto</th><th>Categoría</th><th class="num">Stock</th><th class="num">Mínimo</th><th class="num">Pedir</th></tr></thead>
                            <tbody>${lista.map(x => `
                                <tr>
                                    <td class="celda-titulo">${esc(x.p.nombre)}</td>
                                    <td>${insigniaCategoria(x.p) || "—"}</td>
                                    <td class="num negrita ${Number(x.p.stock) <= 0 ? "rojo" : "amarillo"}">${Number(x.p.stock)}</td>
                                    <td class="num">${x.p.stockMinimo}</td>
                                    <td class="num negrita azul">${x.pedir}</td>
                                </tr>`).join("")}</tbody>
                        </table>
                    </div>` : vacioHTML("check", "Todo en orden", "Ningún producto está bajo su stock mínimo.")}
            </div>
        `;

        if (!lista.length) return;

        const filas = [["Producto", "Categoría", "Marca", "Código", "Stock", "Mínimo", "Pedir"]]
            .concat(lista.map(x => [x.p.nombre, x.p.marca || "", x.p.modelo || "", x.p.color || "", Number(x.p.stock), x.p.stockMinimo, x.pedir]));

        $("#sbExportar").addEventListener("click", () => descargarArchivo(`pedido-${hoyISO()}.csv`, aCSV(filas), "text/csv"));

        $("#sbImprimir").addEventListener("click", () => Impresion.documento(
            "Pedido sugerido", "Stock bajo al " + fechaCorta(hoyISO()),
            `<table><thead><tr>${filas[0].map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead>
             <tbody>${filas.slice(1).map(f => `<tr>${f.map((c, i) => `<td class="${i >= 4 ? "num" : ""}">${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
        ));
    },


    pintarMovimientos() {

        const tipos = {
            ingreso: { texto: "Ingreso", clase: "b-ok" },
            ajuste: { texto: "Ajuste", clase: "b-azul" },
            baja: { texto: "Baja", clase: "b-peligro" }
        };

        const lista = Datos.movimientos().filter(m => !this.tipoMovimiento || m.tipo === this.tipoMovimiento);
        const mostrar = lista.slice(0, 300);

        $("#invContenido").innerHTML = `
            <div class="tarjeta">
                <div class="barra-herramientas">
                    <div class="chips" id="movTipos">
                        <button class="chip ${!this.tipoMovimiento ? "activo" : ""}" data-tipo="">Todos</button>
                        ${Object.entries(tipos).map(([k, t]) => `<button class="chip ${this.tipoMovimiento === k ? "activo" : ""}" data-tipo="${k}">${t.texto}s</button>`).join("")}
                    </div>
                </div>
                ${mostrar.length ? `
                    <div class="tabla-contenedor">
                        <table class="tabla">
                            <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th class="num">Unidades</th><th>Detalle</th><th>Usuario</th></tr></thead>
                            <tbody>${mostrar.map(m => `
                                <tr>
                                    <td class="nowrap">${fechaHora(m.fecha)}</td>
                                    <td><span class="badge ${(tipos[m.tipo] || {}).clase || ""}">${esc((tipos[m.tipo] || {}).texto || m.tipo)}</span></td>
                                    <td>${esc(m.producto)}</td>
                                    <td class="num negrita ${m.unidades < 0 ? "rojo" : "verde"}">${m.unidades > 0 ? "+" : ""}${numero(m.unidades)}</td>
                                    <td class="chico">${esc(m.detalle || "")}</td>
                                    <td class="chico">${esc(m.usuario || "")}</td>
                                </tr>`).join("")}</tbody>
                        </table>
                    </div>
                    <div class="pie-tabla"><span>${plural(lista.length, "movimiento", "movimientos")}</span></div>`
                    : vacioHTML("libro", "Sin movimientos", "Aquí verá los ingresos, ajustes y bajas de inventario.")}
            </div>
        `;

        $("#movTipos").addEventListener("click", evento => {
            const chip = evento.target.closest("[data-tipo]");
            if (chip) {
                this.tipoMovimiento = chip.dataset.tipo;
                this.pintarMovimientos();
            }
        });
    }
};


Modulos.inventario = {
    titulo: "Inventario",
    icono: "inventario",
    roles: ["admin"],
    render: vista => Inventario.render(vista)
};
