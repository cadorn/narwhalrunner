
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require('file');
var UTIL = require("util");
var JSON = require('json');
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



    // copy chrome directory from common
    
    fromPath = locatePath("chrome/content", "common");
    toPath = targetBuildPath.join("narwhalrunner", "chrome", "content", "common");
    toPath.mkdirs();
    fromPath.listPaths().forEach(function(path) {
        var name = path.basename();
        copyWhile(path, toPath.join(name), [
            [replaceVariables, [vars]],
        ]);
    });

    // copy components directory from common
    
    fromPath = locatePath("components", "common");
    toPath = targetBuildPath.join("components");
    fromPath.listPaths().forEach(function(path) {
        
        var name = path.basename();
        
        if(name=="nsINarwhal.js") {

            copyWhile(path, toPath.join(name), [
                [replaceVariables, [vars]],
            ]);
            
        } else {
            path.copy(toPath.join(name));
            print("Copied '" + path + "' to '" + toPath + "'");    
        }
    });
    
    
    // create extension package.manifest file
    
    toPath = targetBuildPath.join("package.json");
    toPath.write(JSON.encode({
        name: vars.ID
    }, null, 4), {charset: 'utf-8'});
    print("Wrote file: " + toPath);

}}

if (module.id == require.main)
    exports.main(system.args);
