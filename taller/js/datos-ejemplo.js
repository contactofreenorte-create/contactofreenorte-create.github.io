// ==========================================
// TALLERPRO — DATOS DE EJEMPLO
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

    // [nombre, categoría, marca, precio, costo, stock, mínimo, unidad, compatible con, código de fábrica]
    const filas = [
        ["Aceite motor 5W-30 sintético 1 L", "Aceites y lubricantes", "Castrol", 9990, 5800, 48, 12, "litro", "Gasolina · uso general", ""],
        ["Aceite motor 10W-40 semisintético 1 L", "Aceites y lubricantes", "Shell", 7490, 4200, 40, 12, "litro", "Gasolina · uso general", ""],
        ["Aceite motor 15W-40 diésel 1 L", "Aceites y lubricantes", "Mobil", 6990, 3900, 24, 10, "litro", "Diésel · camionetas y camiones", ""],
        ["Líquido de frenos DOT 4 500 ml", "Frenos", "Bosch", 5490, 2900, 14, 6, "unidad", "Universal", ""],
        ["Refrigerante largo vida 1 L", "Refrigeración", "Prestone", 4990, 2600, 18, 6, "litro", "Universal", ""],
        ["Filtro de aceite Yaris", "Filtros", "Bosch", 6990, 3400, 12, 4, "unidad", "Toyota Yaris 2012-2019", "04152-YZZA1"],
        ["Filtro de aceite Accent", "Filtros", "Mann", 5990, 2900, 10, 4, "unidad", "Hyundai Accent 2012-2019 · i25", "26300-35503"],
        ["Filtro de aire Sail", "Filtros", "Mann", 8490, 4400, 6, 3, "unidad", "Chevrolet Sail 1.4 2013-2020", "94580175"],
        ["Filtro de cabina Yaris", "Filtros", "Bosch", 7990, 4000, 7, 3, "unidad", "Toyota Yaris 2012-2019", "87139-YZZ05"],
        ["Filtro de combustible universal", "Filtros", "Bosch", 9490, 5100, 5, 3, "unidad", "Bencinero universal", ""],
        ["Pastillas de freno delanteras Yaris", "Frenos", "Brembo", 32990, 19500, 5, 2, "juego", "Toyota Yaris 2012-2019", "04465-52160"],
        ["Pastillas de freno delanteras Accent", "Frenos", "Frasle", 27990, 16000, 4, 2, "juego", "Hyundai Accent 2012-2019", "58101-1RA00"],
        ["Discos de freno delanteros Yaris (par)", "Frenos", "Brembo", 59990, 36000, 3, 2, "par", "Toyota Yaris 2012-2019", "43512-52110"],
        ["Amortiguador delantero Accent", "Suspensión y dirección", "Monroe", 44990, 27000, 4, 2, "unidad", "Hyundai Accent 2012-2019", "54650-1R000"],
        ["Terminal de dirección Sail", "Suspensión y dirección", "TRW", 14990, 8200, 6, 2, "unidad", "Chevrolet Sail 2013-2020", ""],
        ["Bujías NGK (juego de 4)", "Encendido y eléctrico", "NGK", 17990, 9800, 9, 3, "juego", "Gasolina 1.4 - 1.6 · varios", "BKR6E"],
        ["Bobina de encendido Yaris", "Encendido y eléctrico", "Denso", 38990, 23000, 3, 2, "unidad", "Toyota Yaris 2012-2019", "90919-02248"],
        ["Batería 12V 45Ah", "Baterías", "Bosch", 69990, 46000, 6, 2, "unidad", "Autos pequeños", ""],
        ["Batería 12V 60Ah", "Baterías", "Bosch", 89990, 59000, 5, 2, "unidad", "Autos medianos y camionetas", ""],
        ["Kit de distribución Sail 1.4", "Correas y distribución", "Gates", 79990, 49000, 3, 1, "juego", "Chevrolet Sail 1.4 2013-2020", "K015620XS"],
        ["Correa poly-V Accent", "Correas y distribución", "Gates", 14990, 8300, 5, 2, "unidad", "Hyundai Accent 1.4 / 1.6", "6PK1070"],
        ["Termostato Yaris", "Refrigeración", "Wahler", 16990, 9400, 3, 2, "unidad", "Toyota Yaris 2012-2019", "90916-03107"],
        ["Ampolleta H4 (par)", "Iluminación", "Philips", 12990, 6900, 14, 5, "par", "Universal", "H4"],
        ["Ampolleta H7 (par)", "Iluminación", "Osram", 13990, 7400, 11, 5, "par", "Universal", "H7"],
        ["Escobillas limpiaparabrisas (par)", "Accesorios", "Bosch", 15990, 8700, 10, 4, "par", "Universal 24\" y 18\"", ""],
        ["Neumático 185/65 R14", "Neumáticos y llantas", "Firestone", 52990, 35000, 8, 4, "unidad", "Rodado 14", ""],
        ["Neumático 195/55 R16", "Neumáticos y llantas", "Goodyear", 69990, 46500, 6, 4, "unidad", "Rodado 16", ""],
        ["Lavado de motor", "Servicios", "", 12000, 0, 0, 0, "unidad", "", ""],
        ["Revisión pre-revisión técnica", "Servicios", "", 15000, 0, 0, 0, "unidad", "", ""]
    ];

    const productos = productosDeEjemplo(filas, ([nombre, categoria, marca, precio, costo, stock, minimo, unidad, compat, codigoFabrica]) => ({
        nombre, categoria, marca, precio, costo, stock, stockMinimo: minimo, unidad, compat, codigoFabrica, controlaStock: categoria !== "Servicios"
    }));

    const ordenes = [
        { cliente: { nombre: "Transportes Norte SpA", telefono: "9 6543 2109", rut: "76.555.444-3" }, activo: { patente: "RTZC88", marca: "Chevrolet", modelo: "N300", anio: 2020, color: "Blanco", km: 54200 },
          problema: "Pierde potencia en subida y sale humo negro.", estado: "diagnostico", diasAtras: 3, prometidaEnDias: -1, extra: { kmIngreso: 54200, combustible: "1/2" },
          items: [["Filtro de combustible universal", 1]], mano: [["Diagnóstico con scanner", 20000]] },
        { cliente: { nombre: "María López", telefono: "9 7654 3210", rut: "15.234.567-8" }, activo: { patente: "PHBT45", marca: "Hyundai", modelo: "Accent", anio: 2018, color: "Blanco", km: 62000 },
          problema: "Mantención de los 60.000 km.", estado: "lista", diasAtras: 1, prometidaEnDias: 0, extra: { kmIngreso: 62000, combustible: "1/4" },
          items: [["Aceite motor 5W-30", 4], ["Filtro de aceite Accent", 1], ["Filtro de aire Sail", 1]], mano: [["Cambio de aceite y filtro", 25000]], diagnostico: "Se cambió aceite y filtros. Niveles revisados." },
        { cliente: { nombre: "Juan Pérez", telefono: "9 8765 4321", rut: "12.345.678-5" }, activo: { patente: "KLXZ21", marca: "Toyota", modelo: "Yaris", anio: 2015, color: "Gris", km: 98000 },
          problema: "Ruido al frenar y vibración en el volante.", estado: "reparacion", diasAtras: 2, prometidaEnDias: 1, extra: { kmIngreso: 98000, combustible: "3/4" },
          items: [["Pastillas de freno delanteras Yaris", 1], ["Discos de freno delanteros Yaris", 1]], mano: [["Cambio de pastillas de freno", 30000]], abono: 50000, diagnostico: "Discos alabeados y pastillas al límite." }
    ];

    ordenesDeEjemplo(ordenes, productos);
    Datos.guardarProductos(productos);
}
