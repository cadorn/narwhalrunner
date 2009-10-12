
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require('file');
var UTIL = require("util");
var JSON = require('json');
var STREAM = require('term').stream;
var HARNESS = require("./harness");
var MANIFEST = require("narwhal/tusk/manifest");


exports.main = function(args, options) { with(HARNESS.initialize(args, options)) {
        
    var vars = options.vars;
    vars.PackageName = packageName;
    vars.CommonPackageName = commonPackageName;
    
    
    // determine xulrunner engine path
    var enginePath = commonPackage.getPackage("narwhal-xulrunner").getPath();
    var dependenciesPath = sea.getDependenciesPath();
    vars.XULRunnerEnginePath = "dependencies" + enginePath.substr(dependenciesPath.valueOf().length);

    
    var templateVars = {
        build: {
            common: {
                file: ""
            }
        }
    }
    
    // copy chrome directory for common and extension/application packages
    
    UTIL.forEach(["common", options.type], function(packageName) {

        fromPath = locatePath("chrome/content", packageName);
        toPath = targetBuildChromePath.join("narwhalrunner", "chrome", "content", packageName);
        toPath.mkdirs();
        if(fromPath && fromPath.exists()) {
            fromPath.listPaths().forEach(function(path) {
                var name = path.basename();
                copyWhile(path, toPath.join(name), [
                    [replaceVariables, [vars]],
                ]);
            });
        }        
    });

    // copy modules directory for common

    fromPath = locatePath("modules", "common");
    toPath = targetBuildChromePath.join("narwhalrunner", "modules");
    toPath.mkdirs();
    if(fromPath && fromPath.exists()) {
        fromPath.listPaths().forEach(function(path) {
            var name = path.basename();
            copyWhile(path, toPath.join(name), [
                [replaceVariables, [vars]],
            ]);
        });
    }

    
    // copy components directory for common
    
    fromPath = locatePath("components", "common");
    toPath = targetBuildPath.join("components");
    toPath.mkdirs();
    fromPath.listPaths().forEach(function(path) {

        var name = path.basename().valueOf();

        // for all JS files
        if(name.split(".")[1]=="js") {

            // copy if changed and touch .autoreg
            // @see http://kb.mozillazine.org/Dev_:_Extending_the_Chrome_Protocol
            
            if(!toPath.join(name).exists() || toPath.join(name).read()!=replaceVariables(null, path.read(), vars)) {
                
                copyWhile(path, toPath.join(name), [
                    [replaceVariables, [vars]],
                ]);
                
                var devtoolsManifest = sea.path.join("devtools.local.json");
                if(devtoolsManifest.exists()) {
                    devtoolsManifest = JSON.parse(devtoolsManifest.read());
                    if(UTIL.has(devtoolsManifest, "binaries")) {
                        devtoolsManifest.binaries.forEach(function(info) {
                            var path = FILE.Path(info[1]);
                            if(path.exists()) {
                                var parts = path.valueOf().split("/");
                                if(parts[parts.length-2]=="MacOS") {

                                    path = path.dirname().join(".autoreg");
                                    
                                    path.touch();
                                    
                                    print("Touched: " + path);
                                }
                            }
                        });
                    }
                }
            }
            
        } else {
            path.copy(toPath.join(name));
            print("Copied '" + path + "' to '" + toPath + "'");    
        }
    });
        
    // copy package.json for extension
    fromPath = pkg.getManifest().path;
    toPath = targetBuildPath.join("package.json");
    fromPath.copy(toPath);
    print("Copied '" + fromPath + "' to '" + toPath + "'");    
    
}}

if (module.id == require.main)
    exports.main(system.args);
