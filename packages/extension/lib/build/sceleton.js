
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



    // copy chrome directory for common
    
    fromPath = locatePath("chrome/content", "common");
    toPath = targetBuildPath.join("narwhalrunner", "chrome", "content", "common");
    toPath.mkdirs();
    fromPath.listPaths().forEach(function(path) {
        var name = path.basename();
        copyWhile(path, toPath.join(name), [
            [replaceVariables, [vars]],
        ]);
    });

    // copy components directory for common
    
    fromPath = locatePath("components", "common");
    toPath = targetBuildPath.join("components");
    fromPath.listPaths().forEach(function(path) {

        var name = path.basename().valueOf();

        // for all JS files
        if(name.split(".")[1]=="js") {

            // copy if changed and touch .autoreg
            // @see http://kb.mozillazine.org/Dev_:_Extending_the_Chrome_Protocol
            
            if(!toPath.exists() || toPath.join(name).read()!=replaceVariables(null, path.read(), vars)) {
                
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
                                    
                                    path.touch()
                                    
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
