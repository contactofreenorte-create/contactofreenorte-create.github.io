// ==========================================
// TALLERPRO — INICIO
// Resumen del día
// ==========================================

"use strict";

const Inicio = {

    render(vista) {

        const usuario = Sesion.usuario();
        const esAdmin = usuario.rol === "admin";
        const hoy = hoyISO();
        const caja = Datos.cajaActual();

        const ventasHoy = Datos.ventas().filter(v => v.estado !== "anulada" && fechaISO(new Date(v.fecha)) === hoy && (esAdmin || v.usuarioId === usuario.id));
        const pv = { diferencia: 0, costo: 0, iva: 0, casos: 0 };
        const total = ventasHoy.reduce((s, v) => s + v.total, 0) + pv.diferencia;
        const costo = ventasHoy.reduce((s, v) => s + v.items.reduce((c, i) => c + (i.costo || 0), 0), 0) + pv.costo;
        const ivaHoy = ventasHoy.reduce((s, v) => s + ivaDe(v), 0) + pv.iva;
        const bajos = Datos.productos().filter(p => p.activo !== false && stockBajo(p)).sort((a, b) => Number(a.stock) - Number(b.stock));

        const horaActual = new Date().getHours();
        const saludo = horaActual < 12 ? "Buenos días" : horaActual < 20 ? "Buenas tardes" : "Buenas noches";

        vista.innerHTML = `
            <div class="cabecera-vista">
                <div>
                    <h1>${saludo}, ${esc(usuario.nombre.split(" ")[0])}</h1>
                    <p class="sub">${esc(fechaLarga().replace(/^./, l => l.toUpperCase()))}</p>
                </div>
                <a class="btn btn-primario btn-grande" href="#vender">${icono("carro")} Nueva venta</a>
            </div>

            ${esCelular() && Instalacion.posible() && !DB.leer("avisoInstalarVisto", false) ? `
                <div class="aviso-instalar" id="inInstalar">
                    ${icono("celular")}
                    <span>Instale el sistema en este celular para abrirlo como una aplicación.</span>
                    <span class="espacio"></span>
                    <button class="btn btn-chico btn-primario" id="inInstalarSi">Instalar</button>
                    <button class="btn btn-chico btn-fantasma btn-icono" id="inInstalarNo" aria-label="Cerrar aviso">${icono("cerrar")}</button>
                </div>` : ""}

            ${!caja ? `
                <div class="aviso-caja">
                    ${icono("caja")}
                    <span>La caja está cerrada.</span>
                    <span class="espacio"></span>
                    <button class="btn btn-chico btn-primario" id="inAbrirCaja">Abrir caja</button>
                </div>` : ""}

            <div class="kpis">
                <div class="kpi"><div class="kpi-icono verde">${icono("tendencia")}</div>
                    <div><div class="etiqueta">${esAdmin ? "Vendido hoy" : "Vendido por mí hoy"}</div><div class="valor">${dinero(total)}</div><div class="detalle">${plural(ventasHoy.length, "venta", "ventas")}${pv.casos ? " · " + plural(pv.casos, "cambio/devolución", "cambios/devoluciones") : ""}</div></div></div>
                ${esAdmin ? `<div class="kpi"><div class="kpi-icono morado">${icono("dinero")}</div>
                    <div><div class="etiqueta">Ganancia de hoy</div><div class="valor">${dinero(total - ivaHoy - costo)}</div><div class="detalle">${total - ivaHoy ? Math.round((total - ivaHoy - costo) / (total - ivaHoy) * 100) + "% de margen" : "—"}</div></div></div>` : ""}
                <div class="kpi"><div class="kpi-icono ${caja ? "" : "amarillo"}">${icono("caja")}</div>
                    <div><div class="etiqueta">Caja</div><div class="valor" style="font-size:18px">${caja ? "Abierta" : "Cerrada"}</div><div class="detalle">${caja ? "Desde las " + hora(caja.abiertaEn) : "Ábrala para vender"}</div></div></div>
                <div class="kpi"><div class="kpi-icono ${bajos.length ? "rojo" : "verde"}">${icono("alerta")}</div>
                    <div><div class="etiqueta">Por agotarse</div><div class="valor">${bajos.length}</div><div class="detalle">Bajo el stock mínimo</div></div></div>
            </div>

            ${typeof Ordenes !== "undefined" ? Ordenes.resumenInicio() : ""}

            <div class="dos-iguales">
                <div class="tarjeta">
                    <div class="tarjeta-cabeza"><h3>Últimas ventas</h3><a class="chico" href="#ventas">Ver todas</a></div>
                    ${ventasHoy.length ? `<ul class="lista-simple">${ventasHoy.slice(0, 8).map(v => `
                        <li>
                            <div style="min-width:0">
                                <div class="negrita">N° ${String(v.numero).padStart(6, "0")} <span class="texto-3 chico">· ${hora(v.fecha)}</span></div>
                                <div class="chico texto-2" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px">${esc(v.items.map(i => i.nombre).join(", "))}</div>
                            </div>
                            <strong>${dinero(v.total)}</strong>
                        </li>`).join("")}</ul>` : vacioHTML("boleta", "Aún no hay ventas hoy")}
                </div>
                <div class="tarjeta">
                    <div class="tarjeta-cabeza"><h3>Productos por agotarse</h3><a class="chico" href="${esAdmin ? "#inventario" : "#productos"}">Ver</a></div>
                    ${bajos.length ? `<ul class="lista-simple">${bajos.slice(0, 8).map(p => `
                        <li><span>${esc(p.nombre)}</span><span class="badge ${Number(p.stock) <= 0 ? "b-peligro" : "b-aviso"}">${esc(textoStock(p))}</span></li>`).join("")}</ul>`
                        : vacioHTML("check", "Todo con stock", "Ningún producto está bajo su mínimo.")}
                </div>
            </div>
        `;

        const instalar = $("#inInstalarSi");

        if (instalar) {
            instalar.addEventListener("click", () => Instalacion.instalar());
            $("#inInstalarNo").addEventListener("click", () => {
                DB.guardar("avisoInstalarVisto", true);
                $("#inInstalar").remove();
            });
        }

        const abrir = $("#inAbrirCaja");

        if (abrir) abrir.addEventListener("click", () => abrirCajaModal(() => App.refrescar()));
    }
};


Modulos.inicio = {
    titulo: "Inicio",
    icono: "inicio",
    roles: ["admin", "vendedor"],
    render: vista => Inicio.render(vista)
};
