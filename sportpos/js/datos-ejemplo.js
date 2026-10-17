// ==========================================
// SPORTPOS — DATOS DE EJEMPLO
// Zapatillas y ropa deportiva con tallas, para probar
// ==========================================

"use strict";

function codigoEAN(n) {

    const base = "780" + String(3000000 + n * 7919).padStart(9, "0").slice(-9);
    const suma = base.split("").reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);

    return base + ((10 - (suma % 10)) % 10);
}


function cargarDatosEjemplo() {

    // [marca, modelo, color, categoría, género, precio, costo, tallas, stock por talla, mínimo]
    const calzado = ["38", "39", "40", "41", "42", "43"];
    const ropa = ["S", "M", "L", "XL"];

    const lista = [
        ["Nike", "Pegasus 40", "Negro", "Zapatillas running", "Hombre", 119990, 72000, calzado, [1, 3, 4, 4, 3, 0], 1],
        ["Nike", "Pegasus 40", "Blanco", "Zapatillas running", "Mujer", 119990, 72000, ["36", "37", "38", "39", "40"], [2, 3, 3, 2, 1], 1],
        ["Adidas", "Ultraboost Light", "Gris", "Zapatillas running", "Hombre", 149990, 91000, ["40", "41", "42", "43", "44"], [2, 2, 3, 1, 1], 1],
        ["Adidas", "Samba OG", "Blanco", "Zapatillas urbanas", "Unisex", 109990, 64000, ["37", "38", "39", "40", "41", "42"], [2, 4, 4, 3, 3, 2], 1],
        ["Puma", "Suede Classic", "Azul", "Zapatillas urbanas", "Unisex", 79990, 45000, ["38", "39", "40", "41", "42"], [3, 3, 2, 2, 1], 1],
        ["New Balance", "574", "Gris", "Zapatillas urbanas", "Unisex", 94990, 56000, ["38", "39", "40", "41", "42", "43"], [1, 2, 3, 3, 2, 1], 1],
        ["Nike", "Mercurial Club", "Naranjo", "Zapatillas de fútbol", "Hombre", 64990, 38000, ["39", "40", "41", "42", "43"], [2, 3, 3, 2, 1], 1],
        ["Adidas", "Hoops 3.0", "Negro", "Zapatillas de básquetbol", "Unisex", 69990, 41000, ["40", "41", "42", "43"], [2, 2, 2, 1], 1],
        ["Nike", "Star Runner", "Rosado", "Zapatillas niños", "Niña", 44990, 25000, ["30", "31", "32", "33", "34"], [2, 3, 3, 2, 2], 1],
        ["Nike", "Dri-FIT Miler", "Negro", "Poleras", "Hombre", 24990, 12500, ropa, [4, 6, 6, 3], 2],
        ["Adidas", "Essentials 3 Rayas", "Gris", "Polerones", "Unisex", 44990, 25500, ropa, [2, 4, 4, 2], 2],
        ["Puma", "Active Calza", "Negro", "Pantalones y calzas", "Mujer", 29990, 15000, ["XS", "S", "M", "L"], [3, 5, 5, 2], 2],
        ["Nike", "Flex Stride Short", "Azul", "Shorts", "Hombre", 27990, 14000, ropa, [3, 5, 5, 2], 2],
        ["Chile", "Camiseta Selección", "Rojo", "Camisetas de fútbol", "Unisex", 59990, 33000, ropa, [2, 4, 4, 3], 2],
        ["Columbia", "Chaqueta cortaviento", "Verde", "Chaquetas", "Hombre", 69990, 38000, ["M", "L", "XL"], [2, 3, 1], 1],
        ["Nike", "Calcetines x3", "Blanco", "Calcetines", "Unisex", 11990, 5200, ["M", "L"], [12, 10], 4],
        ["Nike", "Brasilia Mochila", "Negro", "Mochilas y bolsos", "Unisex", 32990, 17000, ["Única"], [6], 2]
    ];

    const ahora = new Date().toISOString();
    const productos = [];
    let n = 0;

    lista.forEach(([marca, modelo, color, categoria, genero, precio, costo, tallas, stocks, minimo]) => {
        tallas.forEach((talla, i) => {
            const p = { marca, modelo, color, talla, genero, categoria, precio, costo, stock: stocks[i], stockMinimo: minimo, unidad: /^\d/.test(talla) ? "par" : "unidad" };
            n++;
            productos.push(Object.assign({
                id: nuevoId() + n,
                nombre: nombreVariante(p),
                controlaStock: true,
                codigoBarras: codigoEAN(n),
                activo: true,
                creado: ahora
            }, p));
        });
    });

    Datos.guardarProductos(productos);
}
