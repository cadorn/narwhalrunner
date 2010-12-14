
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };

var FILE = require("file");

//var FIREBUG_CONSOLE = require("console", "registry.pinf.org/cadorn.org/github/fireconsole/packages/firefox-extension/packages/firebug/master");


var APP = require("../app").getApp();
var TRANSPORTER = require("jsgi/transporter", "transporter");
var PACKAGES = require("packages");
var MD5 = require("md5");
var STRUCT = require("struct");
var JSON = require("json");
var UTIL = require("util");
var PINF_PACKAGE_LOCATOR = require("package/locator", "pinf-common");
var NODULES = require("nodules", "nodules");


var programs = {},
    packageHashes = {};

exports.isCachable = function() {
    return false;
}

exports.getHeaders = function(env) {
    return {
        "content-type": "application/javascript"
    };
}

exports.app = function(options) {

//print("CALL exports.app in transporter-program");

    var transporter = TRANSPORTER.Transporter({
//        urlPrefix: "/" + options.packageReferenceId + "/transport-program/",
        urlPrefix: "/",
        loader: function(id) {

            // e.g. id = DB554D21BFDCEFBBBC89EB9C7E17A850/public-controls/com.developercompanion.reference/FirePHP_Examples_PageControls1_Program/page-top.js

print("TRANSPORTER.loader: id: "+id);
//            var parts = id.split("/");

//dump(packageHashes);

            // TODO: serve from program package
            
//            var program = getProgram(false, parts);

//print("TRANSPORTER.program.path: " + program.path);

            return false;
        }
    }, null);

    return function(env) {
        
        var originalPathInfo = env.pathInfo;

        // strip prefix
        env.pathInfo = env.pathInfo.replace("/" + options.packageReferenceId + "/transport-program/", "/");

        // determine if we have a root program URL
        var parts = env.pathInfo.substring(1).split("/");
        if(parts.length==2 && /^[^.]*$/.test(parts[1])) {
            // we have a program
            
            var program = getProgram(env, env.pathInfo.substring(1));

//print("programPath: " + program.path);

            var nodules = {};

            try {

                NODULES.newInstance(nodules);
                NODULES.newInstance(nodules, {
                    "debug": false,
                    "path": APP.getChrome().getProfilePath().join("narwhalrunner", "nodules"),
                    "sync": true,
                    "pathMappings": {
                        "monitorModules": false
                    }
                });

                nodules.registerPlugin("processPackage", {
                    "normalizeMapping": function(key, mapping) {
                        if(typeof mapping.catalog == "undefined") {
                            return false;
                        }
                        try {
                            var locator = PINF_PACKAGE_LOCATOR.PackageLocator(mapping);
                            var path = PACKAGES.usingCatalog[locator.getFsPath()].directory + "!";
                            path = "file://" + path + PACKAGES.usingCatalog[locator.getFsPath()].libPath.substring(path.length-1) + "/";
                            path = path.replace(/\\/g, "/"); // windows compatibility for nodules to be able to find "/!"
                            return {
                                "key": key + "/",
                                "to": path
                            };
                        } catch(e) {
                            dump(mapping);
                            system.log.error(e);
                        }
                        return false;
                    }
                });

                var path = "file://" + program.path.valueOf() + "!/lib/" + program.module + ".js";
                path = path.replace(/\\/g, "/"); // windows compatibility for nodules to be able to find "/!"
                nodules.ensure(path, function(require) {
//                    require("file://" + program.path.valueOf() + "!/lib/" + program.module + ".js").main();
                });
            } catch(e) {
                system.log.error(e);
            }

            var code = {"harness": [], "modules": [], "trigger": []};

            // add requirejs and plugins
            code.harness.push(PACKAGES.usingCatalog[module["using"]["requirejs"]].libPath.join("require.js").read());
            code.harness.push(PACKAGES.usingCatalog[module["using"]["requirejs"]].libPath.join("require/package.js").read());

            // add all program modules
            var packages = {};
            for(var id in nodules.factories ) {
                var parts = nodules.factories[id].toString().split("\n"),
                    packageModule = id.split("!"),
                    packageHash = STRUCT.bin2hex(MD5.hash(packageModule[0]));
                packageHashes[packageHash] = packageModule[0];
                var nodulesDescriptor = nodules.getPackage(packageModule[0]+"!/");
                // build package config with mapping
                if(!packages[packageHash]) {
                    var descriptor = {
                        "name": packageHash,
                        "location": packageHash,
                        "mappings": {}
                    };
                    for(var i = 0; i < nodulesDescriptor.mappings.length; i++){
                        var mapping = nodulesDescriptor.mappings[i];
                        descriptor.mappings[mapping.from.replace("/", "")] = STRUCT.bin2hex(MD5.hash(mapping.to.split("!")[0]));
                    }
                    packages[packageHash] = descriptor;
                }
                // remove lib directory to get minimal module ID
                var libDir = nodulesDescriptor.directories && nodulesDescriptor.directories.lib;
                if(typeof libDir != "string") {
                    libDir = "lib";
                }
                code.modules.push('define("' + packageHash + '' + packageModule[1].substring(libDir.length+1, packageModule[1].length-3) + '", ["require", "exports", "module"], function(require, exports, module) {');
                code.modules.push(parts.splice(1, parts.length-3).join("\n"));
                code.modules.push('});');
            }

            // add program init code
            code.harness.push('require({"baseUrl": "' + originalPathInfo + '/", "packages": ' + JSON.encode(UTIL.values(packages)) + '});');

            var path = "file://" + program.path.valueOf();
            path = path.replace(/\\/g, "/"); // windows compatibility for nodules to be able to find "/!"
            var packageHash = STRUCT.bin2hex(MD5.hash(path));

            code.trigger.push('require(["require", "' + packageHash + '/' + program.module + '"], function(require, MAIN) {');
                code.trigger.push('require.ready(function() {');
                    code.trigger.push('MAIN.main("' + packageHash + '/' + program.module + '", "' + originalPathInfo + "/" + '");');
                code.trigger.push('});');
            code.trigger.push('});');

            return {
                "status": 200,
                "headers": {
                    "content-type": "text/plain"
                },
                "body": [
                    code.harness.concat(code.modules, code.trigger).join("\n")
                ]
            }

        } else {

            // pass the request to any listeners
            // if the request is not satisfied we try and serve the module from the program package via transporter

            if(APP.refIdMap[parts[0]] &&
               APP.programTransportListeners[APP.refIdMap[parts[0]]] &&
               APP.programTransportListeners[APP.refIdMap[parts[0]]][parts[1]]) {
                   
                var subId = parts.slice(2).join("/");
                
                var response = false;
                for( var i = 0, c = APP.programTransportListeners[APP.refIdMap[parts[0]]][parts[1]].length ; i<c ; i++ ) {
                    try {
                        response = APP.programTransportListeners[APP.refIdMap[parts[0]]][parts[1]][i].onProgramTransportRequest(subId);
                        if(response!==false) {
                            return response;
                        }
                    } catch(e) {
                        system.log.error(e);
                    }
                }
            }

            if(programs[parts[0] + "/" + parts[1]]) {
                
                var program = programs[parts[0] + "/" + parts[1]];
                
                parts = parts.slice(2, parts.length);
                var ext = parts[parts.length-1].split("."); ext = ext[ext.length-1];

                var path = parts.slice(1, parts.length).join("/");
                    imageExtensions = {"png": "image/png"},
                    file;
                    
                if(parts[0]=="resources" && ext=="css") {
                    file = program.path.join("resources", path);
                    if(file.exists()) {
                        return {
                            "status": 200,
                            "headers": {
                                "content-type": "text/css"
                            },
                            "body": [
                                file.read()
                            ]
                        }
                    }
                } else
                if(parts[0]=="resources" && imageExtensions[ext]) {
                    file = program.path.join("resources", path);
                    if(file.exists()) {
                        return {
                            "status": 200,
                            "headers": {
                                "content-type": imageExtensions[ext]
                            },
                            "body": [
                                file.read("b")
                            ]
                        }
                    }
                }

                system.log.warn("File '" + path + "' (uri '"+env.pathInfo+"') not found at '" + file + "' for program: " + program.path);
                return {
                    "status": 404,
                    "headers": {
                        "content-type": "text/plain"
                    },
                    "body": [
                        "File '" + path + "' (uri '"+env.pathInfo+"') not found for program: " + program.path
                    ]
                }
            }

print("REQUEST: env.pathInfo: " + env.pathInfo);
            
            // we need to transport a module or program bundle
            return transporter(env);
/*
            return {
                "status": 200,
                "headers": {
                    "content-type": "text/plain"
                },
                "body": [
                    "transport module"
                ]
            }
*/
            
        }

//print("env.pathInfo: "+env.pathInfo);
/*
        if(env.pathInfo=="/" + options.packageReferenceId + "/transport-program/requirejs") {
            return {
                "status": 200,
                "headers": {
                    "content-type": "application/javascript"
                },
                "body": [
                    PACKAGES.usingCatalog[module["using"]["requirejs"]].libPath.join("require.js").read()
                ]
            }
        }

print("env.pathInfo: "+env.pathInfo);    
*/

//        return transporter(env);
    }
};


function getProgram(env, id) {

    var parts = id;
    if(typeof parts == "string") {
        parts = id.split("/");
    }

    if(programs[parts[0] + "/" + parts[1]]) {
        return programs[parts[0] + "/" + parts[1]];
    }

    if(!env) {
        throw new Error("Program should already be loaded!");
    }

//print("INIT PROGRAM " + parts[1] + " for " + parts[0]);
//print("INIT PROGRAM " + env.narwhalrunner.packageId);

    var pkg = APP.getPackageForRefId(parts[0]);
    var impl = pkg.getImplementsForUri("http://registry.pinf.org/cadorn.org/github/narwhalrunner/@meta/transport-program/0");
    if(!impl || !impl[parts[1]]) {
        throw new Error("No program configuration found for: " + parts[1]);
    }
    // ensure only chrome programs can be loaded via non-accessible chrome URLs
    if(env.context != impl[parts[1]].context) {
        throw new Error("Cannot call program '"+parts[1]+"' with context '"+impl[parts[1]].context+"' from load context '"+env.context+"'.");
    }

    return programs[parts[0] + "/" + parts[1]] = {
        "pkg": pkg,
        "path": pkg.getPath().join([impl[parts[1]]["package"]]),
        "module": impl[parts[1]].module
    };
}

