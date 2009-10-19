
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require('file');
var UTIL = require("util");
var JSON = require('json');
var STREAM = require('term').stream;

var HARNESS = require("build/harness", "common");
var SKELETON = require("build/skeleton", "common");


exports.main = function(args) { with(HARNESS.initialize(args, {type: "extension"})) {

    var vars = pkg.getManifest().manifest.narwhalrunner;
    vars.Type = "extension";
    UTIL.update(vars, pkg.getTemplateVariables());

    
    SKELETON.main(args, {
        type: "extension",
        vars: vars
    });

    
    // install.rdf    
    
    fromPath = locatePath("install.rdf.tpl.xml");
    toPath = targetBuildPath.join("install.rdf");

    copyWhile(fromPath, toPath, [
        [replaceVariables, [vars]]
    ]);

}}

if (module.id == require.main)
    exports.main(system.args);
