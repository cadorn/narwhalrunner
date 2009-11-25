
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var CHROME = require("./chrome");
var JSON = require("json");
var UTIL = require("util");
var FILE = require("file");
var BASE64 = require("base64");
var MD5 = require("md5");
var STRUCT = require("struct");
var MD5 = require("md5");
var STRUCT = require("struct");
var PACKAGES = require("packages");
var SEA = require("narwhal/tusk/sea");

var PACKAGE = require("./package");
var BINDING = require("./binding");
var CONTAINER = require("./container");



var App = exports.App = function (packageName) {
    
    if (!(this instanceof exports.App)) {
        return new exports.App(packageName);
    }

    if(!UTIL.has(PACKAGES.catalog, packageName)) {
        throw "App package not found: " + packageName;
    }

    this.path = PACKAGES.catalog[packageName].directory;

    var manifestPath = this.path.join("package.json");
    if(!manifestPath.exists()) {
        throw "no manifest found at: " + manifestPath;
    }
    this.manifest = JSON.decode(manifestPath.read({charset:"utf-8"}));
    
    PACKAGE.resolvePackageInfoVariables(this.manifest);
    
    this.registerProtocolHandler();
    
    this.bindings = {};
    this.containers = {};
    this.resourceURLs = {
        path: {},
        key: {}
    };

    this.status = false;

    this.sea = SEA.Sea(PACKAGES.catalog[this.manifest.narwhalrunner.ID].directory);
    
    // keep the app package handy    
    this.pkg = PACKAGE.Package(packageName).setAppInfo(this.manifest.narwhalrunner);
    this.pkgVars = this.pkg.getTemplateVariables();
 
    // populate package reference ID map to package ID
    this.refIdMap = {};
    var self = this;
    UTIL.keys(PACKAGES.usingCatalog).forEach(function(id) {
        self.refIdMap[PACKAGE.Package(id).setAppInfo(self.manifest.narwhalrunner).getReferenceId()] = id;
    });
}

App.prototype.exists = function() {
    return this.path.exists();
}

App.prototype.getAppPackage = function() {
    return this.pkg;
}

App.prototype.getSea = function() {
    return this.sea;
}

App.prototype.getPackage = function(id) {
    return PACKAGE.Package(id).setAppInfo(this.manifest.narwhalrunner);
}

App.prototype.getInternalName = function() {
    return this.getInfo().InternalName;
}

App.prototype.getInfo = function() {
    return this.manifest.narwhalrunner;
}

App.prototype.getPackageName = function() {
    return this.manifest.name;
}

App.prototype.getContentBaseUrl = function() {
    return this.pkgVars["Package.ContentBaseURL"];
}

App.prototype.registerBinding = function(pkgId, object, name) {
    if(!UTIL.has(this.bindings, pkgId)) {
        this.bindings[pkgId] = {};
    }
    return this.bindings[pkgId][name] = BINDING.Binding(pkgId, object, name);
}

App.prototype.getBinding = function(pkgId, name) {
    if(!UTIL.has(this.bindings, pkgId)) {
        return false;
    }
    if(!UTIL.has(this.bindings[pkgId], name)) {
        return false;
    }
    return this.bindings[pkgId][name];
}

App.prototype.registerContainer = function(pkgId, object, module, name) {
    if(!UTIL.has(this.containers, pkgId)) {
        this.containers[pkgId] = {};
    }

    if(UTIL.has(this.containers[pkgId], name)) {
        var container = this.containers[pkgId][name];
        if(container.getObject()===object) {
            // the container has already been registered
            container.reattach();
            return container;
        } else {
            // a different container is registering in the same spot
            container.destroy();
        }
    }

    var containerModule = require(module, pkgId);
    if(!containerModule) {
        throw "Could not find module '" + module + "' in package: " + pkgId;
    }
    
    return this.containers[pkgId][name] = containerModule.Container(pkgId, object, name);
}

App.prototype.getContainer = function(pkgId, name) {
    if(!UTIL.has(this.containers, pkgId)) {
        return false;
    }
    if(!UTIL.has(this.containers[pkgId], name)) {
        return false;
    }
    return this.containers[pkgId][name];
    
}

App.prototype.getResourceUrlForPackage = function(pkg) {
    var path = pkg.getPath().valueOf();
    var id = STRUCT.bin2hex(MD5.hash(path));
    if(!UTIL.has(this.refIdMap, id)) {
        this.refIdMap[id] = PACKAGE.Package(pkg).setAppInfo(this.manifest.narwhalrunner);
    }    
    return "narwhalrunner://" + this.manifest.narwhalrunner.InternalName + "/" + id + "/resources/";
}

App.prototype.registerProtocolHandler = function() {
    var self = this;
    
    var appInfo = self.manifest.narwhalrunner;
    
    appInfo["CommonPackage.ReferenceId"] = PACKAGE.Package(module["package"]).setAppInfo(appInfo).getReferenceId();
    
    CHROME.registerProtocolHandler({
        internalAppName : self.getInternalName(),
        app: function(chromeEnv) {

            print("Processing: " + chromeEnv["PATH_INFO"]);
            
            var parts = chromeEnv["PATH_INFO"].substr(1).split("/"),
                packageRefId = parts.shift(),
                baseName = parts[parts.length-1],
                extension = baseName.split(".").pop();
                
            var packageName = self.refIdMap[packageRefId];
            
            var pkg;
            if(!packageName || typeof packageName == "string") {
                if(!UTIL.has(PACKAGES.usingCatalog, packageName)) {
                    print("error: Package not found: " + packageName);
                    return {
                        status: 500,
                        headers: {"Content-Type":"text/plain"},
                        body: ["Internal Server Error", "</br>", "Package not found: " + packageName]
                    }                
                }
                pkg = PACKAGE.Package(packageName);
            } else {
                pkg = packageName;
            }
            filePath = pkg.getPath();

            if(parts[0]=="resources") {
                // path is fine the way it is            
            } else {
                // if a locale URL is accessed we default to en-US for now            
//                if(parts[0]=="locale") {
//                    parts.splice(1,0,"en-US");
//                }
                filePath = filePath.join("chrome");
            }
            filePath = filePath.join(parts.join("/"));
            

            if(!filePath.exists()) {
                print("error: File not found: " + filePath);
                return {
                    status: 404,
                    headers: {"Content-Type":"text/plain"},
                    body: ["File Not Found", "</br>", "File not found: " + filePath]
                }                
            }
            
            pkg.setAppInfo(appInfo);

            var app,
                info = {};
                
            switch(extension) {
                
                // ASCII

                case "xul":
                    if(!UTIL.has(info, "contentType")) info.contentType = "application/vnd.mozilla.xul+xml";

                case "htm":
                case "html":
                case "dtd":
                    if(!UTIL.has(info, "contentType")) info.contentType = "text/html";

                case "xml":
                    if(!UTIL.has(info, "contentType")) info.contentType = "text/xml";

                case "css":
                    if(!UTIL.has(info, "contentType")) info.contentType = "text/css";

                case "js":
                    if(!UTIL.has(info, "contentType")) info.contentType = "application/vnd.mozilla.xul+xml";


                if(!UTIL.has(info, "binary")) info.binary = false;

                // Binary

                case "png":
                    if(!UTIL.has(info, "contentType")) info.contentType = "image/png";
                

                default:

                if(!UTIL.has(info, "binary")) info.binary = true;
                if(!UTIL.has(info, "contentType")) info.contentType = "application/binary";
            }

            app = function(env) {

                print("Serving: " + filePath);
                
                var body;
                
                if(info.binary) {
                    body = filePath.read("b");
                } else {
                    body = filePath.read();

                    if(body["decodeToString"]) {
                        body = body.decodeToString('utf-8');
                    }

                    body = body.replace(/%%QueryString%%/g, chromeEnv["QUERY_STRING"]);

                    body = pkg.replaceTemplateVariables(body);
                }
   
                return {
                    status: 200,
                    headers: {"Content-Type": info.contentType},
                    body: [body]
                }
            }   
            
            var result = app(chromeEnv);
            
            // base64 encode the body
            for( var i=0 ; i<result.body.length ; i++ ) {
                result.body[i] = BASE64.encode(result.body[i]);
            }
            
            return result;
        }
    });
}

App.prototype.start = function(type, loaderWindow, args) {
    if(this.status) {
        return;
    }
    this.status = "starting";

    var self = this;
    this.type = type;
    this.loaderWindow = loaderWindow;
    
    // Call the main.js module of the app once the loaderWindow is completely loaded
    this.onLoaderWindowLoad = function() {
        var main = require("main", self.manifest.name);

        try {
            main.main(args);
        } catch(e) {
            print(e);
        }
    }
    loaderWindow.addEventListener("load", this.onLoaderWindowLoad, false);
}

App.prototype.started = function() {

    this.status = "started";

    if(this.type=="application" && this.loaderWindow) {
        this.loaderWindow.close();
    }
}





var app;

exports.initializeApp = function(path) {

print("narwhalrunner:initializeApp()");

    // singleton
    if(app) {
//        throw "App already initialized";
        return app;
    }
    app = App(path);
    return app;
}

exports.getApp = function() {
    return app;
}
