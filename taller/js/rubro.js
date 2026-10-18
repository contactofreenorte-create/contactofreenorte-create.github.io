// ==========================================
// TALLERPRO — CONFIGURACIÓN DEL RUBRO (taller mecánico)
// ==========================================

window.RUBRO = {

    clave: "taller",
    rolVendedor: "Mecánico / Recepción",
    colecciones: ["clientes", "activos", "ordenes"],
    documentos: [],

    bienvenida: {
        titulo: "Su taller, ordenado de punta a punta.",
        texto: "Ingrese cada vehículo, haga el presupuesto con repuestos y mano de obra, avise cuando esté listo y cobre. Todo en el computador y en el celular.",
        puntos: [["herramienta", "Órdenes de trabajo con estados y presupuesto"], ["usuarios", "Clientes y vehículos con su historial"], ["inventario", "Repuestos con stock y compatibilidad"], ["calendario", "Aviso de la próxima mantención"]]
    },

    categorias: [
        "Aceites y lubricantes", "Filtros", "Frenos", "Suspensión y dirección", "Motor", "Encendido y eléctrico",
        "Baterías", "Correas y distribución", "Refrigeración", "Embrague y transmisión", "Escape",
        "Neumáticos y llantas", "Iluminación", "Carrocería", "Accesorios", "Herramientas", "Servicios", "Varios"
    ],

    unidades: ["unidad", "litro", "juego", "par", "metro"],

    ejemploNombre: "Filtro de aceite Bosch 0 451 103 336",

    camposProducto: [
        { id: "compat", etiqueta: "Compatible con (marca, modelo, años)", placeholder: "Toyota Yaris 2012-2019 · Hyundai Accent", enLista: true, ancho: 2 },
        { id: "codigoFabrica", etiqueta: "Código de fábrica / OEM", placeholder: "04152-YZZA1" },
        { id: "ubicacion", etiqueta: "Ubicación en bodega", placeholder: "Estante B2" }
    ],

    ejemploImportar: ["Filtro de aceite Bosch", "Filtros", "Bosch", "Toyota Yaris 2012-2019", "04152-YZZA1", "B2", "7801234567890", "6990", "3500", "12", "4", "unidad"],

    menu: [
        { grupo: "Taller", modulos: ["inicio", "ordenes", "clientes", "vender", "ventas", "caja"] },
        { grupo: "Repuestos", modulos: ["productos", "inventario"] },
        { grupo: "Gestión", modulos: ["reportes", "configuracion"] }
    ],

    ordenes: {
        titulo: "Órdenes de trabajo",
        menu: "Órdenes de trabajo",
        subtitulo: "Vehículos en el taller: ingreso, presupuesto, repuestos, mano de obra y entrega.",
        singular: "orden",
        plural: "órdenes",
        problema: "Falla o trabajo solicitado",
        problemaEjemplo: "Ruido en el tren delantero, cambio de aceite y filtros…",
        diagnostico: "Diagnóstico y trabajo realizado",

        objeto: {
            nombre: "Vehículo",
            plural: "Vehículos",
            etiquetaClave: "Patente",
            clave: "patente",
            campos: [
                { id: "patente", etiqueta: "Patente", requerido: true, mayus: true, placeholder: "ABCD12" },
                { id: "marca", etiqueta: "Marca", requerido: true, placeholder: "Toyota" },
                { id: "modelo", etiqueta: "Modelo", requerido: true, placeholder: "Yaris" },
                { id: "anio", etiqueta: "Año", tipo: "numero", placeholder: "2015" },
                { id: "color", etiqueta: "Color", placeholder: "Gris" },
                { id: "km", etiqueta: "Kilometraje actual", tipo: "numero", placeholder: "85000" },
                { id: "vin", etiqueta: "N° de motor / VIN", ancho: 2 }
            ],
            titulo: a => [a.marca, a.modelo, a.anio, a.color].filter(Boolean).join(" ")
        },

        camposOrden: [
            { id: "kmIngreso", etiqueta: "Kilometraje al ingreso", tipo: "numero", requerido: true, placeholder: "85000" },
            { id: "fechaPrometida", etiqueta: "Fecha prometida", tipo: "fecha" },
            { id: "combustible", etiqueta: "Combustible", tipo: "opcion", opciones: ["Reserva", "1/4", "1/2", "3/4", "Lleno"] },
            { id: "pertenencias", etiqueta: "Pertenencias / daños a la vista", placeholder: "Rayón puerta derecha, rueda de repuesto…", ancho: 2 }
        ],

        estados: [
            { id: "ingresada", texto: "Ingresada", clase: "b-azul" },
            { id: "diagnostico", texto: "En diagnóstico", clase: "b-aviso" },
            { id: "presupuesto", texto: "Presupuesto enviado", clase: "b-cheque" },
            { id: "aprobada", texto: "Aprobada", clase: "b-simple" },
            { id: "repuestos", texto: "Esperando repuestos", clase: "b-retenida" },
            { id: "reparacion", texto: "En reparación", clase: "b-frio" },
            { id: "lista", texto: "Lista para entregar", clase: "b-ok" },
            { id: "entregada", texto: "Entregada", clase: "b-libre" }
        ],
        estadoInicial: "ingresada",
        estadoLista: "lista",
        estadoFinal: "entregada",

        garantiaDias: 30,
        textoGarantia: "Garantía de 30 días o 1.000 km en la mano de obra. Los repuestos tienen la garantía de su fabricante.",
        condiciones: "El taller no se responsabiliza por objetos de valor dejados en el vehículo. Los vehículos no retirados dentro de 30 días desde el aviso generan costo de estacionamiento.",

        recordatorio: { dias: 180, km: 10000, mensaje: "Hola {cliente}, de parte del taller: se acerca la próxima mantención de su {objeto} {detalle}. Escríbanos y agendamos." },

        manoObra: [
            { nombre: "Cambio de aceite y filtro", precio: 25000 },
            { nombre: "Revisión general", precio: 15000 },
            { nombre: "Cambio de pastillas de freno", precio: 30000 },
            { nombre: "Alineación y balanceo", precio: 28000 },
            { nombre: "Diagnóstico con scanner", precio: 20000 },
            { nombre: "Cambio de correa de distribución", precio: 90000 },
            { nombre: "Mano de obra por hora", precio: 18000 }
        ]
    }
};
