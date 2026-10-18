// ==========================================
// JOYAPOS - PDF EN IPHONE, NAVEGADOR Y WINDOWS
//
// "Imprimir" (boleta, comprobante de posventa, cierre de caja, listados) genera un PDF.
// Luego se puede Compartir (WhatsApp / correo, si el equipo lo permite), Descargar o Imprimir.
// En la app de Android lo hace android-pdf.js (este archivo no hace nada ahi).
// ==========================================

(function () {
    "use strict";

    const prueba = typeof window.__FN_PDF_PRUEBA === "object" ? window.__FN_PDF_PRUEBA : null;
    const cap = window.Capacitor;
    const esNativo = !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());

    if (esNativo || prueba) return;

    const PX_POR_MM = 96 / 25.4;

    function avisar(texto, tipo) {
        const f = window.avisar || window.aviso;
        if (typeof f === "function") {
            try { f(texto, tipo || "ok"); return; } catch (e) { /* sin aviso */ }
        }
    }

    function limpiarNombre(texto) {
        return String(texto || "documento")
            .normalize("NFD").replace(/[̀-ͯ]/g, "")
            .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
            .slice(0, 60) || "documento";
    }

    function marcaDeTiempo() {
        const d = new Date();
        const p = n => String(n).padStart(2, "0");
        return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
    }

    // Decide el papel segun el CSS del documento (@page)
    function leerPapel(html) {
        const ticket = html.match(/size:\s*(\d+(?:\.\d+)?)mm\s+auto/i);
        if (ticket) {
            // el margen de @page (3 mm en los tickets) se respeta: antes el texto quedaba pegado al borde
            const mt = html.match(/@page[^}]*margin:\s*(\d+(?:\.\d+)?)mm/i);
            return { tipo: "ticket", mm: parseFloat(ticket[1]), margen: mt ? parseFloat(mt[1]) : 3 };
        }

        if (/size:\s*letter/i.test(html)) {
            const m = html.match(/@page[^}]*margin:\s*(\d+(?:\.\d+)?)mm/i);
            return { tipo: "hoja", w: 215.9, h: 279.4, margen: m ? parseFloat(m[1]) : 14 };
        }
        if (/size:\s*A4/i.test(html)) {
            const m = html.match(/@page[^}]*margin:\s*(\d+(?:\.\d+)?)mm/i);
            return { tipo: "hoja", w: 210, h: 297, margen: m ? parseFloat(m[1]) : 14 };
        }
        // comprobantes angostos (sin tamano de papel): se arma como un ticket ancho
        return { tipo: "ticket", mm: 105, margen: 2 };
    }

    function esperarImagenes(doc) {
        return Promise.all(Array.from(doc.images).map(img =>
            img.complete ? null : new Promise(res => { img.onload = img.onerror = res; })
        ));
    }

    async function renderizar(html, papel) {

        const anchoMm = papel.tipo === "ticket" ? papel.mm : papel.w;
        const anchoPx = Math.round(anchoMm * PX_POR_MM);

        const marco = document.createElement("iframe");
        marco.setAttribute("aria-hidden", "true");
        marco.style.cssText = `position:fixed;left:-30000px;top:0;border:0;width:${anchoPx}px;height:300px;background:#fff`;
        document.body.appendChild(marco);

        try {
            const doc = marco.contentDocument;
            doc.open();
            doc.write(html);
            doc.close();

            await new Promise(res => {
                if (doc.readyState === "complete") res();
                else { marco.onload = res; setTimeout(res, 1500); }
            });
            await Promise.race([esperarImagenes(doc), new Promise(res => setTimeout(res, 2000))]);
            if (doc.fonts && doc.fonts.ready) { await Promise.race([doc.fonts.ready, new Promise(res => setTimeout(res, 800))]); }

            const cuerpo = doc.body;
            cuerpo.style.boxSizing = "border-box";
            cuerpo.style.width = anchoPx + "px";
            if (papel.margen) cuerpo.style.padding = papel.margen + "mm";
            cuerpo.style.background = "#fff";

            const alto = Math.max(Math.ceil(cuerpo.getBoundingClientRect().height), 50);
            marco.style.height = alto + "px";

            const lienzo = await window.html2canvas(cuerpo, {
                scale: papel.tipo === "ticket" ? 3 : 2,
                backgroundColor: "#ffffff",
                useCORS: true,
                logging: false,
                width: anchoPx,
                height: alto,
                windowWidth: anchoPx,
                windowHeight: alto
            });

            return lienzo;
        } finally {
            marco.remove();
        }
    }

    function crearPDF(lienzo, papel) {

        const { jsPDF } = window.jspdf;

        if (papel.tipo === "ticket") {
            const w = papel.mm;
            const h = Math.max(40, lienzo.height * w / lienzo.width);
            const pdf = new jsPDF({
                unit: "mm",
                format: [Math.min(w, h), Math.max(w, h)],
                orientation: h >= w ? "p" : "l",
                compress: true
            });
            pdf.addImage(lienzo.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, w, lienzo.height * w / lienzo.width);
            return pdf;
        }

        // hoja carta/A4: se parte en paginas
        const pdf = new jsPDF({ unit: "mm", format: [papel.w, papel.h], orientation: "p", compress: true });
        const pxPorPagina = Math.floor(lienzo.width * papel.h / papel.w);
        let y = 0;
        let primera = true;

        while (y < lienzo.height) {
            const alto = Math.min(pxPorPagina, lienzo.height - y);
            const trozo = document.createElement("canvas");
            trozo.width = lienzo.width;
            trozo.height = alto;
            const ctx = trozo.getContext("2d");
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, trozo.width, trozo.height);
            ctx.drawImage(lienzo, 0, y, lienzo.width, alto, 0, 0, lienzo.width, alto);

            if (!primera) pdf.addPage([papel.w, papel.h], "p");
            pdf.addImage(trozo.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, papel.w, alto * papel.w / lienzo.width);
            primera = false;
            y += alto;
        }
        return pdf;
    }

    function nombreDelDocumento(html) {
        const t = html.match(/<title>([^<]*)<\/title>/i);
        const titulo = t ? t[1].replace(/&[a-z#0-9]+;/gi, " ") : "Documento";
        const n = html.match(/N[°º]\s*(\d{1,9})/);
        return { titulo: titulo.trim() || "Documento", numero: n ? n[1] : "" };
    }

    const imprimirOriginal = typeof window.imprimirHTML === "function" ? window.imprimirHTML : null;

    async function entregar(nombreArchivo, base64, titulo, html) {

        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const archivo = new File([bytes], nombreArchivo, { type: "application/pdf" });
        const url = URL.createObjectURL(archivo);
        const puedeCompartir = !!(navigator.canShare && navigator.share && navigator.canShare({ files: [archivo] }));

        const descargar = () => {
            const enlace = document.createElement("a");
            enlace.href = url;
            enlace.download = nombreArchivo;
            document.body.appendChild(enlace);
            enlace.click();
            enlace.remove();
        };

        if (typeof window.abrirModal !== "function") { descargar(); return; }

        window.abrirModal({
            titulo: "PDF listo",
            clase: "angosto",
            html: '<p class="texto-2" style="margin:0 0 6px">El documento se generó como <strong>PDF</strong>.</p>' +
                  '<p class="chico texto-3" style="margin:0;word-break:break-all">' + nombreArchivo + '</p>' +
                  (puedeCompartir ? '<p class="chico texto-2" style="margin:10px 0 0">Con «Compartir» puede enviarlo por WhatsApp, correo o guardarlo.</p>' : ""),
            alCerrar: () => setTimeout(() => URL.revokeObjectURL(url), 60000),
            botones: [
                ...(imprimirOriginal ? [{ texto: "Imprimir", icono: "impresora", accion: () => imprimirOriginal(html) }] : []),
                { texto: "Descargar PDF", icono: "descargar", accion: () => descargar() },
                ...(puedeCompartir ? [{
                    texto: "Compartir",
                    icono: "compartir",
                    clase: "btn-primario",
                    accion: async () => {
                        try { await navigator.share({ files: [archivo], title: titulo }); }
                        catch (e) { if (!/abort|cancel/i.test(String((e && e.name) || e))) descargar(); }
                    }
                }] : [{ texto: "Cerrar", clase: "btn-primario" }])
            ]
        });
    }

    let ocupado = false;

    async function generarYCompartir(html) {

        if (ocupado) return;
        ocupado = true;

        try {
            avisar("Generando PDF…");

            const papel = leerPapel(html);
            const lienzo = await renderizar(html, papel);
            const pdf = crearPDF(lienzo, papel);

            const { titulo, numero } = nombreDelDocumento(html);
            const nombre = limpiarNombre(titulo) + (numero ? "-" + numero : "") + "-" + marcaDeTiempo() + ".pdf";
            const base64 = pdf.output("datauristring").split(",")[1];

            await entregar(nombre, base64, titulo, html);
        } catch (error) {
            if (error && /cancel|abort|dismiss/i.test(String(error.message || error))) return;
            console.error("No se pudo generar el PDF:", error);
            avisar("No se pudo generar el PDF: " + (error && error.message ? error.message : error), "error");
        } finally {
            ocupado = false;
        }
    }

    window.imprimirHTML = function (html) { return generarYCompartir(html); };
    window.FN_PDF_WEB = { generarYCompartir, leerPapel };
})();
