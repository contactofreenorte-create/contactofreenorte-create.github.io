// ==========================================
// TEMA CLARO / OSCURO / ROSA (opcional)
// Pone un boton sol/luna en la barra superior. La eleccion se guarda en este equipo.
// Por defecto el sistema sigue en tema claro.
// ==========================================

(function () {

    "use strict";

    var CLAVE = "fn-tema";
    var raiz = document.documentElement;

    var SOL = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    var LUNA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

    function leer() {
        try {
            var t = localStorage.getItem(CLAVE);
            return t === "oscuro" || t === "rosa" ? t : "claro";
        } catch (error) {
            return "claro";
        }
    }

    function guardar(tema) {
        try {
            localStorage.setItem(CLAVE, tema);
        } catch (error) { /* sin almacenamiento: vale solo mientras este abierto */ }
    }

    function colorBarra(tema) {
        var meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) return;
        if (!meta.getAttribute("data-claro")) meta.setAttribute("data-claro", meta.getAttribute("content") || "#ffffff");
        meta.setAttribute("content", tema === "oscuro" ? "#0e131b" : tema === "rosa" ? "#db2777" : meta.getAttribute("data-claro"));
    }

    var CORAZON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';

    // orden: claro -> oscuro -> rosa -> claro
    function siguiente(tema) {
        return tema === "claro" ? "oscuro" : tema === "oscuro" ? "rosa" : "claro";
    }

    function pintarBoton(boton, tema) {
        // el icono muestra el tema al que se pasa al tocar
        var sig = siguiente(tema);
        boton.innerHTML = sig === "claro" ? SOL : sig === "oscuro" ? LUNA : CORAZON;
        var texto = "Cambiar a tema " + sig;
        boton.setAttribute("title", texto);
        boton.setAttribute("aria-label", texto);
    }

    function aplicar(tema) {
        if (tema === "oscuro" || tema === "rosa") raiz.setAttribute("data-tema", tema);
        else raiz.removeAttribute("data-tema");
        colorBarra(tema);
        var boton = document.getElementById("btnTema");
        if (boton) pintarBoton(boton, tema);
    }

    function crearBoton() {
        var barra = document.querySelector(".barra");
        if (!barra || document.getElementById("btnTema")) return;

        var boton = document.createElement("button");
        boton.type = "button";
        boton.id = "btnTema";
        boton.className = "btn btn-fantasma btn-icono";
        boton.addEventListener("click", function () {
            var nuevo = siguiente(leer());
            guardar(nuevo);
            aplicar(nuevo);
        });

        var espacio = barra.querySelector(".espacio");
        if (espacio && espacio.nextSibling) barra.insertBefore(boton, espacio.nextSibling);
        else barra.appendChild(boton);

        pintarBoton(boton, leer());
    }

    // se aplica de inmediato (antes de pintar la pagina) para que no parpadee
    aplicar(leer());

    document.addEventListener("DOMContentLoaded", function () {
        colorBarra(leer());
        crearBoton();
        // el sistema vuelve a dibujar la pantalla al entrar o salir: se pone el boton de nuevo
        new MutationObserver(crearBoton).observe(document.body, { childList: true });
    });

})();
