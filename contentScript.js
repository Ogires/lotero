var plantilla = "//loto-chanante.appspot.com/api/resultados/";
var imgPapelera = $("a>img.papelera");
var urlImagen = chrome.extension.getURL("eye.svg");
var imgComprobarNumero = $("<a class='og-consulta'><img class='papelera' src='"+ urlImagen +"' /></a>");
imgPapelera.parent().after(imgComprobarNumero);
$("body").on("click", "a.og-consulta", comprobarNumero);
$(".detalle").append(imgComprobarNumero.clone());

function comprobarNumero(evt){
    var url = plantilla + $("#numero").val();
    $.get(url).then(function(res){ alert(JSON.stringify(res)); });
}
