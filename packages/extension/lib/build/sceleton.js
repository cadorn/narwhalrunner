
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require('file');
var UTIL = require("util");
var STREAM = require('term').stream;
var HARNESS = require("./harness");


exports.main = function(args) { with(HARNESS.initialize(args)) {
        
    var vars = pkg.getManifest().manifest.narwhalrunner;
    var templateVars = {
        build: {
            common: {
                file: ""
            }
        }
    }
    
    
    // chrome.manifest
    
    fromPath = locatePath("chrome.manifest.tpl.txt");
    toPath = targetBuildPath.join("chrome.manifest");
    
    templateVars.build.common.file = locatePath("chrome.manifest.tpl.txt", "common");
    
    copyWhile(fromPath, toPath, [
        [replaceVariables, [vars]],
        [runTemplate, [templateVars]],
    ]);
    
    
    // install.rdf    
    
    fromPath = locatePath("install.rdf.tpl.xml");
    toPath = targetBuildPath.join("install.rdf");

    copyWhile(fromPath, toPath, [
        [replaceVariables, [vars]]
    ]);


}}

if (module.id == require.main)
    exports.main(system.args);
