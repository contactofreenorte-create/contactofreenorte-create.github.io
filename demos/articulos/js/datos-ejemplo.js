// ==========================================
// VENTAFÁCIL — DATOS DE EJEMPLO
// Productos de varias categorías para probar
// ==========================================

"use strict";

function codigoEAN(n) {

    const base = "780" + String(3000000 + n * 7919).padStart(9, "0").slice(-9);
    const suma = base.split("").reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);

    return base + ((10 - (suma % 10)) % 10);
}


function cargarDatosEjemplo() {

    // [nombre, categoría, marca, precio, costo, stock, mínimo, unidad]
    const lista = [
        ["Cuaderno universitario 100 hojas", "Librería", "Torre", 2490, 1300, 40, 10],
        ["Lápiz pasta azul", "Librería", "Bic", 390, 180, 120, 30],
        ["Resma carta 500 hojas", "Librería", "Report", 5990, 3900, 12, 5],
        ["Pegamento en barra 40 g", "Librería", "Pritt", 1990, 1000, 3, 6],
        ["Bebida 1,5 L", "Bebidas", "", 1790, 1050, 36, 12],
        ["Agua mineral 500 ml", "Bebidas", "", 890, 420, 48, 12],
        ["Jugo en caja 200 ml", "Bebidas", "", 450, 230, 5, 20],
        ["Papas fritas 110 g", "Snacks", "", 1690, 950, 25, 10],
        ["Galletas de chocolate", "Snacks", "", 990, 520, 30, 10],
        ["Chocolate 100 g", "Snacks", "", 1490, 850, 18, 8],
        ["Detergente líquido 3 L", "Aseo", "", 7990, 5200, 8, 4],
        ["Lavaloza 750 ml", "Aseo", "", 1790, 1050, 14, 6],
        ["Papel higiénico 4 rollos", "Aseo", "", 2990, 1900, 20, 8],
        ["Cloro 1 L", "Aseo", "", 990, 520, 0, 6],
        ["Shampoo 400 ml", "Cuidado personal", "", 3490, 2100, 9, 4],
        ["Pasta dental 90 g", "Cuidado personal", "", 1890, 1100, 15, 6],
        ["Pilas AA x4", "Electrónica", "Duracell", 3990, 2400, 10, 4],
        ["Cargador USB-C", "Electrónica", "", 5990, 2900, 6, 2],
        ["Ampolleta LED 9 W", "Hogar", "", 1990, 900, 25, 8],
        ["Clavos 2\" (kilo)", "Ferretería", "", 2800, 1600, 12.5, 3, "kilo"],
        ["Cable eléctrico (metro)", "Ferretería", "", 690, 380, 80, 20, "metro"],
        ["Cinta adhesiva transparente", "Bazar", "", 790, 350, 22, 6],
        ["Globos x12", "Bazar", "", 1490, 700, 16, 5],
        ["Recarga telefónica", "Varios", "", 1000, 950, 0, 0, "unidad", false]
    ];

    const ahora = new Date().toISOString();

    const productos = lista.map(([nombre, categoria, marca, precio, costo, stock, minimo, unidad = "unidad", controla = true], i) => ({
        id: nuevoId() + i,
        nombre, categoria, marca, precio, costo,
        stock: controla ? stock : 0,
        stockMinimo: minimo,
        unidad,
        controlaStock: controla,
        codigoBarras: codigoEAN(i + 1),
        activo: true,
        creado: ahora
    }));

    Datos.guardarProductos(productos);
}
