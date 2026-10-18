// ==========================================
// TECNOPOS — DATOS DE EJEMPLO
// Productos, clientes y órdenes de muestra para probar
// ==========================================

"use strict";

function codigoEAN(n) {

    const base = "780" + String(3000000 + n * 7919).padStart(9, "0").slice(-9);
    const suma = base.split("").reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);

    return base + ((10 - (suma % 10)) % 10);
}


// filas: arreglos; mapa(fila) devuelve los datos del producto
function productosDeEjemplo(filas, mapa) {

    const ahora = new Date().toISOString();

    return filas.map((f, i) => Object.assign({
        id: nuevoId() + i,
        activo: true,
        creado: ahora,
        controlaStock: true,
        codigoBarras: codigoEAN(i + 1)
    }, mapa(f, i)));
}


// defs: [{ cliente:{nombre,telefono,rut}, activo:{...datos}, tipo, problema, extra:{}, estado, diasAtras, items:[[nombreProducto, cantidad]], mano:[[nombre, precio]], abono, prometidaEnDias, diagnostico }]
function ordenesDeEjemplo(defs, productos) {

    const cfg = RUBRO.ordenes;
    const clientes = [];
    const activos = [];
    const ordenes = [];
    let numero = 0;

    defs.slice().reverse().forEach(d => {

        let cliente = clientes.find(c => c.nombre === d.cliente.nombre);

        if (!cliente) {
            cliente = Object.assign({ id: nuevoId() + "c" + clientes.length, correo: "", direccion: "", notas: "", creado: new Date().toISOString() }, d.cliente);
            clientes.push(cliente);
        }

        let activo = null;

        if (d.activo) {
            const clave = cfg.objeto.clave;
            activo = activos.find(a => a.datos[clave] === d.activo[clave]);
            if (!activo) {
                activo = { id: nuevoId() + "a" + activos.length, clienteId: cliente.id, datos: d.activo, creado: new Date().toISOString() };
                activos.push(activo);
            }
        }

        const fecha = new Date(Date.now() - (d.diasAtras || 0) * 86400000).toISOString();
        const items = [];

        (d.items || []).forEach(([nombre, cantidad]) => {
            const p = productos.find(x => x.nombre.startsWith(nombre));
            if (!p) return;
            if (p.controlaStock !== false) p.stock = Math.max(0, p.stock - cantidad);
            items.push({ id: nuevoId() + "i" + items.length, productoId: p.id, nombre: p.nombre, categoria: p.categoria, cantidad, precio: p.precio, costo: p.costo, tipo: "repuesto" });
        });

        (d.mano || []).forEach(([nombre, precio]) => items.push({ id: nuevoId() + "m" + items.length, productoId: null, nombre, categoria: "Mano de obra", cantidad: 1, precio, costo: 0, tipo: "mano" }));

        const tc = typeof tipoCfg === "function" ? tipoCfg(d.tipo) : cfg;
        const extra = Object.assign({}, d.extra || {});
        const prometida = d.prometidaEnDias !== undefined ? new Date(Date.now() + d.prometidaEnDias * 86400000).toISOString().slice(0, 10) : "";
        if (prometida) extra.fechaPrometida = prometida;

        numero++;

        ordenes.push({
            id: nuevoId() + "o" + numero,
            numero,
            fecha,
            tipo: d.tipo || undefined,
            clienteId: cliente.id,
            clienteNombre: cliente.nombre,
            activoId: activo ? activo.id : null,
            objetoTitulo: activo ? (tc.objeto || cfg.objeto).titulo(activo.datos) : (tc.texto || ""),
            etiqueta: activo ? String(activo.datos[(tc.objeto || cfg.objeto).clave] || "") : "",
            problema: d.problema,
            diagnostico: d.diagnostico || "",
            estado: d.estado,
            estados: [{ estado: tc.estadoInicial || tc.estados[0].id, fecha, usuario: "Administrador" }, ...(d.estado !== (tc.estadoInicial || tc.estados[0].id) ? [{ estado: d.estado, fecha, usuario: "Administrador" }] : [])],
            items,
            descuento: 0,
            abonos: d.abono ? [{ id: nuevoId() + "ab" + numero, fecha, monto: d.abono, metodo: "efectivo", cajaId: "ejemplo", usuarioNombre: "Administrador", nota: "" }] : [],
            extra,
            fechaPrometida: prometida,
            usuarioId: "ejemplo",
            usuarioNombre: "Administrador"
        });
    });

    ordenes.reverse();

    Datos.guardarClientes(clientes);
    Datos.guardarActivos(activos);
    Datos.guardarOrdenes(ordenes);
    DB.guardar("contadores", Object.assign(DB.leer("contadores", {}), { orden: numero }));
}


function cargarDatosEjemplo() {

    // [nombre, categoría, marca, precio, costo, stock, mínimo, unidad, compatible con, calidad]
    const filas = [
        ["Pantalla Samsung A14 con marco", "Pantallas y displays", "Samsung", 29990, 17000, 6, 2, "unidad", "Samsung Galaxy A14 · A14 5G", "Premium"],
        ["Pantalla Samsung A32 OLED", "Pantallas y displays", "Samsung", 44990, 27000, 3, 2, "unidad", "Samsung Galaxy A32 4G", "Original"],
        ["Pantalla iPhone 11", "Pantallas y displays", "Apple", 54990, 33000, 3, 2, "unidad", "iPhone 11", "Premium"],
        ["Pantalla Xiaomi Redmi Note 11", "Pantallas y displays", "Xiaomi", 34990, 20500, 4, 2, "unidad", "Redmi Note 11 · 11S", "Premium"],
        ["Pantalla Motorola G22", "Pantallas y displays", "Motorola", 27990, 16000, 4, 2, "unidad", "Moto G22 · E32", "Genérico"],
        ["Batería Samsung A14", "Baterías", "Samsung", 14990, 8500, 8, 3, "unidad", "Samsung Galaxy A14 · A24", "Premium"],
        ["Batería iPhone 11", "Baterías", "Apple", 24990, 14500, 5, 2, "unidad", "iPhone 11", "Premium"],
        ["Batería Xiaomi Redmi Note 11", "Baterías", "Xiaomi", 15990, 9000, 6, 3, "unidad", "Redmi Note 11 · 11S", "Genérico"],
        ["Pin de carga USB-C Samsung A-series", "Pines y flex de carga", "Samsung", 6990, 3200, 15, 5, "unidad", "Samsung A12 · A13 · A14 · A22", "Genérico"],
        ["Flex de carga iPhone 11", "Pines y flex de carga", "Apple", 12990, 7000, 6, 3, "unidad", "iPhone 11", "Premium"],
        ["Cargador rápido 25 W USB-C", "Cargadores y cables", "Samsung", 14990, 8400, 20, 6, "unidad", "Samsung · universal USB-C", "Original"],
        ["Cable USB-C a USB-C 1 m", "Cargadores y cables", "Ugreen", 5990, 2800, 35, 10, "unidad", "Universal", "Premium"],
        ["Cable Lightning 1 m", "Cargadores y cables", "Genérico", 4990, 2200, 30, 10, "unidad", "iPhone · iPad", "Genérico"],
        ["Mica de vidrio templado iPhone 11", "Fundas y protectores", "Genérico", 3990, 1200, 40, 12, "unidad", "iPhone 11 · XR", "Genérico"],
        ["Funda transparente Samsung A14", "Fundas y protectores", "Genérico", 3490, 1100, 25, 8, "unidad", "Samsung Galaxy A14", "Genérico"],
        ["Audífonos Bluetooth TWS", "Audífonos", "Xiaomi", 19990, 11000, 12, 4, "unidad", "Universal", "Original"],
        ["Audífonos con cable USB-C", "Audífonos", "Samsung", 9990, 5200, 10, 4, "unidad", "Samsung · USB-C", "Original"],
        ["Cámara trasera Samsung A14", "Cámaras y parlantes", "Samsung", 17990, 10500, 3, 2, "unidad", "Samsung Galaxy A14", "Premium"],
        ["Parlante inferior iPhone 11", "Cámaras y parlantes", "Apple", 8990, 4300, 5, 2, "unidad", "iPhone 11", "Premium"],
        ["Tapa trasera iPhone 11 negra", "Carcasas y tapas", "Apple", 14990, 8200, 4, 2, "unidad", "iPhone 11", "Premium"],
        ["Memoria microSD 64 GB", "Memorias y almacenamiento", "SanDisk", 8990, 4900, 16, 5, "unidad", "Universal", "Original"],
        ["Pasta térmica 4 g", "Herramientas e insumos", "Arctic", 3990, 1900, 10, 4, "unidad", "Notebook · consola · PC", ""],
        ["Kit destornilladores de precisión", "Herramientas e insumos", "Genérico", 7990, 3600, 6, 2, "unidad", "", ""],
        ["Samsung Galaxy A12 usado (64 GB)", "Equipos usados", "Samsung", 79990, 52000, 2, 0, "unidad", "Con garantía de 3 meses", "Usado / reacondicionado"],
        ["Instalación de mica", "Servicios", "", 2000, 0, 0, 0, "unidad", "", ""]
    ];

    const productos = productosDeEjemplo(filas, ([nombre, categoria, marca, precio, costo, stock, minimo, unidad, compat, calidad]) => ({
        nombre, categoria, marca, precio, costo, stock, stockMinimo: minimo, unidad, compat, calidad, controlaStock: categoria !== "Servicios"
    }));

    const ordenes = [
        { cliente: { nombre: "Camila Torres", telefono: "9 6123 4567", rut: "18.765.432-1" }, activo: { imei: "352099001761481", tipoEquipo: "Celular", marca: "Apple", modelo: "iPhone 11", color: "Negro" },
          problema: "Pantalla trizada, el táctil no responde arriba.", estado: "reparacion", diasAtras: 1, prometidaEnDias: 1,
          extra: { accesorios: "Funda y cargador", estadoFisico: "Pantalla rota, marco con un golpe", bloqueo: "Sí, el cliente la entrega al retirar" },
          items: [["Pantalla iPhone 11", 1]], mano: [["Cambio de pantalla (mano de obra)", 15000]], abono: 30000 },
        { cliente: { nombre: "Pedro Soto", telefono: "9 5234 5678", rut: "14.321.987-6" }, activo: { imei: "356938035643809", tipoEquipo: "Celular", marca: "Samsung", modelo: "Galaxy A14", color: "Azul" },
          problema: "No carga, hay que mover el cable para que cargue.", estado: "lista", diasAtras: 2, prometidaEnDias: 0,
          extra: { accesorios: "Solo el equipo", estadoFisico: "Sin daños visibles", bloqueo: "No" },
          items: [["Pin de carga USB-C", 1]], mano: [["Cambio de pin de carga", 18000]], diagnostico: "Pin de carga sulfatado. Se reemplazó y se probó carga rápida." },
        { cliente: { nombre: "Ana Vera", telefono: "9 4345 6789", rut: "16.789.012-3" }, activo: { imei: "SN-LX4821907", tipoEquipo: "Notebook", marca: "HP", modelo: "Pavilion 14", color: "Plateado" },
          problema: "Se calienta mucho y se apaga solo.", estado: "diagnostico", diasAtras: 4, prometidaEnDias: -1,
          extra: { accesorios: "Cargador", estadoFisico: "Rayas en la tapa", bloqueo: "Sí, la dio para probar" },
          items: [["Pasta térmica", 1]], mano: [["Diagnóstico", 5000]] }
    ];

    ordenesDeEjemplo(ordenes, productos);
    Datos.guardarProductos(productos);
}
