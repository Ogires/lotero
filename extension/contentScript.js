$(function () {
    var urlBase = "//loto-chanante.appspot.com/api/resultados/";
    var contenedor = $("<p id='og-contenedor'></p>")
    var urlImagenHayResultado = chrome.extension.getURL("images/eye.svg"),
        urlImagenNoHayResultado = chrome.extension.getURL("images/eye-slash.svg"),
        urlImagenOnce = chrome.extension.getURL("images/logo-once.png"),
        urlImagenLne = chrome.extension.getURL("images/logo-lne.png");

    $("body").on("click", "a.og-consulta", abrirModal);
    $(".detalle").append(contenedor);

    var ultimoResultado = {};
    function comprobarNumero(evt) {
        if ($("#numero").val()) {
            var url = urlBase + $("#numero").val();
            $.get(url).then(function (res) {
                //alert(JSON.stringify(res));
                procesarRespuesta(res);                
                mostrarIcono(ultimoResultado);                
            });
        }
    }

    function mostrarIcono(res) {
        var plantillaMostrar = Handlebars.templates.plantilla(ultimoResultado);
        $("#og-contenedor").html(plantillaMostrar);
    }

    function procesarRespuesta(res) {
        ultimoResultado = {
            hayResultados: res.hayResultados,
            urlImagenHayResultado: urlImagenHayResultado,
            urlImagenNoHayResultado: urlImagenNoHayResultado,
            resultados: []
        };
        for (var i = 0; i < res.resultados.length; i++) {
            var resultado = res.resultados[i];
            ultimoResultado.resultados.push({
                fecha: new Date(resultado.fecha).toLocaleDateString('es-ES'),
                numero: resultado.numero,
                juego: resultado.juego,
                imagen: resultado.loteria == 1 ? urlImagenOnce : urlImagenLne
            });
        }
    }

    function abrirModal() {
        var theModal = Handlebars.templates.elmodal(ultimoResultado.resultados);
        $(theModal).appendTo('body').modal();
    }
    comprobarNumero();

});