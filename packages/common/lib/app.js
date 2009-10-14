
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var CHROME = require("./chrome");
var JSON = require("json");
var UTIL = require("util");
var FILE = require("file");
var STRUCT = require("struct");
var MD5 = require("md5");
var BASE64 = require("base64");
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

App.prototype.getPackageName = function() {
    return this.manifest.name;
}

App.prototype.registerProtocolHandler = function() {
    var self = this;
    CHROME.registerProtocolHandler({
        internalAppName : self.getInternalName(),
        app: function(chromeEnv) {

            print("Processing: " + chromeEnv["PATH_INFO"]);
            
            var parts = chromeEnv["PATH_INFO"].substr(1).split("/"),
                packageName = parts.shift(),
                packageID = STRUCT.bin2hex(MD5.hash(self.getInternalName() + ":" + packageName)),
                baseName = parts[parts.length-1],
                extension = baseName.split(".").pop();

            if(!UTIL.has(PACKAGES.catalog, packageName)) {
                print("error: Package not found: " + packageName);
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
                print("error: File not found: " + filePath);
                return {
                    status: 404,
                    headers: {"Content-Type":"text/plain"},
                    body: ["File Not Found", "</br>", "File not found: " + filePath]
                }                
            }

            var app,
                info = {};
                
            switch(extension) {
                
                // ASCII

                case "xul":
                    if(!UTIL.has(info, "contentType")) info.contentType = "application/vnd.mozilla.xul+xml";

                case "htm":
                case "html":
                    if(!UTIL.has(info, "contentType")) info.contentType = "text/html";

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
                
                    body = body.replace(/%%PackageName%%/g, packageName);
    
                    body = body.replace(/%%PackageChromeURLPrefix%%/g, "narwhalrunner://" +
                            self.manifest.narwhalrunner.InternalName + "/" + packageName + "/");
    
                    body = body.replace(/%%PackagePrefix%%/g, "NRID_" + packageID + "_");
                    
                    body = body.replace(/%%PackageNarwhalizeURL%%/g, "chrome://" +
                            self.manifest.narwhalrunner.InternalName +
                            "-narwhalrunner/content/common/narwhalize.js");
                            
                    body = body.replace(/%%QueryString%%/g, chromeEnv["QUERY_STRING"]);
                            
    /*
                    body = body.replace(/%%PackageNarwhalizeURL%%/g, "narwhalrunner://" +
                            self.manifest.narwhalrunner.InternalName +
                            "/common/content/narwhalize.js");
    */
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
    var self = this;
    this.type = type;
    this.loaderWindow = loaderWindow;
    
    // Call the main.js module of the app once the loaderWindow is completely loaded
    this.onLoaderWindowLoad = function() {
        var main = require("main", self.manifest.name);
        main.main(args);
    }
    loaderWindow.addEventListener("load", this.onLoaderWindowLoad, false);
}

App.prototype.started = function() {

    if(this.type=="application" && this.loaderWindow) {
        this.loaderWindow.close();
    }

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
