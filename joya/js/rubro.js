// ==========================================
// JOYAPOS — CONFIGURACIÓN DEL RUBRO (joyería)
// ==========================================

window.MATERIALES_PRECIO = ["Oro 24k", "Oro 18k", "Oro 14k", "Oro 10k", "Plata 925", "Plata 950"];
window.MATERIALES = [...window.MATERIALES_PRECIO, "Acero quirúrgico", "Plaqué", "Bijouterie", "Otro"];

// Ley (pureza) de cada material, para calcular desde el oro fino
window.LEY = { "Oro 24k": 1, "Oro 18k": 0.75, "Oro 14k": 0.585, "Oro 10k": 0.417, "Plata 925": 0.925, "Plata 950": 0.95 };

window.PRECIOS_EJEMPLO = { valores: { "Oro 24k": 80000, "Oro 18k": 60000, "Oro 14k": 46800, "Oro 10k": 33400, "Plata 925": 1200, "Plata 950": 1250 }, margen: 45, compra: 70, actualizado: "" };

function preciosDelDia() {
    const p = DB.leer("precios", null);
    return p && p.valores ? p : null;
}

window.RUBRO = {

    clave: "joya",
    rolVendedor: "Vendedor",
    colecciones: ["clientes", "activos", "ordenes", "compras"],
    documentos: ["precios"],

    bienvenida: {
        titulo: "Su joyería, con el valor del día al instante.",
        texto: "Precios por peso y material con el valor del oro y la plata del día, compra de oro usado, arreglos, apartados con abonos y caja.",
        puntos: [["dinero", "Precio del día del oro y la plata"], ["inventario", "Joyas por material, peso y piedra"], ["cambio", "Compra de oro usado con comprobante"], ["herramienta", "Arreglos, grabados y apartados"]]
    },

    categorias: [
        "Anillos", "Argollas de matrimonio", "Aros", "Cadenas", "Colgantes y dijes", "Pulseras", "Brazaletes",
        "Relojes", "Conjuntos", "Piedras sueltas", "Estuches y accesorios", "Servicios", "Varios"
    ],

    unidades: ["unidad", "par", "gramo"],

    ejemploNombre: "Anillo solitario con circón",

    camposProducto: [
        { id: "material", etiqueta: "Material", tipo: "opcion", opciones: window.MATERIALES, enLista: true },
        { id: "peso", etiqueta: "Peso (gramos)", tipo: "numero", sufijo: "g", placeholder: "3,5", enLista: true },
        { id: "piedra", etiqueta: "Piedra / detalle", placeholder: "Circón blanco 4 mm", enLista: true, ancho: 2 },
        { id: "medida", etiqueta: "Medida / largo", placeholder: "N° 14 · 45 cm" },
        { id: "hechura", etiqueta: "Valor de la hechura ($)", tipo: "numero", placeholder: "15000" },
        { id: "autoPrecio", etiqueta: "Precio automático con el valor del día", tipo: "opcion", opciones: ["Sí", "No"] }
    ],

    ejemploImportar: ["Argolla matrimonio lisa", "Argollas de matrimonio", "", "Oro 18k", "4,2", "", "N° 16", "20000", "Sí", "7801234567890", "330000", "250000", "2", "1", "unidad"],

    // precio sugerido para el formulario de productos: peso x valor del gramo x (1 + margen) + hechura
    precioSugerido(p) {
        const pr = preciosDelDia();
        const peso = Number(p.peso);
        const v = pr && pr.valores ? Number(pr.valores[p.material]) : 0;
        if (!pr || !peso || !v) return null;
        return Math.round((peso * v * (1 + (Number(pr.margen) || 0) / 100) + (Number(p.hechura) || 0)) / 100) * 100;
    },

    menu: [
        { grupo: "Venta", modulos: ["inicio", "vender", "ventas", "ordenes", "caja"] },
        { grupo: "Joyas", modulos: ["productos", "inventario", "precios", "compraoro"] },
        { grupo: "Gestión", modulos: ["clientes", "reportes", "configuracion"] }
    ],

    ordenes: {
        titulo: "Arreglos y apartados",
        menu: "Arreglos y apartados",
        subtitulo: "Arreglos, grabados y limpieza, y joyas apartadas con abonos.",
        singular: "orden",
        plural: "órdenes",

        tipos: [
            {
                id: "arreglo", texto: "Arreglo, grabado o limpieza",
                problema: "Trabajo a realizar", problemaEjemplo: "Achicar argolla a N° 14, soldar cadena, grabar nombre…",
                diagnostico: "Trabajo realizado",
                objeto: {
                    nombre: "Pieza", plural: "Piezas", etiquetaClave: "Descripción", clave: "descripcion",
                    campos: [
                        { id: "descripcion", etiqueta: "Descripción de la pieza", requerido: true, placeholder: "Cadena de oro 45 cm", ancho: 2 },
                        { id: "material", etiqueta: "Material", tipo: "opcion", opciones: window.MATERIALES },
                        { id: "peso", etiqueta: "Peso al recibir (g)", tipo: "numero", placeholder: "5,2" }
                    ],
                    titulo: a => [a.descripcion, a.material].filter(Boolean).join(" · ")
                },
                camposOrden: [{ id: "fechaPrometida", etiqueta: "Fecha prometida", tipo: "fecha" }, { id: "observacion", etiqueta: "Observaciones", placeholder: "Piedra suelta, desgaste…", ancho: 2 }],
                estados: ["recibida", "taller", "lista", "entregada"], estadoInicial: "recibida", estadoLista: "lista", garantiaDias: 30
            },
            {
                id: "apartado", texto: "Apartado de joya (con abonos)",
                problema: "Joya(s) apartada(s) / observación", problemaEjemplo: "Anillo solitario N° 14, para el aniversario…",
                diagnostico: "Notas", objeto: null,
                camposOrden: [{ id: "fechaPrometida", etiqueta: "Retirar antes del", tipo: "fecha" }],
                estados: ["apartada", "lista", "entregada"], estadoInicial: "apartada", estadoLista: "lista", garantiaDias: 0
            }
        ],

        estados: [
            { id: "recibida", texto: "Recibida", clase: "b-azul" },
            { id: "taller", texto: "En el taller", clase: "b-frio" },
            { id: "apartada", texto: "Apartada", clase: "b-cheque" },
            { id: "lista", texto: "Lista para retirar", clase: "b-ok" },
            { id: "entregada", texto: "Entregada", clase: "b-libre" }
        ],
        estadoFinal: "entregada",
        estadoLista: "lista",

        textoGarantia: "Garantía de 30 días en el arreglo. No cubre golpes ni desgaste posterior.",
        condiciones: "Las piezas no retiradas en 90 días podrán cobrar costo de custodia. Los apartados se conservan hasta la fecha acordada.",

        manoObra: [
            { nombre: "Achicar o agrandar argolla / anillo", precio: 15000 },
            { nombre: "Soldadura de cadena o pulsera", precio: 8000 },
            { nombre: "Grabado (por palabra)", precio: 5000 },
            { nombre: "Limpieza y pulido", precio: 5000 },
            { nombre: "Cambio de piedra", precio: 12000 },
            { nombre: "Baño de rodio", precio: 18000 }
        ]
    }
};
