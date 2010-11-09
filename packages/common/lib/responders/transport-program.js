
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };

var FILE = require("file");

var APP = require("../app").getApp();
var TRANSPORTER = require("jsgi/transporter", "transporter");
var PACKAGES = require("packages");


//system.env.NODULES_DEBUG = true;
system.env.NODULES_PATH = APP.getChrome().getProfilePath().join("narwhalrunner", "nodules");
system.env.NODULES_PATH_MAPPINGS = {
    "monitorModules": false
};
var NODULES = require("nodules", "nodules");


exports.isCachable = function() {
    return false;
}

exports.getHeaders = function(env) {
    return {
        "content-type": "application/javascript"
    };
}

exports.app = function(options) {

print("INIT TRANSPORT: "+FILE.Path(module.path).dirname().join("../www").valueOf());    

    var transporter = TRANSPORTER.Transporter({
        urlPrefix: "/" + options.packageReferenceId + "/transport-program/",
        loader: function(id) {

            var path;

            path = FILE.Path(module.path).dirname().join("../www", id);

print(" ID: "+id + " : " + path);
            
            if(path && path.exists()) {
                return path.read();
            }
        }
    }, null);

    return function(env) {

        // strip prefix
        env.pathInfo = env.pathInfo.replace("/" + env.narwhalrunner.packageReferenceId + "/transport-program/", "");

        // determine if we have a root program URL
        var parts = env.pathInfo.split("/");
        if(parts.length==2 && /^[^.]*$/.test(parts[1])) {
            // we have a program

print("INIT PROGRAM " + parts[1] + " for " + parts[0]);
print("INIT PROGRAM " + env.narwhalrunner.packageId);

            var pkg = APP.getPackageForRefId(parts[0]);
            var impl = pkg.getImplementsForUri("http://registry.pinf.org/cadorn.org/github/narwhalrunner/@meta/transport-program/0");
            if(!impl || !impl[parts[1]]) {
                throw new Error("No program configuration found for: " + parts[1]);
            }
            // ensure only chrome programs can be loaded via non-accessible chrome URLs
            if(env.context != impl[parts[1]].context) {
                throw new Error("Cannot call program '"+parts[1]+"' with context '"+impl[parts[1]].context+"' from load context '"+env.context+"'.");
            }

dump(impl[parts[1]]);

            // try and test run package via nodules
            var programPath = pkg.getPath().join([impl[parts[1]]["package"]]);

print("programPath: " + programPath);
print("NODULES.baseFilePath: "+NODULES.baseFilePath);

            try {

                NODULES.ensure("file://" + programPath.valueOf() + "!/main.js", function(require){


    print("LOADED 1!");
                    require("./main").main();
    print("LOADED 2!");

                });

            } catch(e) {
                system.log.error(e);
            }



            return {
                "status": 200,
                "headers": {
                    "content-type": "text/plain"
                },
                "body": [
                    "transport program"
                ]
            }

        } else {
            // we need to transport a module

            return {
                "status": 200,
                "headers": {
                    "content-type": "text/plain"
                },
                "body": [
                    "transport module"
                ]
            }

            
        }

print("env.pathInfo: "+env.pathInfo);

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

        return transporter(env);
    }    
};
