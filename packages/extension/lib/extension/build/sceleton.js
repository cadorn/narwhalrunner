
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require('file');
var UTIL = require("util");
var JSON = require('json');
var STREAM = require('term').stream;

var HARNESS = require("common/build/harness");
var SKELETON = require("common/build/sceleton");


exports.main = function(args) { with(HARNESS.initialize(args, {type: "extension"})) {

    var vars = pkg.getManifest().manifest.narwhalrunner;
    
    vars.Type = "extension";
    vars.PackageChromeURL = "narwhalrunner://" + vars.InternalName + "/" + packageName + "/";
    vars.PackagePrefix = "NRID_" + packageID + "_";
    
    
    SKELETON.main(args, {
        type: "extension",
        vars: vars
    });

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
