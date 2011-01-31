
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };

var FILE = require("file");

//var FIREBUG_CONSOLE = require("console", "registry.pinf.org/cadorn.org/github/fireconsole/packages/firefox-extension/packages/firebug/master");
var TRACING_CONSOLE = require("tracing-console", "registry.pinf.org/cadorn.org/github/fireconsole/packages/firefox-extension/packages/firebug/master");


var APP = require("../app").getApp();
var TRANSPORTER = require("jsgi/transporter", "transporter");
var PACKAGES = require("packages");
var MD5 = require("md5");
var STRUCT = require("struct");
var JSON = require("json");
var UTIL = require("util");
var FILE = require("file");
var PINF_PACKAGE_LOCATOR = require("package/locator", "pinf-common");
var NODULES = require("nodules", "nodules");
var QUERYSTRING = require("jack/querystring");


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

            var packagePathIdMap = programs[program.id].packagePathIdMap = {};

            var nodules = programs[program.id].nodules = {};

            try {

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
                            packagePathIdMap["file://" + PACKAGES.usingCatalog[locator.getFsPath()].directory] = locator.getFsPath();
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
                
                packagePathIdMap["file://" + program.path.valueOf()] = program.topLevelId;

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
            code.harness.push(PACKAGES.usingCatalog[module["using"]["requirejs"]].libPath.join("require/text.js").read());

//dump(packagePathIdMap);

//print("TRANSPORT: "+program.path);

            // add all program modules
            var packages = {};
            for(var id in nodules.factories ) {

                var packageModule = id.split("!"),
                    packageTopLevelId = packagePathIdMap[packageModule[0]],
                    packageHash = STRUCT.bin2hex(MD5.hash(packageTopLevelId));

//print(" --- packageModule: " + packageModule[0]);
//print("packageTopLevelId: " + packageTopLevelId);
//print("packageHash: " + packageHash);

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
                        descriptor.mappings[mapping.from.replace("/", "")] = STRUCT.bin2hex(MD5.hash(packagePathIdMap[mapping.to.split("!")[0]]));
                    }
                    packages[packageHash] = descriptor;
                }
                // remove lib directory to get minimal module ID
                var libDir = nodulesDescriptor.directories && nodulesDescriptor.directories.lib;
                if(typeof libDir != "string") {
                    libDir = "lib";
                }
//print(" id: "+id);
                var extension = id.match(/\.[\w]+$/);
                if(extension==".js") {

                    code.modules.push('define("' + packageHash + '' + packageModule[1].substring(libDir.length+1, packageModule[1].length-3) + '", ["require", "exports", "module"], function(require, exports, module) {');

                    var parts = nodules.factories[id].toString().split("\n");
                    parts = parts.splice(1, parts.length-3);
                    if(parts.length==0) {
                        throw new Error("File not found '" + id + "' for program: " + program.path);
                    }
                    
                    // remove AMD define calls if already present
                    var m1, m2;
                    if(m1 = parts[0].match(/^\s*define\s*\(\s*function\s*\(\s*require\s*,\s*exports\s*,\s*module\s*\)\s*\{\s*(.*)$/i)) {
                        parts[0] = m1[1];
                        if(m2 = parts[parts.length-1].match(/^(.*)\s*\}\s*\)\s*;?\s*$/i)) {
                            parts[parts.length-1] = m2[1];
                        }
                    }

                    code.modules.push(parts.join("\n"));
                } else {

                    code.modules.push('define("text!' + packageHash + '' + packageModule[1].substring(libDir.length+1, packageModule[1].length) + '", ["require", "exports", "module"], function(require, exports, module) {');
                    
                    var path = FILE.Path(packageModule[0].substring(7) + packageModule[1]);
                    code.modules.push('return ["' + path.read().replace(/"/g, '\\"').replace(/\n/g, '","') + '"].join("\\n");');

                }

                code.modules.push('});');
            }

            // add program init code
            code.harness.push('require({"baseUrl": "' + originalPathInfo + '/", "packages": ' + JSON.encode(UTIL.values(packages)) + '});');

//            var path = "file://" + program.path.valueOf();
//            path = path.replace(/\\/g, "/"); // windows compatibility for nodules to be able to find "/!"
//            var packageHash = STRUCT.bin2hex(MD5.hash(path));

            code.trigger.push('require(["require", "' + program.refId + '/' + program.module + '"], function(require, MAIN) {');
                code.trigger.push('require.ready(function() {');
                    code.trigger.push('MAIN.main("' + program.refId + '/' + program.module + '", "' + originalPathInfo + "/" + '");');
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
                
                if(parts[1]=="resources") {
                    // parts[0] represents package to get resources from
                    if(parts[0]=="false") {
                        // default program package
                        parts = parts.slice(1, parts.length);
                    } else {
                        system.log.error("Fetching of resources from packages other than the program package is not supported yet");
                    }
                }

                var ext = parts[parts.length-1].split("."); ext = ext[ext.length-1];

                var path = parts.slice(1, parts.length).join("/");
                    binaryExtensions = {"png": "image/png", "gif": "image/gif"},
                    asciiExtensions = {"js": "application/javascript", "css": "text/css"},
                    file;
/*
// @see ./chrome-program.js
                if(parts[0]=="pkg-server" && packageHashes[parts[1]]) {

//dump(parts);

                    var finalPath = packageHashes[parts[1]] + "!/lib/" + parts.slice(2, parts.length-1).join("/") + ".js";
                        finalPath = finalPath.replace(/\\/g, "/"); // windows compatibility for nodules to be able to find "/!",
                        qs = QUERYSTRING.parseQuery(env["QUERY_STRING"]),
                        method = parts[parts.length-1];
 
//print("!!!:finalPath: " + finalPath); 

                    try {
                        var response;
    
                        programs[program.id].nodules.ensure(finalPath, function(require) {

TRACING_CONSOLE.log(env);
    
                            response = require(finalPath)[method](env);
                        });

                        if(UTIL.len(response)==3 && response.status && response.headers && response.body) {
                            return response;
                        } else {
                            return {
                                "status": 200,
                                "headers": {
                                    "content-type": "application/json"
                                },
                                "body": [
                                    JSON.encode(response)
                                ]
                            }      
                        }
                    } catch(e) {
                        system.log.warn("Error calling '"+method+"' on '" + finalPath + "' (uri '"+env.pathInfo+"') for program: " + program.path);
                        return {
                            "status": 500,
                            "headers": {
                                "content-type": "text/plain"
                            },
                            "body": [
                                "Error calling '"+method+"' on '" + finalPath + "' (uri '"+env.pathInfo+"') for program: " + program.path
                            ]
                        }      
                    }
                    
                } else
*/
                if(parts[1]=="lib" && ext=="js" && packageHashes[parts[0]]) {
                    var pkgPath = FILE.Path(packageHashes[parts[0]].substring(7, packageHashes[parts[0]].length)),
                        subPath = parts.slice(1, parts.length).join("/");
                    var finalPath = pkgPath.join(subPath);
                    if(finalPath.exists()) {
                        return {
                            "status": 200,
                            "headers": {
                                "content-type": asciiExtensions[ext]
                            },
                            "body": [
                                finalPath.read()
                            ]
                        }
                    }
                    
                } else
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
                if(parts[0]=="resources" && binaryExtensions[ext]) {
                    file = program.path.join("resources", path);
                    if(file.exists()) {
                        return {
                            "status": 200,
                            "headers": {
                                "content-type": binaryExtensions[ext]
                            },
                            "body": [
                                file.read("b")
                            ]
                        }
                    }
                } else
                if(parts[0]=="resources" && asciiExtensions[ext]) {
                    file = program.path.join("resources", path);
                    if(file.exists()) {
                        return {
                            "status": 200,
                            "headers": {
                                "content-type": asciiExtensions[ext]
                            },
                            "body": [
                                file.read()
                            ]
                        }
                    }
                }

                if(parts[0]=="pkg-resources") {

                    var pkgPath = FILE.Path(packageHashes[parts[1]].substring(7, packageHashes[parts[1]].length)),
                        subPath = parts.slice(2, parts.length).join("/");
                        
                    var finalPath = pkgPath.join("resources", subPath);

//print("finalPath: " + finalPath);

                    if(finalPath.exists()) {
                        var body;
                        if(asciiExtensions[ext]) {
                            // ASCII
                            body = finalPath.read();
                            if(body["decodeToString"]) {
                                body = body.decodeToString('utf-8');
                            }
                        } else {
                            // binary
                            body = finalPath.read("b");
                        }
    
                        return {
                            "status": 200,
                            "headers": {
                                "content-type": asciiExtensions[ext] || binaryExtensions[ext]
                            },
                            "body": [
                                body
                            ]
                        };
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
        "id": parts[0] + "/" + parts[1],
        "pkg": pkg,
        "path": pkg.getPath().join([impl[parts[1]]["package"]]),
        "module": impl[parts[1]].module,
        "topLevelId": pkg.getTopLevelId() + "/" + impl[parts[1]]["package"],
        "refId": STRUCT.bin2hex(MD5.hash(pkg.getTopLevelId() + "/" + impl[parts[1]]["package"]))
    };
}

