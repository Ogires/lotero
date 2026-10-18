(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['elmodal'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"og-modal\">\r\n    <table class=\"og-tabla-resultados\">\r\n        <tr>\r\n            <th>Fecha</th>            \r\n            <th>Juego</th>\r\n            <th></th>\r\n        </tr>\r\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),depth0,{"name":"each","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </table>\r\n</div>\r\n";
},"2":function(container,depth0,helpers,partials,data) {
    var alias1=container.lambda, alias2=container.escapeExpression;

  return "        <tr>\r\n            <td>"
    + alias2(alias1((depth0 != null ? depth0.fecha : depth0), depth0))
    + "</td>\r\n            <td>"
    + alias2(alias1((depth0 != null ? depth0.juego : depth0), depth0))
    + "</td>\r\n            <td><img src='"
    + alias2(alias1((depth0 != null ? depth0.imagen : depth0), depth0))
    + "' class=\"og-logo\" /></td>\r\n        </tr>\r\n";
},"4":function(container,depth0,helpers,partials,data) {
    return "<h4>Nunca ha sido premiado.</h4>\r\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.length : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(4, data, 0),"data":data})) != null ? stack1 : "");
},"useData":true});
})();