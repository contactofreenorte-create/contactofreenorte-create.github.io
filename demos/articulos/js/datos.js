// ==========================================
// VENTAFÁCIL — DATOS DE LA TIENDA
// Productos, ventas, caja y movimientos
// ==========================================

"use strict";

const CATEGORIAS_BASE = [
    "Abarrotes", "Bebidas", "Snacks", "Aseo", "Cuidado personal", "Librería", "Bazar",
    "Juguetería", "Ferretería", "Electrónica", "Ropa", "Hogar", "Mascotas", "Varios"
];

const UNIDADES = ["unidad", "kilo", "litro", "metro", "paquete", "caja", "par"];

const METODOS_PAGO = {
    efectivo:      { texto: "Efectivo",      icono: "dinero" },
    debito:        { texto: "Débito",        icono: "tarjeta" },
    credito:       { texto: "Crédito",       icono: "tarjeta" },
    transferencia: { texto: "Transferencia", icono: "transferencia" }
};

const ROLES = {
    admin:    "Administrador",
    vendedor: "Vendedor"
};

// Cada archivo de js/modulos agrega aquí su pantalla
const Modulos = {};


// ==========================================
// LECTURA Y GUARDADO
// ==========================================

const Datos = {

    config: () => DB.leer("config", {}),
    guardarConfig: valor => DB.guardar("config", valor),

    usuarios: () => DB.leer("usuarios", []),
    guardarUsuarios: valor => DB.guardar("usuarios", valor),

    productos: () => DB.leer("productos", []),
    guardarProductos: valor => DB.guardar("productos", valor),

    ventas: () => DB.leer("ventas", []),
    guardarVentas: valor => DB.guardar("ventas", valor),

    movimientos: () => DB.leer("movimientos", []),
    guardarMovimientos: valor => DB.guardar("movimientos", valor),

    cajaActual: () => DB.leer("caja", null),
    guardarCaja: valor => valor ? DB.guardar("caja", valor) : DB.borrar("caja"),

    cierres: () => DB.leer("cierres", []),
    guardarCierres: valor => DB.guardar("cierres", valor),


    producto(id) {
        return this.productos().find(p => p.id === id) || null;
    },


    categorias() {
        return Array.from(new Set(CATEGORIAS_BASE.concat(this.productos().map(p => p.categoria).filter(Boolean)))).sort();
    },


    siguienteNumero(tipo) {

        const contadores = DB.leer("contadores", {});

        contadores[tipo] = (contadores[tipo] || 0) + 1;

        DB.guardar("contadores", contadores);

        return contadores[tipo];
    },


    registrarMovimiento(movimiento) {

        const lista = this.movimientos();

        lista.unshift(Object.assign({ id: nuevoId(), fecha: new Date().toISOString(), usuario: Sesion.nombre() }, movimiento));

        this.guardarMovimientos(lista.slice(0, 5000));
    }
};


// ==========================================
// PRODUCTOS Y STOCK
// ==========================================

function nombreCompleto(producto) {
    return producto ? producto.nombre : "";
}


// Los servicios o productos "sin control" no descuentan stock
function controlaStock(producto) {
    return producto.controlaStock !== false;
}


function stockBajo(producto) {
    return controlaStock(producto) && aEntero(producto.stockMinimo) > 0 && Number(producto.stock) < aEntero(producto.stockMinimo);
}


function textoStock(producto) {

    if (!controlaStock(producto)) {
        return "Sin control de stock";
    }

    const n = Math.round(Number(producto.stock) * 100) / 100;
    const unidad = producto.unidad && producto.unidad !== "unidad" ? " " + producto.unidad + (n === 1 ? "" : "s") : "";

    return n <= 0 ? "Sin stock" : formatoNumero.format(n) + (unidad || (n === 1 ? " unidad" : " unidades"));
}


function descontarStock(productos, productoId, cantidad) {

    const p = productos.find(x => x.id === productoId);

    if (!p || !controlaStock(p)) return true;

    if (Number(p.stock) < cantidad) return false;

    p.stock = Math.round((Number(p.stock) - cantidad) * 1000) / 1000;

    return true;
}


function devolverStock(productos, productoId, cantidad) {

    const p = productos.find(x => x.id === productoId);

    if (p && controlaStock(p)) {
        p.stock = Math.round((Number(p.stock) + cantidad) * 1000) / 1000;
    }
}


function detalleProducto(p) {
    return [p.categoria, p.marca].filter(Boolean).join(" · ");
}


function insigniaCategoria(p) {
    return p.categoria ? `<span class="badge b-azul">${esc(p.categoria)}</span>` : "";
}


// ==========================================
// SESIÓN
// ==========================================

const Sesion = {

    usuario() {

        const sesion = DB.leer("sesion", null);

        if (!sesion) return null;

        const usuario = Datos.usuarios().find(u => u.id === sesion.usuarioId);

        return usuario && usuario.activo ? usuario : null;
    },

    iniciar(usuario) {
        DB.guardar("sesion", { usuarioId: usuario.id, desde: new Date().toISOString() });
    },

    cerrar() {
        DB.borrar("sesion");
    },

    esAdmin() {
        const u = this.usuario();
        return Boolean(u && u.rol === "admin");
    },

    nombre() {
        const u = this.usuario();
        return u ? u.nombre : "";
    }
};


// ==========================================
// CAJA
// ==========================================

function resumenCaja(caja) {

    const porMetodo = { efectivo: 0, debito: 0, credito: 0, transferencia: 0 };

    const ventas = Datos.ventas().filter(v => v.cajaId === caja.id);
    const validas = ventas.filter(v => v.estado !== "anulada");

    validas.forEach(v => { porMetodo[v.metodo] = (porMetodo[v.metodo] || 0) + v.total; });

    const totalVentas = validas.reduce((s, v) => s + v.total, 0);
    const movimientos = caja.movimientos || [];
    const ingresos = movimientos.filter(m => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0);
    const retiros = movimientos.filter(m => m.tipo === "retiro").reduce((s, m) => s + m.monto, 0);

    return {
        cantidadVentas: validas.length,
        cantidadAnuladas: ventas.length - validas.length,
        totalVentas,
        cantidadAbonos: 0,
        totalAbonos: 0,
        totalDevoluciones: 0,
        totalCobrado: totalVentas,
        porMetodo,
        ingresos,
        retiros,
        efectivoEsperado: (caja.fondoInicial || 0) + porMetodo.efectivo + ingresos - retiros
    };
}
