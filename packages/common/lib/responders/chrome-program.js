
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };

var FILE = require("file");

//var FIREBUG_CONSOLE = require("console", "registry.pinf.org/cadorn.org/github/fireconsole/packages/firefox-extension/packages/firebug/master");
var TRACING_CONSOLE = require("tracing-console", "registry.pinf.org/cadorn.org/github/fireconsole/packages/firefox-extension/packages/firebug/master");


var APP = require("../app").getApp();
var TRANSPORTER = require("jsgi/transporter", "transporter");
var PACKAGES = require("packages");
var JSON = require("json");
var UTIL = require("util");
var FILE = require("file");
var PINF_PACKAGE_LOCATOR = require("package/locator", "pinf-common");
var NODULES = require("nodules", "nodules");
var QUERYSTRING = require("jack/querystring");


var FORCE_RELOAD = true;


var programs = {};

exports.isCachable = function() {
    return false;
}

exports.getHeaders = function(env) {
    return {
        "content-type": "application/javascript"
    };
}

exports.app = function(options) {

    return function(env) {
        
        var originalPathInfo = env.pathInfo;

//dump("originalPathInfo: " + originalPathInfo);

        // strip prefix
        env.pathInfo = env.pathInfo.replace("/" + options.packageReferenceId + "/chrome-program/", "/");

        var parts = env.pathInfo.substring(1).split("/");
            
        var program = getProgram(env, env.pathInfo.substring(1));
        
        if(FORCE_RELOAD || !programs[program.id].nodules) {
            
            programs[program.id].nodules = {};

            try {

                NODULES.newInstance(programs[program.id].nodules, {
                    "debug": false,
                    "path": APP.getChrome().getProfilePath().join("narwhalrunner", "nodules"),
                    "sync": true,
                    "pathMappings": {
                        "monitorModules": false
                    }
                });

                programs[program.id].nodules.registerPlugin("processPackage", {
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
                                "to": path,
                                "id": locator.getTopLevelId(),
                                "info": mapping
                            };
                        } catch(e) {
                            dump(mapping);
                            system.log.error(e);
                        }
                        return false;
                    }
                });

                programs[program.id].nodules.registerPlugin("processModule", {
                    "fetchFactory": function(uri, id, currentId, pkg) {
                        if(pkg && pkg.mappings) {
                            for( var i=0,ic=pkg.mappings.length ; i<ic ; i++ ) {
                                if(id.substring(0, pkg.mappings[i].from.length)==pkg.mappings[i].from) {
                                    if(pkg.mappings[i].info && pkg.mappings[i].info.runtime && pkg.mappings[i].info.runtime.instance=="inherit") {
                                        return true;
                                    }
                                }
                            }
                        }
                        return false;
                    },
                    "fetchExports": function(uri, id, currentId, pkg) {
                        if(pkg && pkg.mappings) {
                            for( var i=0,ic=pkg.mappings.length ; i<ic ; i++ ) {
                                if(id.substring(0, pkg.mappings[i].from.length)==pkg.mappings[i].from) {
                                    if(pkg.mappings[i].info && pkg.mappings[i].info.runtime && pkg.mappings[i].info.runtime.instance=="inherit") {
                                        id = id.substring(pkg.mappings[i].from.length);
                                        return require(id, pkg.mappings[i].id);
                                    }
                                }
                            }
                        }
                        return false;
                    }
                });

            } catch(e) {
                system.log.error(e);
            }
        }

        var finalPath = "file://" + programs[program.id].path + "!/lib/" + parts.slice(2, parts.length-1).join("/") + ".js";
            finalPath = finalPath.replace(/\\/g, "/"); // windows compatibility for nodules to be able to find "/!",
            qs = QUERYSTRING.parseQuery(env["QUERY_STRING"]),
            method = parts[parts.length-1];

        try {
            var response;

            programs[program.id].nodules.ensure(finalPath, function(require) {
                try {
                    response = require(finalPath)[method](env);
                } catch(e) {
                    system.log.error(e);
                    return {
                        "status": 500,
                        "headers": {
                            "content-type": "text/plain"
                        },
                        "body": [
                            "Error: " + e
                        ]
                    }      
                }
            });

            if(UTIL.len(response)==3 && typeof response.status != "undefined" && typeof response.headers != "undefined" && typeof response.body != "undefined") {
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
    var impl = pkg.getImplementsForUri("http://registry.pinf.org/cadorn.org/github/narwhalrunner/@meta/chrome-program/0");
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
        "path": pkg.getPath().join([impl[parts[1]]["package"]])
    };
}

