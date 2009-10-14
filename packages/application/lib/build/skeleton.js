
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require('file');
var UTIL = require("util");
var JSON = require('json');
var STREAM = require('term').stream;

var HARNESS = require("build/harness", "common");
var SKELETON = require("build/skeleton", "common");


exports.main = function(args) { with(HARNESS.initialize(args, {type: "application"})) {

    var vars = pkg.getManifest().manifest.narwhalrunner;

    vars.Type = "application";
    vars.PackageChromeURL = "narwhalrunner://" + vars.InternalName + "/" + packageName + "/";
    vars.PackagePrefix = "NRID_" + packageID + "_";
    
    var date =  new Date();
    vars.BuildID = String(date.getFullYear()) +
                   String(UTIL.padBegin(date.getMonth(),2)) +
                   String(UTIL.padBegin(date.getDate(),2));

    SKELETON.main(args, {
        type: "application",
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
    toPath = targetBuildPath.join("chrome", "chrome.manifest");
    
    templateVars.build.common.file = locatePath("chrome.manifest.tpl.txt", "common");
    
    copyWhile(fromPath, toPath, [
        [replaceVariables, [vars]],
        [runTemplate, [templateVars]],
    ]);
    
    
    // application.ini
    
    fromPath = locatePath("application.ini.tpl.txt");
    toPath = targetBuildPath.join("application.ini");

    copyWhile(fromPath, toPath, [
        [replaceVariables, [vars]]
    ]);

}}

if (module.id == require.main)
    exports.main(system.args);
