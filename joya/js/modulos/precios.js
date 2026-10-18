// ==========================================
// PRECIOS DEL DÍA (oro y plata)
// El valor del gramo de cada material, el margen de venta y el porcentaje
// que se paga al comprar oro usado. Actualiza el precio de las joyas con un clic.
// ==========================================

"use strict";

const Precios = {

    leer() {
        return preciosDelDia() || JSON.parse(JSON.stringify(PRECIOS_EJEMPLO));
    },


    render(vista) {

        const p = this.leer();
        const guardados = Boolean(preciosDelDia());
        const joyas = Datos.productos().filter(x => x.activo !== false && x.autoPrecio === "Sí" && x.peso && x.material);

        vista.innerHTML = `
            <div class="cabecera-vista">
                <div><h1>Precios del día</h1><p class="sub">${guardados && p.actualizado ? "Actualizados el " + fechaHora(p.actualizado) : "Escriba el valor de hoy: lo que se ve acá son valores de ejemplo."}</p></div>
            </div>

            <div class="dos-columnas" style="align-items:start">
                <div class="tarjeta">
                    <div class="tarjeta-cabeza"><h3>Valor del gramo (con IVA)</h3></div>
                    <div class="tarjeta-cuerpo">
                        <table class="tabla"><thead><tr><th>Material</th><th class="num">Ley</th><th class="num">$ por gramo</th></tr></thead><tbody>
                            ${MATERIALES_PRECIO.map(m => `<tr><td class="celda-titulo">${esc(m)}</td><td class="num texto-2">${LEY[m] ? LEY[m] : ""}</td>
                                <td class="num"><input id="pr_${m.replace(/\W/g, "_")}" data-mat="${esc(m)}" inputmode="numeric" value="${numero(p.valores[m] || 0)}" style="width:120px;text-align:right"></td></tr>`).join("")}
                        </tbody></table>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                            <button class="btn btn-chico" id="prCalc">Calcular los demás oros desde el Oro 24k</button>
                        </div>
                    </div>
                </div>

                <div class="tarjeta">
                    <div class="tarjeta-cabeza"><h3>Márgenes</h3></div>
                    <div class="tarjeta-cuerpo">
                        <div class="campo"><label for="prMargen">Margen de venta sobre el valor del metal (%)</label><input id="prMargen" type="number" min="0" step="1" value="${Number(p.margen) || 0}"><span class="ayuda">Precio = peso × valor del gramo × (1 + margen) + hechura</span></div>
                        <div class="campo" style="margin-top:12px"><label for="prCompra">Porcentaje que se paga al comprar oro usado (%)</label><input id="prCompra" type="number" min="0" max="100" step="1" value="${Number(p.compra) || 0}"><span class="ayuda">Sobre el valor del gramo de cada material</span></div>
                        <div style="margin-top:16px"><button class="btn btn-primario" id="prGuardar">${icono("check")} Guardar precios del día</button></div>
                    </div>
                </div>
            </div>

            <div class="tarjeta" style="margin-top:18px">
                <div class="tarjeta-cabeza"><h3>Actualizar el precio de las joyas</h3></div>
                <div class="tarjeta-cuerpo">
                    <p class="texto-2" style="margin-bottom:12px"><strong>${joyas.length}</strong> ${joyas.length === 1 ? "joya tiene" : "joyas tienen"} marcado «Precio automático con el valor del día» (con material y peso).
                        Al actualizar, su precio se recalcula con los valores guardados arriba.</p>
                    <button class="btn" id="prAplicar" ${joyas.length ? "" : "disabled"}>${icono("cambio")} Actualizar ${plural(joyas.length, "joya", "joyas")}</button>
                    <div id="prResultado" style="margin-top:12px"></div>
                </div>
            </div>
        `;

        const leerValores = () => {
            const valores = {};
            MATERIALES_PRECIO.forEach(m => { valores[m] = aEntero($("#pr_" + m.replace(/\W/g, "_")).value); });
            return valores;
        };

        vista.addEventListener("input", e => {
            if (e.target.dataset.mat) e.target.value = e.target.value.trim() ? numero(aEntero(e.target.value)) : "";
        });

        $("#prCalc").addEventListener("click", () => {
            const base = aEntero($("#pr_Oro_24k").value);
            if (!base) { avisar("Escriba primero el valor del Oro 24k.", "error"); return; }
            ["Oro 18k", "Oro 14k", "Oro 10k"].forEach(m => { $("#pr_" + m.replace(/\W/g, "_")).value = numero(Math.round(base * LEY[m] / 100) * 100); });
        });

        const guardar = () => {
            DB.guardar("precios", { valores: leerValores(), margen: Math.max(0, Number($("#prMargen").value) || 0), compra: Math.min(100, Math.max(0, Number($("#prCompra").value) || 0)), actualizado: new Date().toISOString() });
        };

        $("#prGuardar").addEventListener("click", () => { guardar(); avisar("Precios del día guardados."); App.refrescar(); });

        $("#prAplicar").addEventListener("click", async () => {

            guardar();

            const productos = Datos.productos();
            let cambiados = 0;
            const filas = [];

            productos.forEach(x => {
                if (x.activo === false || x.autoPrecio !== "Sí" || !x.peso || !x.material) return;
                const nuevo = RUBRO.precioSugerido(x);
                if (nuevo && nuevo !== x.precio) { filas.push(`${x.nombre}: ${dinero(x.precio)} → ${dinero(nuevo)}`); x.precio = nuevo; cambiados++; }
            });

            if (!cambiados) { $("#prResultado").innerHTML = '<div class="mensaje-info">Los precios ya estaban al día.</div>'; return; }

            Datos.guardarProductos(productos);

            $("#prResultado").innerHTML = `<div class="mensaje-info"><strong>${plural(cambiados, "joya actualizada", "joyas actualizadas")}</strong><br><span class="chico">${filas.slice(0, 8).map(esc).join("<br>")}${filas.length > 8 ? "<br>…" : ""}</span></div>`;
            avisar(`${plural(cambiados, "joya actualizada", "joyas actualizadas")}.`);
        });
    }
};


Modulos.precios = {
    titulo: "Precios del día",
    icono: "dinero",
    roles: ["admin"],
    render: vista => Precios.render(vista)
};
