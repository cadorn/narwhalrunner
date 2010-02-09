

function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };

var BUILDER = require("builder", "http://registry.pinf.org/cadorn.org/github/pinf/packages/common/");
var PROGRAM = require("../build/extension/program");
var ARGS = require("args");


var Builder = exports.Builder = function(pkg, options) {
    if (!(this instanceof exports.Builder))
        return new exports.Builder(pkg, options);
    this.construct(pkg, options);
}

Builder.prototype = BUILDER.Builder();



Builder.prototype.build = function(targetPackage, buildOptions) {

    // TODO: print out help info if applicable

    var parser = new ARGS.Parser();
    parser.option('--nojar').bool();
    var options = parser.parse(buildOptions.args);


    if(options.nojar) {
        if(!buildOptions.remoteProgram || !buildOptions.remoteDependencies) {
            throw new Error("Can only use --nojar with --remote");
        }
    }

    buildOptions.builder = this;

    var program = PROGRAM.Program(targetPackage, buildOptions);
    
    if(buildOptions.remoteProgram) {
        program.dist({
            "nojar": options.nojar
        });
    } else {
        program.build();
    }
}