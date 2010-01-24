
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var OBSERVABLE = require("observable", "observable");
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

var CHROME = require("./chrome");


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
OBSERVABLE.mixin(App.prototype);

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
    
    var protocolHandler = {
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
            var filePath = pkg.getPath();

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
    };

    Cc["@mozilla.org/network/protocol;1?name=narwhalrunner"].
        getService().
            wrappedJSObject.registerExtension(protocolHandler);
    
    Cc["@mozilla.org/network/protocol;1?name=narwhalrunner-accessible"].
        getService().
            wrappedJSObject.registerExtension(protocolHandler);
}

App.prototype.start = function(type, loaderWindow, args) {
    var self = this;

    if(self.status) {
        // app can only initialize once
        return;
    }

    self.status = "starting";
    self.type = type;
    self.loaderWindow = loaderWindow;

    // Call the main.js module of the app once the loaderWindow is completely loaded
    self.onLoaderWindowLoad = function() {
        self.programModule = require("main", self.manifest.name);

        try {
            self.programModule.main(args);
        } catch(e) {
            system.log.error(e);
        }

        self.onNewChrome(self.getChrome());
    }
    loaderWindow.addEventListener("load", self.onLoaderWindowLoad, false);
}

App.prototype.started = function() {

    this.status = "started";

    if(this.type=="application" && this.loaderWindow) {
        this.loaderWindow.close();
    }
}

App.prototype.onNewChrome = function(chrome) {
    try {
        app.publish("newChrome", chrome);

        if(this.programModule.chrome) {
            this.programModule.chrome(chrome);
        }
    } catch(e) {
        system.log.error(e);
    }
}


// Chrome management

var activeChrome = null;
var chromes = [];           // all known chromes

App.prototype.getChrome = function() {
    return exports.getChrome();
}

exports.getChrome = function() {
    return activeChrome;
}

CHROME.Chrome.prototype.subscribeTo("new", function(chrome) {
    // when a new chrome is initialized we assume it is a browser window and that it
    // has or will get the focus
    activeChrome = chrome;
    chromes.push(chrome);
});

CHROME.Chrome.prototype.subscribeTo("load", function(chrome) {
    // if the app is initialized we call chrome() on the program module
    // this is the case when the second browser window is opened
    // for the first window chrome() is called after main() on the program module
    var app = exports.getApp();
    if(app && app.programModule) {
        app.onNewChrome(chrome);
    }
});

CHROME.Chrome.prototype.subscribeTo("focus", function(chrome) {
    activeChrome = chrome;
});





// App singleton management

var app;

exports.initializeApp = function(path, chrome) {
    // only initialize the app once no matter how many windows are open
    if(!app) app = App(path);
    return app;
}

exports.getApp = function() {
    return app;
}
