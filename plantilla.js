(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['plantilla'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "<a class='og-consulta og-con-resultados'>\r\n  <span>\r\n    <img title=\"Ha sido premiado\" class='papelera' src='"
    + container.escapeExpression(container.lambda((depth0 != null ? depth0.urlImagenHayResultado : depth0), depth0))
    + "' />\r\n    Premiado</span>\r\n</a>\r\n\r\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "<a class='og-consulta og-sin-resultados'>\r\n  <span></span>\r\n  <img title=\"No ha sido premiado\" class='papelera' src='"
    + container.escapeExpression(container.lambda((depth0 != null ? depth0.urlImagenNoHayResultado : depth0), depth0))
    + "' />\r\n  No premiado</span>\r\n</a>\r\n\r\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.hayResultados : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data})) != null ? stack1 : "");
},"useData":true});
})();