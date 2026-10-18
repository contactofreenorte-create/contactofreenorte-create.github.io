// ==========================================
// JOYAPOS — REPORTES
// Ventas, ganancia, lo más vendido, categorías,
// formas de pago y vendedores
// ==========================================

"use strict";

const Reportes = {

    periodo: "mes",
    desde: null,
    hasta: null,


    rango() {

        const hoy = hoyISO();

        if (this.periodo === "hoy") return [hoy, hoy];
        if (this.periodo === "7") return [sumarDias(hoy, -6), hoy];
        if (this.periodo === "mes") return [hoy.slice(0, 8) + "01", hoy];

        if (this.periodo === "anterior") {
            const d = fechaDesdeISO(hoy.slice(0, 8) + "01");
            d.setDate(0);
            const fin = fechaISO(d);
            return [fin.slice(0, 8) + "01", fin];
        }

        const d = this.desde || hoy;
        const h = this.hasta || hoy;

        return d <= h ? [d, h] : [h, d];
    },


    render(vista) {

        const [desde, hasta] = this.rango();

        vista.innerHTML = `
            <div class="cabecera-vista">
                <div class="chips" id="rpPeriodos">
                    ${[["hoy", "Hoy"], ["7", "7 días"], ["mes", "Este mes"], ["anterior", "Mes anterior"], ["otro", "Elegir fechas"]]
                        .map(([k, t]) => `<button class="chip ${this.periodo === k ? "activo" : ""}" data-periodo="${k}">${t}</button>`).join("")}
                </div>
                <div class="fila ${this.periodo === "otro" ? "" : "oculto"}">
                    <input type="date" id="rpDesde" value="${desde}" style="width:auto" aria-label="Desde">
                    <input type="date" id="rpHasta" value="${hasta}" style="width:auto" aria-label="Hasta">
                </div>
            </div>
            <div id="rpContenido"></div>
        `;

        $("#rpPeriodos").addEventListener("click", e => {
            const c = e.target.closest("[data-periodo]");
            if (!c) return;
            if (c.dataset.periodo === "otro") [this.desde, this.hasta] = this.rango();
            this.periodo = c.dataset.periodo;
            App.refrescar();
        });

        const cambiar = () => {
            this.desde = $("#rpDesde").value;
            this.hasta = $("#rpHasta").value;
            this.pintar();
        };

        $("#rpDesde").addEventListener("change", cambiar);
        $("#rpHasta").addEventListener("change", cambiar);

        this.pintar();
    },


    pintar() {

        const [desde, hasta] = this.rango();

        const todas = Datos.ventas().filter(v => { const d = fechaISO(new Date(v.fecha)); return d >= desde && d <= hasta; });
        const ventas = todas.filter(v => v.estado !== "anulada");

        const pv = { diferencia: 0, costo: 0, iva: 0, casos: 0 };
        const total = ventas.reduce((s, v) => s + v.total, 0) + pv.diferencia;
        const costo = ventas.reduce((s, v) => s + v.items.reduce((c, i) => c + (i.costo || 0), 0), 0) + pv.costo;
        const ivaTotal = ventas.reduce((s, v) => s + ivaDe(v), 0) + pv.iva;

        // Por día (o por mes si el período es largo)
        const porMes = diasHasta(hasta) - diasHasta(desde) > 62;
        const llave = d => porMes ? d.slice(0, 7) : d;
        const porDia = new Map();

        for (let d = desde; d <= hasta; d = sumarDias(d, 1)) porDia.set(llave(d), 0);

        ventas.forEach(v => { const k = llave(fechaISO(new Date(v.fecha))); if (porDia.has(k)) porDia.set(k, porDia.get(k) + v.total); });

        const maxDia = Math.max(1, ...porDia.values());

        const porProducto = new Map();
        const porCategoria = new Map();
        const porMetodo = {};
        const porVendedor = new Map();

        ventas.forEach(v => {

            porMetodo[v.metodo] = (porMetodo[v.metodo] || 0) + v.total;

            const x = porVendedor.get(v.usuarioNombre) || { total: 0, n: 0 };
            x.total += v.total;
            x.n++;
            porVendedor.set(v.usuarioNombre, x);

            v.items.forEach(i => {
                const p = porProducto.get(i.productoId + i.nombre) || { nombre: i.nombre, cantidad: 0, total: 0 };
                p.cantidad += i.cantidad;
                p.total += i.subtotal;
                porProducto.set(i.productoId + i.nombre, p);

                const cat = i.categoria || (Datos.producto(i.productoId) || {}).categoria || "Sin categoría";
                porCategoria.set(cat, (porCategoria.get(cat) || 0) + i.subtotal);
            });
        });

        const barras = filas => {
            const max = Math.max(1, ...filas.map(f => f[1]));
            return filas.length ? filas.map(([nombre, valor, extra]) => `
                <div class="barra-h">
                    <span class="nombre" title="${esc(nombre)}">${esc(nombre)}</span>
                    <div class="pista"><div class="relleno" style="width:${Math.max(2, valor / max * 100)}%"></div></div>
                    <span class="negrita nowrap">${dinero(valor)}${extra ? ` <span class="texto-3 chico">${extra}</span>` : ""}</span>
                </div>`).join("") : '<p class="texto-2">Sin datos.</p>';
        };

        const etiquetas = [...porDia.keys()];
        const saltar = Math.ceil(etiquetas.length / 12);

        $("#rpContenido").innerHTML = `
            <div class="kpis">
                <div class="kpi"><div class="kpi-icono verde">${icono("tendencia")}</div>
                    <div><div class="etiqueta">Ventas</div><div class="valor">${dinero(total)}</div><div class="detalle">${fechaCorta(desde)} al ${fechaCorta(hasta)} · IVA incluido ${dinero(ivaTotal)}${pv.casos ? " · neto de " + plural(pv.casos, "caso de posventa", "casos de posventa") : ""}</div></div></div>
                <div class="kpi"><div class="kpi-icono">${icono("boleta")}</div>
                    <div><div class="etiqueta">N° de ventas</div><div class="valor">${numero(ventas.length)}</div><div class="detalle">Promedio ${dinero(ventas.length ? total / ventas.length : 0)}</div></div></div>
                <div class="kpi"><div class="kpi-icono morado">${icono("dinero")}</div>
                    <div><div class="etiqueta">Ganancia estimada</div><div class="valor">${dinero(total - ivaTotal - costo)}</div><div class="detalle">${total - ivaTotal ? Math.round((total - ivaTotal - costo) / (total - ivaTotal) * 100) + "% de margen" : "—"}</div></div></div>
                <div class="kpi"><div class="kpi-icono rojo">${icono("prohibido")}</div>
                    <div><div class="etiqueta">Anuladas</div><div class="valor">${numero(todas.length - ventas.length)}</div></div></div>
            </div>

            <div class="tarjeta" style="margin-bottom:18px">
                <div class="tarjeta-cabeza"><h3>${porMes ? "Ventas por mes" : "Ventas por día"}</h3><button class="btn btn-chico" id="rpExportar">${icono("descargar")} Exportar</button></div>
                <div class="tarjeta-cuerpo">
                    ${total ? `
                        <div class="grafico-barras">
                            ${[...porDia.entries()].map(([d, v]) => `<div class="col" title="${porMes ? d.slice(5) + "/" + d.slice(0, 4) : fechaCorta(d)}: ${dinero(v)}"><div class="barra-v" style="height:${v / maxDia * 100}%"></div></div>`).join("")}
                        </div>
                        <div class="grafico-etiquetas">${etiquetas.map((d, i) => `<span>${i % saltar !== 0 ? "" : porMes ? d.slice(5) + "/" + d.slice(2, 4) : d.slice(8) + "/" + d.slice(5, 7)}</span>`).join("")}</div>`
                        : vacioHTML("grafico", "Sin ventas en este período")}
                </div>
            </div>

            <div class="dos-iguales">
                <div class="tarjeta">
                    <div class="tarjeta-cabeza"><h3>Los 10 más vendidos</h3></div>
                    <div class="tarjeta-cuerpo">${barras([...porProducto.values()].sort((a, b) => b.total - a.total).slice(0, 10).map(x => [x.nombre, x.total, formatoNumero.format(Math.round(x.cantidad * 100) / 100) + " u."]))}</div>
                </div>
                <div>
                    <div class="tarjeta" style="margin-bottom:18px">
                        <div class="tarjeta-cabeza"><h3>Por categoría</h3></div>
                        <div class="tarjeta-cuerpo">${barras([...porCategoria.entries()].sort((a, b) => b[1] - a[1]))}</div>
                    </div>
                    <div class="tarjeta" style="margin-bottom:18px">
                        <div class="tarjeta-cabeza"><h3>Formas de pago</h3></div>
                        <div class="tarjeta-cuerpo">${barras(Object.entries(porMetodo).sort((a, b) => b[1] - a[1]).map(([k, v]) => [(METODOS_PAGO[k] || {}).texto || k, v]))}</div>
                    </div>
                    <div class="tarjeta">
                        <div class="tarjeta-cabeza"><h3>Por vendedor</h3></div>
                        ${porVendedor.size ? `<ul class="lista-simple">${[...porVendedor.entries()].sort((a, b) => b[1].total - a[1].total).map(([n, x]) => `
                            <li><span>${esc(n)} <span class="texto-3 chico">· ${plural(x.n, "venta", "ventas")}</span></span><strong>${dinero(x.total)}</strong></li>`).join("")}</ul>` : '<div class="tarjeta-cuerpo"><p class="texto-2">Sin datos.</p></div>'}
                    </div>
                </div>
            </div>
        `;

        $("#rpExportar").addEventListener("click", () => {
            const filas = [["N°", "Fecha", "Vendedor", "Producto", "Cantidad", "Subtotal", "Costo", "Pago", "Estado"]];
            todas.forEach(v => v.items.forEach(i => filas.push([v.numero, fechaHora(v.fecha), v.usuarioNombre, i.nombre, String(i.cantidad).replace(".", ","), i.subtotal, i.costo || 0, (METODOS_PAGO[v.metodo] || {}).texto || v.metodo, v.estado === "anulada" ? "Anulada" : "Válida"])));
            descargarArchivo(`reporte-${desde}-a-${hasta}.csv`, aCSV(filas), "text/csv");
        });
    }
};


Modulos.reportes = {
    titulo: "Reportes",
    icono: "grafico",
    roles: ["admin"],
    render: vista => Reportes.render(vista)
};
