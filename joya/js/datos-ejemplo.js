// ==========================================
// JOYAPOS — DATOS DE EJEMPLO
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

    // precios del día de ejemplo (el usuario los reemplaza con los de hoy)
    DB.guardar("precios", Object.assign({}, PRECIOS_EJEMPLO, { actualizado: new Date().toISOString() }));

    // [nombre, categoría, material, peso g, piedra, medida, hechura, costo, stock, mínimo, unidad, auto]
    const filas = [
        ["Argolla matrimonio lisa oro 18k", "Argollas de matrimonio", "Oro 18k", 4.2, "", "N° 16", 20000, 0, 6, 2, "unidad", "Sí"],
        ["Argolla matrimonio diamantada oro 18k", "Argollas de matrimonio", "Oro 18k", 5.1, "Diamantado", "N° 17", 30000, 0, 4, 2, "unidad", "Sí"],
        ["Anillo solitario circón oro 18k", "Anillos", "Oro 18k", 2.8, "Circón blanco 4 mm", "N° 14", 25000, 0, 5, 2, "unidad", "Sí"],
        ["Anillo sello oro 10k", "Anillos", "Oro 10k", 5.5, "", "N° 21", 18000, 0, 3, 1, "unidad", "Sí"],
        ["Cadena cartier oro 18k 45 cm", "Cadenas", "Oro 18k", 6.4, "", "45 cm", 20000, 0, 4, 2, "unidad", "Sí"],
        ["Cadena singapur oro 14k 50 cm", "Cadenas", "Oro 14k", 5.2, "", "50 cm", 18000, 0, 3, 1, "unidad", "Sí"],
        ["Aros argolla oro 18k", "Aros", "Oro 18k", 2.2, "", "15 mm", 12000, 0, 6, 2, "par", "Sí"],
        ["Aros con circón oro 18k", "Aros", "Oro 18k", 1.4, "Circón 3 mm", "", 15000, 0, 8, 3, "par", "Sí"],
        ["Dije corazón oro 18k", "Colgantes y dijes", "Oro 18k", 1.1, "", "", 8000, 0, 7, 2, "unidad", "Sí"],
        ["Dije Virgen María oro 18k", "Colgantes y dijes", "Oro 18k", 1.6, "", "", 9000, 0, 5, 2, "unidad", "Sí"],
        ["Pulsera eslabones oro 18k", "Pulseras", "Oro 18k", 7.8, "", "19 cm", 25000, 0, 3, 1, "unidad", "Sí"],
        ["Anillo plata 925 con circón", "Anillos", "Plata 925", 3.5, "Circón blanco", "N° 15", 6000, 0, 12, 4, "unidad", "Sí"],
        ["Cadena plata 925 veneciana 50 cm", "Cadenas", "Plata 925", 6.0, "", "50 cm", 7000, 0, 10, 3, "unidad", "Sí"],
        ["Aros plata 925 argolla", "Aros", "Plata 925", 3.0, "", "20 mm", 5000, 0, 15, 5, "par", "Sí"],
        ["Pulsera plata 925 con dijes", "Pulseras", "Plata 925", 8.5, "", "18 cm", 9000, 0, 6, 2, "unidad", "Sí"],
        ["Conjunto plata 925 corazón (cadena y aros)", "Conjuntos", "Plata 925", 7.2, "Circón rosado", "", 10000, 0, 4, 2, "unidad", "Sí"],
        ["Pulsera acero quirúrgico", "Pulseras", "Acero quirúrgico", 0, "", "20 cm", 0, 3500, 20, 6, "unidad", "No"],
        ["Reloj de pulsera dama", "Relojes", "Acero quirúrgico", 0, "", "", 0, 22000, 5, 2, "unidad", "No"],
        ["Estuche para anillo", "Estuches y accesorios", "Otro", 0, "", "", 0, 900, 40, 10, "unidad", "No"],
        ["Grabado láser (por palabra)", "Servicios", "Otro", 0, "", "", 0, 0, 0, 0, "unidad", "No"]
    ];

    const pr = PRECIOS_EJEMPLO;

    const productos = productosDeEjemplo(filas, ([nombre, categoria, material, peso, piedra, medida, hechura, costoFijo, stock, minimo, unidad, auto]) => {
        const p = { nombre, categoria, material, peso: peso || "", piedra, medida, hechura: hechura || "", autoPrecio: auto, stock, stockMinimo: minimo, unidad, controlaStock: categoria !== "Servicios", marca: "" };
        const v = pr.valores[material] || 0;
        const metal = peso && v ? Math.round(peso * v) : 0;
        p.costo = costoFijo || Math.round(metal * 0.7 / 100) * 100 + Math.round((hechura || 0) * 0.5);
        p.precio = (peso && v) ? RUBRO.precioSugerido(p) : (costoFijo ? Math.round(costoFijo * 2.2 / 100) * 100 : 5000);
        return p;
    });

    // un grabado cuesta lo mismo siempre
    const grabado = productos.find(x => x.categoria === "Servicios");
    if (grabado) grabado.precio = 5000;

    const ordenes = [
        { cliente: { nombre: "Rosa Muñoz", telefono: "9 7345 6789", rut: "9.876.543-2" }, tipo: "apartado",
          problema: "Anillo solitario N° 14 para su aniversario. Lo retira el día 25.", estado: "apartada", diasAtras: 5, prometidaEnDias: 12,
          items: [["Anillo solitario circón oro 18k", 1]], abono: 60000 },
        { cliente: { nombre: "Luis Fuentes", telefono: "9 6456 7890", rut: "13.456.789-0" }, tipo: "arreglo", activo: { descripcion: "Cadena de oro 45 cm", material: "Oro 18k", peso: 6.1 },
          problema: "Se cortó el eslabón. Soldar y pulir.", estado: "lista", diasAtras: 2, prometidaEnDias: 0, extra: {},
          mano: [["Soldadura de cadena o pulsera", 8000], ["Limpieza y pulido", 5000]], diagnostico: "Soldadura reforzada y pulida." },
        { cliente: { nombre: "Carolina Díaz", telefono: "9 5567 8901", rut: "17.654.321-K" }, tipo: "arreglo", activo: { descripcion: "Argolla de matrimonio", material: "Oro 14k", peso: 4.4 },
          problema: "Achicar de N° 17 a N° 15 y grabar la fecha 14-02-2019.", estado: "taller", diasAtras: 1, prometidaEnDias: 3, extra: {},
          mano: [["Achicar o agrandar argolla / anillo", 15000], ["Grabado (por palabra)", 5000]] }
    ];

    ordenesDeEjemplo(ordenes, productos);
    Datos.guardarProductos(productos);
}
