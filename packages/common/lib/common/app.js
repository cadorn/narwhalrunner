
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var CHROME = require("./chrome");
var JSON = require("json");
var UTIL = require("util");
var FILE = require("file");
var STRUCT = require("struct");
var MD5 = require("md5");
var PACKAGES = require("packages");



var App = exports.App = function (path) {
    
    if (!(this instanceof exports.App)) {
        return new exports.App(path);
    }
    
    this.path = path;
    
    var manifestPath = this.path.join("package.json");
    if(!manifestPath.exists()) {
        throw "no manifest found at: " + manifestPath;
    }
    this.manifest = JSON.decode(manifestPath.read({charset:"utf-8"}));
    
    this.registerProtocolHandler();
}

App.prototype.exists = function() {
    return this.path.exists();
}

App.prototype.getInternalName = function() {
    return this.manifest.narwhalrunner.InternalName;
}


App.prototype.registerProtocolHandler = function() {
    var self = this;
    CHROME.registerProtocolHandler({
        internalAppName : self.getInternalName(),
        app: function(chromeEnv) {
            
            var parts = chromeEnv["PATH_INFO"].substr(1).split("/"),
                packageName = parts.shift(),
                packageID = STRUCT.bin2hex(MD5.hash(self.getInternalName() + ":" + packageName)),
                baseName = parts[parts.length-1];
                extension = baseName.split(".").pop();
     
            if(!UTIL.has(PACKAGES.catalog, packageName)) {
                return {
                    status: 500,
                    headers: {"Content-Type":"text/plain"},
                    body: ["Internal Server Error", "</br>", "Package not found: " + packageName]
                }                
            }
            
            var packageInfo = PACKAGES.catalog[packageName],
                packagePath = FILE.Path(packageInfo.directory),
                filePath = packagePath.join("chrome", parts.join("/"));
                
            if(!filePath.exists()) {
                return {
                    status: 404,
                    headers: {"Content-Type":"text/plain"},
                    body: ["File Not Found", "</br>", "File not found: " + filePath]
                }                
            }

            var app;
                
            if(extension=="xul") {
                app = function(env) {
                    
                    var body = filePath.read();
                    
                    body = body.replace(/%%PackageChromeURL%%/g, "narwhalrunner://" +
                            self.manifest.narwhalrunner.InternalName + "/" + packageName + "/");

                    body = body.replace(/%%PackagePrefix%%/g, "NRID_" + packageID + "_");
                    
                    return {
                        status: 200,
                        headers: {"Content-Type":"text/xml"},
                        body: [body]
                    }
                }
            } else {
                app = function(env) {
                    return {
                        status: 200,
                        headers: {"Content-Type":"text/plain"},
                        body: [filePath.read()]
                    }
                }
            }
            
            return app(chromeEnv);
        }
    });
}






var app;

exports.initializeApp = function(path) {
    if(app) {
        throw "App already initialized";
    }
    app = App(path);
    return app;
}

exports.getApp = function() {
    return app;
}
