// ==========================================
// JOYAPOS — IMPRESIÓN
// Comprobantes, orden de trabajo, hoja de
// laboratorio, receta, cierre y listados
// ==========================================

"use strict";

const Impresion = {

    cabecera(config, centrado = true) {

        return `
            <div class="cab ${centrado ? "centro" : ""}">
                ${config.logo ? `<img src="${config.logo}" class="logo" alt="">` : ""}
                <div class="nombre">${esc(config.nombre || "Tienda")}</div>
                ${config.razonSocial ? `<div>${esc(config.razonSocial)}</div>` : ""}
                ${config.rut ? `<div>RUT ${esc(config.rut)}</div>` : ""}
                ${config.direccion ? `<div>${esc(config.direccion)}${config.comuna ? ", " + esc(config.comuna) : ""}</div>` : ""}
                ${config.telefono ? `<div>Tel. ${esc(config.telefono)}</div>` : ""}
            </div>
        `;
    },


    ticket(cuerpo, ancho) {

        const mm = ancho === "58" ? 58 : 80;

        return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Comprobante</title>
<style>
    @page { size: ${mm}mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    body { font-family: "Consolas", "Courier New", monospace; font-size: ${mm === 58 ? 10 : 11.5}px; color: #000; margin: 0; width: ${mm - 6}mm; }
    .centro { text-align: center; }
    .cab .nombre { font-size: 1.35em; font-weight: 700; margin: 2px 0; }
    .logo { max-width: 60%; max-height: 60px; margin-bottom: 4px; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td, th { vertical-align: top; padding: 1px 0; }
    .d { text-align: right; white-space: nowrap; }
    .total td { font-size: 1.3em; font-weight: 700; padding-top: 4px; }
    .peq { font-size: 0.88em; }
    .titulo { font-weight: 700; font-size: 1.1em; }
    .grad th, .grad td { border: 1px solid #000; text-align: center; padding: 2px; font-size: 0.9em; }
</style></head><body>${cuerpo}</body></html>`;
    },


    boleta(venta) {

        const config = Datos.config();

        const cuerpo = `
            ${this.cabecera(config)}
            <hr>
            <div class="centro titulo">COMPROBANTE DE VENTA</div>
            <div class="centro">N° ${String(venta.numero).padStart(6, "0")}</div>
            <div class="centro peq">${fechaHora(venta.fecha)} · Atendió: ${esc(venta.usuarioNombre)}</div>
            ${venta.clienteNombre ? `<div class="centro peq">Cliente: ${esc(venta.clienteNombre)}</div>` : ""}
            ${venta.estado === "anulada" ? '<div class="centro titulo">*** VENTA ANULADA ***</div>' : ""}
            <hr>
            <table>
                ${venta.items.map(i => `
                    <tr><td colspan="2">${esc(i.nombre)}</td></tr>
                    <tr><td class="peq">&nbsp;${i.cantidad} x ${dinero(i.precio)}</td><td class="d">${dinero(i.subtotal)}</td></tr>`).join("")}
            </table>
            <hr>
            <table>
                ${venta.descuento ? `<tr><td>Subtotal</td><td class="d">${dinero(venta.subtotal)}</td></tr><tr><td>Descuento</td><td class="d">-${dinero(venta.descuento)}</td></tr>` : ""}
                <tr><td>Neto</td><td class="d">${dinero(venta.total - ivaDe(venta))}</td></tr><tr><td>IVA (19%)</td><td class="d">${dinero(ivaDe(venta))}</td></tr>
                <tr class="total"><td>TOTAL</td><td class="d">${dinero(venta.total)}</td></tr>
                <tr><td>${esc((METODOS_PAGO[venta.metodo] || {}).texto || venta.metodo)}</td><td class="d">${dinero(venta.metodo === "efectivo" ? venta.recibido : venta.total)}</td></tr>
                ${venta.metodo === "efectivo" ? `<tr><td>Vuelto</td><td class="d">${dinero(venta.vuelto)}</td></tr>` : ""}
            </table>
            <div class="peq">IVA incluido en el total</div>
            <hr>
            <div class="centro">${esc(config.mensajeBoleta || "Gracias por su compra")}</div>
            <div class="centro peq" style="margin-top:4px">Documento interno, no válido como boleta</div>
        `;

        imprimirHTML(this.ticket(cuerpo, config.anchoPapel));
    },


    cierre(cierre) {

        const config = Datos.config();
        const r = cierre.resumen;

        const cuerpo = `
            ${this.cabecera(config)}
            <hr>
            <div class="centro titulo">CIERRE DE CAJA N° ${cierre.numero}</div>
            <hr>
            <table>
                <tr><td>Apertura</td><td class="d">${fechaHora(cierre.abiertaEn)}</td></tr>
                <tr><td>Abrió</td><td class="d">${esc(cierre.abiertaPor)}</td></tr>
                <tr><td>Cierre</td><td class="d">${fechaHora(cierre.cerradaEn)}</td></tr>
                <tr><td>Cerró</td><td class="d">${esc(cierre.cerradaPor)}</td></tr>
            </table>
            <hr>
            <table>
                <tr><td>Ventas (${r.cantidadVentas})</td><td class="d">${dinero(r.totalVentas)}</td></tr>
                ${r.cantidadAbonos ? `<tr><td>Abonos (${r.cantidadAbonos})</td><td class="d">${dinero(r.totalAbonos - r.totalDevoluciones)}</td></tr>` : ""}
                <tr><td>&nbsp;Efectivo</td><td class="d">${dinero(r.porMetodo.efectivo)}</td></tr>
                <tr><td>&nbsp;Débito</td><td class="d">${dinero(r.porMetodo.debito)}</td></tr>
                <tr><td>&nbsp;Crédito</td><td class="d">${dinero(r.porMetodo.credito)}</td></tr>
                <tr><td>&nbsp;Transferencia</td><td class="d">${dinero(r.porMetodo.transferencia)}</td></tr>
            </table>
            <hr>
            <table>
                <tr><td>Fondo inicial</td><td class="d">${dinero(cierre.fondoInicial)}</td></tr>
                <tr><td>+ Efectivo</td><td class="d">${dinero(r.porMetodo.efectivo)}</td></tr>
                <tr><td>+ Ingresos</td><td class="d">${dinero(r.ingresos)}</td></tr>
                <tr><td>- Retiros</td><td class="d">${dinero(r.retiros)}</td></tr>
                <tr class="total"><td>Esperado</td><td class="d">${dinero(r.efectivoEsperado)}</td></tr>
                <tr><td>Contado</td><td class="d">${dinero(cierre.contado)}</td></tr>
                <tr class="total"><td>Diferencia</td><td class="d">${dinero(cierre.diferencia)}</td></tr>
            </table>
            ${cierre.observacion ? `<hr><div class="peq">Obs.: ${esc(cierre.observacion)}</div>` : ""}
            <hr><br><br>
            <div class="centro">______________________</div>
            <div class="centro peq">Firma</div>
        `;

        imprimirHTML(this.ticket(cuerpo, config.anchoPapel));
    },


    documento(titulo, subtitulo, contenido) {

        const config = Datos.config();

        imprimirHTML(`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>
    @page { size: letter; margin: 14mm; }
    body { font-family: "Segoe UI", Arial, sans-serif; font-size: 11px; color: #111; margin: 0; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #a16207; padding-bottom: 10px; margin-bottom: 14px; gap: 20px; }
    .cab .nombre { font-size: 16px; font-weight: 700; }
    .logo { max-height: 50px; max-width: 120px; float: left; margin-right: 10px; }
    h1 { font-size: 17px; margin: 0; color: #3730a3; text-align: right; }
    .sub { color: #555; text-align: right; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #fefce8; text-align: left; padding: 6px; font-size: 10.5px; border-bottom: 1px solid #fde047; }
    td { padding: 5px 6px; border-bottom: 1px solid #e0e6ef; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    .pie { margin-top: 18px; color: #777; font-size: 10px; }
</style></head><body>
    <div class="top">
        <div>${this.cabecera(config, false)}</div>
        <div><h1>${esc(titulo)}</h1><div class="sub">${esc(subtitulo || "")}</div></div>
    </div>
    ${contenido}
    <div class="pie">Impreso el ${fechaHora(new Date().toISOString())} por ${esc(Sesion.nombre())} · ${SISTEMA.nombre}</div>
</body></html>`);
    }
};

// IVA de una venta u orden: el guardado, o el que viene incluido en el total (19 %)
function ivaDe(doc) {
    return doc.iva > 0 ? doc.iva : Math.round(doc.total - doc.total / 1.19);
}
