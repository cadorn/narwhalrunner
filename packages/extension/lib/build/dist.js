
var TUSK = require("narwhal/tusk/tusk");
var PROGRAM = require("./program");

exports.main = function(args) {
    var program = PROGRAM.Program(TUSK.getActive().getSea().getPackage(args["package"]));    
    program.dist(args.args);
}

if (module.id == require.main)
    exports.main(system.args);
