// ==========================================
// TECNOPOS — CONFIGURACIÓN DEL RUBRO (electrónica y repuestos de celulares)
// ==========================================

window.RUBRO = {

    clave: "tecno",
    rolVendedor: "Técnico / Vendedor",
    colecciones: ["clientes", "activos", "ordenes"],
    documentos: [],

    bienvenida: {
        titulo: "Repuestos y servicio técnico, sin enredos.",
        texto: "Venda repuestos y accesorios por modelo, reciba equipos con su IMEI, haga el presupuesto, avise cuando estén listos y entregue con garantía.",
        puntos: [["celular", "Servicio técnico con IMEI y estados"], ["inventario", "Repuestos por modelo compatible"], ["dinero", "Abonos, cobro y garantía de reparación"], ["codigo", "Lector de códigos con la cámara"]]
    },

    categorias: [
        "Pantallas y displays", "Baterías", "Cargadores y cables", "Pines y flex de carga", "Placas y componentes",
        "Cámaras y parlantes", "Carcasas y tapas", "Fundas y protectores", "Audífonos", "Memorias y almacenamiento",
        "Equipos usados", "Accesorios", "Herramientas e insumos", "Servicios", "Varios"
    ],

    unidades: ["unidad", "par", "juego", "metro"],

    ejemploNombre: "Pantalla Samsung A14 con marco",

    camposProducto: [
        { id: "compat", etiqueta: "Compatible con (modelos)", placeholder: "Samsung A14 · A14 5G", enLista: true, ancho: 2 },
        { id: "calidad", etiqueta: "Calidad", tipo: "opcion", opciones: ["Original", "Premium", "Genérico", "Usado / reacondicionado"], enLista: true },
        { id: "ubicacion", etiqueta: "Ubicación", placeholder: "Cajón 3" }
    ],

    ejemploImportar: ["Pantalla Samsung A14", "Pantallas y displays", "Samsung", "Samsung A14 · A14 5G", "Premium", "Cajón 3", "7801234567890", "29990", "17000", "6", "2", "unidad"],

    menu: [
        { grupo: "Venta y servicio", modulos: ["inicio", "vender", "ordenes", "clientes", "ventas", "caja"] },
        { grupo: "Repuestos", modulos: ["productos", "inventario"] },
        { grupo: "Gestión", modulos: ["reportes", "configuracion"] }
    ],

    ordenes: {
        titulo: "Servicio técnico",
        menu: "Servicio técnico",
        subtitulo: "Equipos recibidos: diagnóstico, presupuesto, reparación y entrega con garantía.",
        singular: "orden",
        plural: "órdenes",
        problema: "Falla informada por el cliente",
        problemaEjemplo: "No carga, pantalla rota, se moja, no enciende…",
        diagnostico: "Diagnóstico y reparación realizada",

        objeto: {
            nombre: "Equipo",
            plural: "Equipos",
            etiquetaClave: "IMEI / N° de serie",
            clave: "imei",
            campos: [
                { id: "imei", etiqueta: "IMEI / N° de serie", requerido: true, mayus: true, placeholder: "35xxxxxxxxxxxxx", ancho: 2 },
                { id: "tipoEquipo", etiqueta: "Tipo", tipo: "opcion", opciones: ["Celular", "Tablet", "Notebook", "Consola", "Televisor", "Audio", "Otro"] },
                { id: "marca", etiqueta: "Marca", requerido: true, placeholder: "Samsung" },
                { id: "modelo", etiqueta: "Modelo", requerido: true, placeholder: "Galaxy A14" },
                { id: "color", etiqueta: "Color", placeholder: "Negro" }
            ],
            titulo: a => [a.tipoEquipo, a.marca, a.modelo, a.color].filter(Boolean).join(" ")
        },

        camposOrden: [
            { id: "accesorios", etiqueta: "Accesorios recibidos", placeholder: "Chip, bandeja, funda, cargador…", ancho: 2 },
            { id: "estadoFisico", etiqueta: "Estado físico al recibir", placeholder: "Pantalla trizada, golpe en esquina…", ancho: 2 },
            { id: "bloqueo", etiqueta: "¿Tiene clave o patrón?", tipo: "opcion", opciones: ["No", "Sí, el cliente la entrega al retirar", "Sí, la dio para probar"] },
            { id: "fechaPrometida", etiqueta: "Fecha prometida", tipo: "fecha" }
        ],

        estados: [
            { id: "recibido", texto: "Recibido", clase: "b-azul" },
            { id: "diagnostico", texto: "En diagnóstico", clase: "b-aviso" },
            { id: "presupuesto", texto: "Presupuesto enviado", clase: "b-cheque" },
            { id: "aprobado", texto: "Aprobado", clase: "b-simple" },
            { id: "repuesto", texto: "Esperando repuesto", clase: "b-retenida" },
            { id: "reparacion", texto: "En reparación", clase: "b-frio" },
            { id: "lista", texto: "Lista para retirar", clase: "b-ok" },
            { id: "entregado", texto: "Entregado", clase: "b-libre" }
        ],
        estadoInicial: "recibido",
        estadoLista: "lista",
        estadoFinal: "entregado",

        garantiaDias: 90,
        textoGarantia: "Garantía de 90 días en la reparación y en los repuestos instalados. No cubre humedad, golpes ni intervención de terceros.",
        condiciones: "Se recomienda respaldar la información: el servicio no se responsabiliza por datos perdidos. Los equipos no retirados dentro de 60 días desde el aviso se consideran abandonados. Equipos con humedad pueden fallar después de la reparación.",

        manoObra: [
            { nombre: "Diagnóstico", precio: 5000 },
            { nombre: "Cambio de pantalla (mano de obra)", precio: 15000 },
            { nombre: "Cambio de batería (mano de obra)", precio: 10000 },
            { nombre: "Cambio de pin de carga", precio: 18000 },
            { nombre: "Limpieza por humedad", precio: 20000 },
            { nombre: "Actualización de software", precio: 10000 },
            { nombre: "Respaldo de información", precio: 8000 }
        ]
    }
};
