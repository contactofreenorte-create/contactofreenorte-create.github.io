// ==========================================
// SPORTPOS — CELULAR
// Lector de códigos con la cámara, instalar
// como aplicación y compartir comprobantes
// ==========================================

"use strict";

const URL_LECTOR =
    "https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/zxing-browser.min.js";


function cargarScript(url) {

    return new Promise(
        (resolver, rechazar) => {

            const existente = document.querySelector(`script[src="${url}"]`);

            if (existente && existente.dataset.listo) {
                resolver();
                return;
            }

            const script = existente || document.createElement("script");

            script.addEventListener("load", () => { script.dataset.listo = "1"; resolver(); });
            script.addEventListener("error", () => rechazar(new Error("No se pudo cargar el lector. Revise la conexión a internet.")));

            if (!existente) {
                script.src = url;
                document.head.appendChild(script);
            }
        }
    );
}


// ==========================================
// LECTOR DE CÓDIGO DE BARRAS CON LA CÁMARA
// Android: lector del navegador. iPhone: librería ZXing.
// ==========================================

function escanearCodigo() {

    return new Promise(
        resolver => {

            if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {

                abrirModal({
                    titulo: "Cámara no disponible",
                    clase: "angosto",
                    html: `<p>Para usar la cámara como lector, abra el sistema desde su dirección de internet (que empieza con <strong>https://</strong>).</p>
                           <p class="texto-2 chico" style="margin-top:10px">Mientras tanto puede escribir el código o usar una pistola lectora.</p>`,
                    botones: [{ texto: "Entendido", clase: "btn-primario" }],
                    alCerrar: () => resolver(null)
                });

                return;
            }

            let terminado = false;
            let flujo = null;
            let controles = null;
            let temporizador = null;
            let resultado = null;

            const detener = () => {
                terminado = true;
                clearTimeout(temporizador);
                if (controles) { try { controles.stop(); } catch (e) { /* ya detenido */ } }
                if (flujo) flujo.getTracks().forEach(pista => pista.stop());
            };

            const { raiz, cerrar } = abrirModal({
                titulo: "Escanear código de barras",
                html: `
                    <div class="escaner">
                        <video id="escVideo" playsinline muted autoplay></video>
                        <div class="escaner-marco"></div>
                    </div>
                    <p class="centro texto-2" id="escEstado" style="margin-top:12px">Abriendo la cámara…</p>
                `,
                botones: [{ texto: "Cancelar" }],
                alCerrar: () => {
                    detener();
                    resolver(resultado);
                }
            });

            const video = $("#escVideo", raiz);
            const estado = $("#escEstado", raiz);

            const encontrado = codigo => {

                if (terminado || !codigo) return;

                resultado = String(codigo).trim();

                if (navigator.vibrate) navigator.vibrate(80);

                cerrar();
            };

            const fallar = error => {

                if (terminado) return;

                const permiso =
                    error && (error.name === "NotAllowedError" || error.name === "SecurityError");

                const sinCamara =
                    error && (error.name === "NotFoundError" || error.name === "OverconstrainedError");

                const ocupada =
                    error && error.name === "NotReadableError";

                estado.innerHTML =
                    `<span class="rojo">${
                        permiso ? "No hay permiso para usar la cámara. Actívelo en los ajustes del navegador."
                        : sinCamara ? "No se encontró una cámara en este equipo."
                        : ocupada ? "La cámara está siendo usada por otra aplicación."
                        : "No se pudo abrir la cámara. " + esc(error && error.message ? error.message : "")
                    }</span>`;
            };

            const camara = { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false };


            (async () => {

                try {

                    // Lector incluido en el navegador (Chrome en Android)
                    let detector = null;

                    if ("BarcodeDetector" in window) {

                        const formatos = await BarcodeDetector.getSupportedFormats();

                        if (formatos.includes("ean_13")) {
                            detector = new BarcodeDetector({
                                formats: formatos.filter(f => ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"].includes(f))
                            });
                        }
                    }

                    if (detector) {

                        flujo = await navigator.mediaDevices.getUserMedia(camara);

                        if (terminado) { detener(); return; }

                        video.srcObject = flujo;
                        await video.play();

                        estado.textContent = "Apunte al código de barras";

                        const buscar = async () => {

                            if (terminado) return;

                            try {
                                const codigos = await detector.detect(video);
                                if (codigos.length) {
                                    encontrado(codigos[0].rawValue);
                                    return;
                                }
                            } catch (e) {
                                // cuadro aún no listo
                            }

                            temporizador = setTimeout(buscar, 150);
                        };

                        buscar();
                        return;
                    }


                    // iPhone y otros: librería ZXing
                    estado.textContent = "Cargando lector…";

                    await cargarScript(URL_LECTOR);

                    if (terminado) return;

                    const lector = new ZXingBrowser.BrowserMultiFormatReader();

                    controles = await lector.decodeFromConstraints(
                        camara,
                        video,
                        resultadoLectura => {
                            if (resultadoLectura) encontrado(resultadoLectura.getText());
                        }
                    );

                    if (terminado) { detener(); return; }

                    estado.textContent = "Apunte al código de barras";

                } catch (error) {
                    fallar(error);
                }
            })();
        }
    );
}


// ==========================================
// INSTALAR COMO APLICACIÓN
// ==========================================

const Instalacion = {

    evento: null,

    instalada() {
        return (
            window.matchMedia("(display-mode: standalone)").matches ||
            window.navigator.standalone === true
        );
    },

    posible() {
        return Boolean(this.evento) || (esIOS() && !this.instalada());
    },

    async instalar() {

        if (this.evento) {

            this.evento.prompt();

            const eleccion = await this.evento.userChoice;

            this.evento = null;

            if (eleccion.outcome === "accepted") {
                avisar("Aplicación instalada.");
            }

            return;
        }

        this.instrucciones();
    },

    instrucciones() {

        abrirModal({
            titulo: "Instalar en su celular",
            html: `
                <div class="seccion-form" style="margin-bottom:10px">iPhone o iPad (Safari)</div>
                <ol style="margin:0 0 18px;padding-left:20px;line-height:1.9">
                    <li>Toque el botón <strong>Compartir</strong> (cuadrado con una flecha hacia arriba).</li>
                    <li>Elija <strong>Agregar a pantalla de inicio</strong>.</li>
                    <li>Toque <strong>Agregar</strong>.</li>
                </ol>
                <div class="seccion-form" style="margin-bottom:10px">Android (Chrome)</div>
                <ol style="margin:0;padding-left:20px;line-height:1.9">
                    <li>Toque el menú <strong>⋮</strong> arriba a la derecha.</li>
                    <li>Elija <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla principal</strong>.</li>
                </ol>
                <div class="mensaje-info" style="margin-top:16px">
                    Quedará un ícono como cualquier aplicación y se abrirá a pantalla completa.
                </div>
            `,
            botones: [{ texto: "Entendido", clase: "btn-primario" }]
        });
    }
};


window.addEventListener("beforeinstallprompt", evento => {
    evento.preventDefault();
    Instalacion.evento = evento;
});


// Funciona sin internet y se puede instalar (solo publicado en internet)
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {

    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(error => console.warn("Sin modo sin conexión:", error));
    });
}


// Pide al navegador que no borre los datos si falta espacio
if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
}


// ==========================================
// COMPARTIR COMPROBANTE (WhatsApp, correo…)
// ==========================================

function textoVenta(venta) {

    const config = Datos.config();

    return [
        config.nombre || "Tienda",
        "Comprobante N° " + String(venta.numero).padStart(6, "0") + " · " + fechaHora(venta.fecha),
        "",
        ...venta.items.map(i => `${i.cantidad} x ${i.nombre}: ${dinero(i.subtotal)}`),
        "",
        venta.descuento ? "Descuento: -" + dinero(venta.descuento) : "",
        venta.iva ? "IVA (19%): " + dinero(venta.iva) : "",
        "TOTAL: " + dinero(venta.total),
        "Pago: " + ((METODOS_PAGO[venta.metodo] || {}).texto || venta.metodo),
        venta.estado === "anulada" ? "*** VENTA ANULADA ***" : "",
        "",
        config.mensajeBoleta || "Gracias por su compra"
    ].filter((linea, i, lista) => linea !== "" || lista[i - 1] !== "").join("\n");
}


async function compartirVenta(venta) {

    // La boleta se comparte como PDF (cuadro "PDF listo" con Compartir / Descargar)
    if (typeof Impresion !== "undefined" && window.FN_PDF_WEB) {
        Impresion.boleta(venta);
        return;
    }

    const texto = textoVenta(venta);

    if (navigator.share) {

        try {
            await navigator.share({ title: "Comprobante de venta", text: texto });
            return;
        } catch (error) {
            if (error && error.name === "AbortError") return;
        }
    }

    window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank");
}
