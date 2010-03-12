
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var BUILDER = require("builder/program", "http://registry.pinf.org/cadorn.org/github/pinf/packages/common/");
var PROGRAM = require("../build/extension/program");
var ARGS = require("args");


var ProgramBuilder = exports.ProgramBuilder = function() {
    if (!(this instanceof exports.ProgramBuilder))
        return new exports.ProgramBuilder();
}

ProgramBuilder.prototype = BUILDER.ProgramBuilder();


ProgramBuilder.prototype.build = function(buildOptions) {


    // TODO: print out help info if applicable

    var parser = new ARGS.Parser();
    parser.option('--nojar').bool();
    var options = parser.parse(buildOptions.args);


    if(options.nojar) {
        if(!buildOptions.remoteProgram || !buildOptions.remoteDependencies) {
            throw new Error("Can only use --nojar with --remote");
        }
    }

    var program = PROGRAM.Program(this, buildOptions);
    
    if(buildOptions.remoteProgram) {
        program.dist({
            "nojar": options.nojar
        });
    } else {
        program.build();
    }

}