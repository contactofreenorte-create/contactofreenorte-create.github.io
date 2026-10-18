// ==========================================
// COMPRA DE ORO Y PLATA USADOS
// Registro de lo que se compra a las personas, con su identificación,
// el peso, el valor pagado, el comprobante y el retiro de la caja.
// ==========================================

"use strict";

Object.assign(Datos, {
    compras: () => DB.leer("compras", []),
    guardarCompras: valor => DB.guardar("compras", valor)
});


const CompraOro = {

    render(vista) {

        const compras = Datos.compras().sort((a, b) => b.fecha.localeCompare(a.fecha));
        const mes = hoyISO().slice(0, 7);
        const delMes = compras.filter(c => c.estado !== "anulada" && fechaISO(new Date(c.fecha)).slice(0, 7) === mes);
        const gramos = delMes.reduce((s, c) => s + c.items.reduce((g, i) => g + i.peso, 0), 0);
        const pagado = delMes.reduce((s, c) => s + c.total, 0);

        vista.innerHTML = `
            <div class="cabecera-vista">
                <div><h1>Compra de oro y plata</h1><p class="sub">Oro y plata usados que compra a las personas, con su comprobante.</p></div>
                <button class="btn btn-primario btn-grande" id="coNueva">${icono("mas")} Nueva compra</button>
            </div>
            <div class="kpis">
                <div class="kpi"><div class="kpi-icono">${icono("cambio")}</div><div><div class="etiqueta">Compras del mes</div><div class="valor">${delMes.length}</div></div></div>
                <div class="kpi"><div class="kpi-icono amarillo">${icono("inventario")}</div><div><div class="etiqueta">Gramos comprados</div><div class="valor">${formatoNumero.format(Math.round(gramos * 100) / 100)} g</div></div></div>
                <div class="kpi"><div class="kpi-icono rojo">${icono("dinero")}</div><div><div class="etiqueta">Pagado en el mes</div><div class="valor">${dinero(pagado)}</div></div></div>
            </div>
            <div class="tarjeta">${compras.length ? `
                <div class="tabla-contenedor"><table class="tabla">
                    <thead><tr><th>N°</th><th>Fecha</th><th>Vendedor</th><th>Detalle</th><th class="num">Total pagado</th><th>Pago</th><th></th></tr></thead>
                    <tbody>${compras.slice(0, 300).map(c => `<tr class="${c.estado === "anulada" ? "anulada" : ""}">
                        <td class="negrita">${String(c.numero).padStart(5, "0")}</td><td class="nowrap">${fechaHora(c.fecha)}</td>
                        <td><div class="celda-titulo">${esc(c.cliente.nombre)}</div><div class="celda-sub">${esc(c.cliente.rut || "")}</div></td>
                        <td style="max-width:260px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.items.map(i => `${i.material} ${formatoNumero.format(i.peso)} g`).join(", "))}</div></td>
                        <td class="num negrita">${dinero(c.total)}</td><td>${esc((METODOS_PAGO[c.metodo] || {}).texto || c.metodo)}</td>
                        <td class="acciones"><button class="btn btn-chico btn-icono" data-imp="${c.id}" title="Imprimir" aria-label="Imprimir">${icono("impresora")}</button></td></tr>`).join("")}</tbody>
                </table></div>` : vacioHTML("cambio", "Aún no hay compras", "Registre la primera con el botón «Nueva compra».")}</div>
        `;

        $("#coNueva").addEventListener("click", () => this.nueva());
        vista.addEventListener("click", e => {
            const b = e.target.closest("[data-imp]");
            if (b) this.imprimir(Datos.compras().find(c => c.id === b.dataset.imp));
        });
    },


    nueva() {

        const pr = Precios.leer();
        const filas = [{ material: "Oro 18k", peso: "", valor: Math.round((pr.valores["Oro 18k"] || 0) * (pr.compra || 100) / 100) }];
        let metodo = "efectivo";

        const valorBase = m => Math.round((pr.valores[m] || 0) * (pr.compra || 100) / 100);

        const { raiz, cerrar } = abrirModal({
            titulo: "Nueva compra de oro / plata",
            clase: "ancho",
            html: `
                <div class="rejilla rejilla-3">
                    <div class="campo" style="grid-column:span 2"><label class="requerido" for="coNom">Nombre de quien vende</label><input id="coNom" autocomplete="off"></div>
                    <div class="campo"><label class="requerido" for="coRut">RUT</label><input id="coRut" placeholder="12.345.678-9" autocomplete="off"></div>
                    <div class="campo"><label for="coTel">Teléfono</label><input id="coTel" inputmode="tel"></div>
                    <div class="campo" style="grid-column:span 2"><label for="coDir">Dirección</label><input id="coDir"></div>
                </div>
                <h3 style="margin:16px 0 6px;font-size:14px">Piezas que compra (pagando el ${Number(pr.compra) || 100}% del valor del día)</h3>
                <div id="coFilas"></div>
                <button class="btn btn-chico" type="button" id="coMas">${icono("mas")} Agregar otra pieza</button>
                <div style="max-width:340px;margin:14px 0 0 auto">
                    <div class="linea-total" style="font-size:19px;font-weight:700;color:var(--texto)"><span>Total a pagar</span><span id="coTotal">$0</span></div>
                </div>
                <div class="metodos-pago" id="coMetodos" style="margin-top:12px">
                    ${["efectivo", "transferencia"].map(k => `<button type="button" class="metodo ${k === metodo ? "activo" : ""}" data-metodo="${k}">${icono(METODOS_PAGO[k].icono)} ${METODOS_PAGO[k].texto}</button>`).join("")}
                </div>
                <label class="check" style="margin-top:12px"><input type="checkbox" id="coDecl"> El vendedor declara ser el dueño legítimo de las especies y haberlas ofrecido voluntariamente.</label>
                <div id="coError" class="mensaje-error oculto" style="margin-top:12px"></div>
            `,
            botones: [
                { texto: "Cancelar" },
                { texto: "Registrar compra", clase: "btn-primario", icono: "check", accion: () => guardar() }
            ]
        });

        const total = () => filas.reduce((s, f) => s + Math.round((Number(f.peso) || 0) * (Number(f.valor) || 0)), 0);

        const pintarFilas = () => {
            $("#coFilas", raiz).innerHTML = filas.map((f, i) => `
                <div class="rejilla rejilla-4" style="align-items:end;margin-bottom:8px">
                    <div class="campo"><label>Material</label><select data-i="${i}" data-c="material">${MATERIALES_PRECIO.map(m => `<option ${m === f.material ? "selected" : ""}>${m}</option>`).join("")}</select></div>
                    <div class="campo"><label>Peso (g)</label><input data-i="${i}" data-c="peso" inputmode="decimal" value="${f.peso}" placeholder="0,0"></div>
                    <div class="campo"><label>$ por gramo</label><input data-i="${i}" data-c="valor" inputmode="numeric" value="${f.valor ? numero(f.valor) : ""}"></div>
                    <div class="campo"><label>Total</label><div class="negrita" style="padding:10px 0">${dinero(Math.round((Number(f.peso) || 0) * (Number(f.valor) || 0)))} ${filas.length > 1 ? `<button class="btn btn-chico btn-icono" type="button" data-quitar="${i}" aria-label="Quitar">${icono("cerrar")}</button>` : ""}</div></div>
                </div>`).join("");
            $("#coTotal", raiz).textContent = dinero(total());
        };

        raiz.addEventListener("change", e => {
            const i = e.target.dataset.i;
            if (i === undefined) return;
            const f = filas[Number(i)];
            if (e.target.dataset.c === "material") { f.material = e.target.value; f.valor = valorBase(f.material); pintarFilas(); }
        });

        raiz.addEventListener("input", e => {
            const i = e.target.dataset.i;
            if (i === undefined) return;
            const f = filas[Number(i)];
            if (e.target.dataset.c === "peso") { f.peso = Number(e.target.value.replace(",", ".")) || 0; }
            if (e.target.dataset.c === "valor") { f.valor = aEntero(e.target.value); e.target.value = f.valor ? numero(f.valor) : ""; }
            $("#coTotal", raiz).textContent = dinero(total());
            // actualiza solo el total de la fila (no se redibuja para no perder el cursor)
            const fila = e.target.closest(".rejilla");
            if (fila) fila.querySelector(".negrita").firstChild.textContent = dinero(Math.round((Number(f.peso) || 0) * (Number(f.valor) || 0))) + " ";
        });

        raiz.addEventListener("click", e => {
            const b = e.target.closest("button");
            if (!b) return;
            if (b.id === "coMas") { filas.push({ material: "Oro 18k", peso: "", valor: valorBase("Oro 18k") }); pintarFilas(); }
            if (b.dataset.quitar !== undefined) { filas.splice(Number(b.dataset.quitar), 1); pintarFilas(); }
            if (b.dataset.metodo) { metodo = b.dataset.metodo; $$("#coMetodos .metodo", raiz).forEach(x => x.classList.toggle("activo", x === b)); }
        });

        const guardar = () => {

            const error = $("#coError", raiz);
            const falla = t => { error.textContent = t; error.classList.remove("oculto"); };
            const nombre = $("#coNom", raiz).value.trim();
            const rut = $("#coRut", raiz).value.trim();
            const items = filas.filter(f => Number(f.peso) > 0 && Number(f.valor) > 0).map(f => ({ material: f.material, peso: Number(f.peso), valorGramo: Number(f.valor), total: Math.round(Number(f.peso) * Number(f.valor)) }));

            if (!nombre || !rut) { falla("Escriba el nombre y el RUT de quien vende."); return; }
            if (!validarRut(rut)) { falla("El RUT no es válido. Revíselo."); return; }
            if (!items.length) { falla("Agregue al menos una pieza con su peso y su valor."); return; }
            if (!$("#coDecl", raiz).checked) { falla("Marque la declaración del vendedor."); return; }

            const totalPagar = items.reduce((s, i) => s + i.total, 0);
            const caja = Datos.cajaActual();

            if (metodo === "efectivo") {
                if (!caja) { falla("Abra la caja para pagar en efectivo."); return; }
                if (totalPagar > resumenCaja(caja).efectivoEsperado) { falla("No hay suficiente efectivo en la caja para pagar esta compra."); return; }
            }

            const usuario = Sesion.usuario();
            const compra = {
                id: nuevoId(), numero: Datos.siguienteNumero("compra"), fecha: new Date().toISOString(),
                cliente: { nombre, rut: formatearRut(limpiarRut(rut)), telefono: $("#coTel", raiz).value.trim(), direccion: $("#coDir", raiz).value.trim() },
                items, total: totalPagar, metodo, cajaId: caja ? caja.id : null, usuarioNombre: usuario.nombre, estado: "valida"
            };

            const lista = Datos.compras();
            lista.unshift(compra);
            Datos.guardarCompras(lista);

            if (metodo === "efectivo") {
                caja.movimientos = caja.movimientos || [];
                caja.movimientos.push({ id: nuevoId(), tipo: "retiro", monto: totalPagar, motivo: "Compra de oro/plata N° " + String(compra.numero).padStart(5, "0"), fecha: compra.fecha, usuario: usuario.nombre });
                Datos.guardarCaja(caja);
            }

            cerrar();
            avisar("Compra registrada.");
            if (Datos.config().imprimirAuto) this.imprimir(compra);
            abrirModal({
                titulo: "Compra registrada", clase: "angosto",
                html: `<div class="venta-lista-exito"><div class="circulo">${icono("check")}</div><div class="texto-2">Compra N° ${String(compra.numero).padStart(5, "0")}</div><div style="font-size:26px;font-weight:800;margin:4px 0">${dinero(totalPagar)}</div><div class="texto-2">${esc(METODOS_PAGO[metodo].texto)}${metodo === "efectivo" ? " · salió de la caja" : ""}</div></div>`,
                alCerrar: () => App.refrescar(),
                botones: [{ texto: "Imprimir comprobante", icono: "impresora", accion: () => this.imprimir(compra) }, { texto: "Listo", clase: "btn-primario" }]
            });
        };

        pintarFilas();
    },


    imprimir(c) {

        const config = Datos.config();

        const cuerpo = `
            ${Impresion.cabecera(config)}
            <hr>
            <div class="centro titulo">COMPROBANTE DE COMPRA</div>
            <div class="centro">N° ${String(c.numero).padStart(5, "0")}</div>
            <div class="centro peq">${fechaHora(c.fecha)} · Atendió: ${esc(c.usuarioNombre)}</div>
            <hr>
            <table>
                <tr><td>Vendedor</td><td class="d">${esc(c.cliente.nombre)}</td></tr>
                <tr><td>RUT</td><td class="d">${esc(c.cliente.rut)}</td></tr>
                ${c.cliente.telefono ? `<tr><td>Teléfono</td><td class="d">${esc(c.cliente.telefono)}</td></tr>` : ""}
                ${c.cliente.direccion ? `<tr><td>Dirección</td><td class="d">${esc(c.cliente.direccion)}</td></tr>` : ""}
            </table>
            <hr>
            <table>
                ${c.items.map(i => `<tr><td colspan="2">${esc(i.material)}</td></tr><tr><td class="peq">&nbsp;${formatoNumero.format(i.peso)} g x ${dinero(i.valorGramo)}</td><td class="d">${dinero(i.total)}</td></tr>`).join("")}
            </table>
            <hr>
            <table><tr class="total"><td>TOTAL PAGADO</td><td class="d">${dinero(c.total)}</td></tr><tr><td>${esc((METODOS_PAGO[c.metodo] || {}).texto || "")}</td><td class="d"></td></tr></table>
            <hr>
            <div class="peq">El vendedor declara ser el dueño legítimo de las especies y haberlas ofrecido voluntariamente.</div>
            <br><br><div class="centro">______________________</div><div class="centro peq">Firma de quien vende</div>
            <hr><div class="centro peq">Documento interno</div>
        `;

        imprimirHTML(Impresion.ticket(cuerpo, config.anchoPapel));
    }
};


Modulos.compraoro = {
    titulo: "Compra de oro",
    icono: "cambio",
    roles: ["admin", "vendedor"],
    render: vista => CompraOro.render(vista)
};
