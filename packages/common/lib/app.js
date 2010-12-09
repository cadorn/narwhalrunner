
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var OBSERVABLE = require("observable", "observable");
var JSON = require("json");
var UTIL = require("util");
var FILE = require("file");
var URI = require("uri");
var BASE64 = require("base64");
var MD5 = require("md5");
var STRUCT = require("struct");
var PACKAGES = require("packages");
var SYSTEM = require("system");

var CACHE = require("./cache");
var PACKAGE = require("./package");
var BINDING = require("./binding");
var CONTAINER = require("./container");

var CHROME = require("./chrome");

var SANDBOX = require("sandbox");
var LOADER = require("loader");

var APPS = require("./apps");

var PROFILER = require("./profiler");

const PREFS = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);

const RELOAD_ROUTE_RESPONDERS = false;


var version;

var App = exports.App = function (packageName) {
    
    if (!(this instanceof exports.App)) {
        return new exports.App(packageName);
    }

    if(!UTIL.has(PACKAGES.uidCatalog, packageName)) {
        if(!UTIL.has(PACKAGES.usingCatalog, packageName)) {
            throw new AppError("App package not found: " + packageName);
        } else {
        this.path = PACKAGES.usingCatalog[packageName].directory;
        }
    } else {
        this.path = PACKAGES.usingCatalog[PACKAGES.uidCatalog[packageName].id].directory;
    }


    var manifestPath = this.path.join("package.json");
    if(!manifestPath.exists()) {
        throw new AppError("no manifest found at: " + manifestPath);
    }
    this.manifest = JSON.decode(manifestPath.read({charset:"utf-8"}));
    
    PACKAGE.resolvePackageInfoVariables(this.manifest);
    
    this.registerProtocolHandler();
    
    this.resourceURLs = {
        path: {},
        key: {}
    };

    this.status = false;
    
    // keep the app package handy    
    this.pkg = PACKAGE.Package(this.path).setAppInfo(this.manifest.narwhalrunner);
    this.pkgVars = this.pkg.getTemplateVariables();

    // routes for packages - THIS IS THE NEW MODEL
    this.routes = {};

    // populate package reference ID map to package ID
    this.refIdMap = {};
    var self = this;
        
    UTIL.keys(PACKAGES.usingCatalog).forEach(function(id) {
        self.registerPackage(PACKAGE.Package(PACKAGES.usingCatalog[id].directory, id));//, id);
    });

    this.cache = CACHE.Cache(this.getProfilePath().join("Cache", this.getInternalName()));

    this.programTransportListeners = {};
}
OBSERVABLE.mixin(App.prototype);

App.prototype.registerPackage = function(pkg, id) {
    var self = this;
    if(pkg.hasUid()) {
        if(!id) {
            // HACK: Appending "master" until we have a better solution
            // TODO: Determine revision properly
            id = pkg.getTopLevelId();
        }
        var refID = pkg.setAppInfo(this.manifest.narwhalrunner).getReferenceId();

        this.refIdMap[refID] = id;

        // check for path routing
        // TODO: A routing helper should evolve over time to encapsulate all this functionality
        var impl = pkg.getDescriptor().getImplementsForUri("http://registry.pinf.org/cadorn.org/github/pinf/@meta/routing/path/0.1.0");
        if(impl) {
            // initialize each route
            UTIL.every(impl.mappings, function(mapping) {
                try {
                    self.registerRoute(pkg, {
                        "type": mapping[1].type,
                        "route": mapping[0],
                        "module": mapping[1].module
                    }, id);
                } catch(e) {
                    system.log.error(e + " in " + pkg.getPath());
                }
            });
        }
    }
}

App.prototype.registerRoute = function(pkg, info, id) {
    var refID = pkg.getReferenceId();

    if(!this.refIdMap[refID]) {
        if(!id) {
            // HACK: Appending "master" until we have a better solution
            // TODO: Determine revision properly
            id = pkg.getTopLevelId();
        }
        this.refIdMap[refID] = id;
    } else {
        id = this.refIdMap[refID];
    }

    if(!this.routes[refID]) {
        this.routes[refID] = [];
    }

    if(info.type=="jsgi") {
        
        if(info.route.substr(0,1)=="/") {
            throw new Error("Only relative routhing paths are supported.");
        }
        
        var route = {
            "rawRoute": "^\\/" + refID + "\\/" + info.route,
            "route": new RegExp("^\\/" + refID + "\\/" + info.route),
            "module":info.module,
            "require": info.require || false,
            "package": id
        };
        
        // if route already exists, replace it
        var found = false;
        for( var i=0, s=this.routes[refID].length ; i<s ; i++ ) {
            if(this.routes[refID][i].rawRoute==route.rawRoute) {
                found = i;
                break;
            }
        }
        if(found!==false) {
//print("[narwhalrunner][registerRoute] replace route: " + route.rawRoute + " -> " + id + ":" + route.module);
            this.routes[refID][found] = route;
        } else {
//print("[narwhalrunner][registerRoute] add route: " + route.rawRoute + " -> " + id + ":" + route.module);            
            this.routes[refID].push(route);
        }
    } else {
        throw new Error("Route type '" + info.type + "' not supported.");
    }
}

App.prototype.addProgramTransportListener = function(pkgId, programId, listener) {
    var pkg = this.getPackage(pkgId);
    if(!pkg) {
        throw new Error("Could not load package for ID: " + pkgId);
    }
    var refID = pkg.getReferenceId();
    if(!this.refIdMap[refID]) {
        throw new Error("Could not find refID [" + refID + "] for package [" + pkgId + "] in refIdMap!");
    }
    if(!this.programTransportListeners[pkgId]) {
        this.programTransportListeners[pkgId] = {};
    }
    if(!this.programTransportListeners[pkgId][programId]) {
        this.programTransportListeners[pkgId][programId] = [];
    }
    if(this.programTransportListeners[pkgId][programId].indexOf(listener)>=0) {
        throw new Error("Listener already exists for package [" + pkgId + "] and program [" + programId + "]");
    }
    this.programTransportListeners[pkgId][programId].push(listener);
}

App.prototype.removeProgramTransportListener = function(pkgId, programId, listener) {
    if(!this.programTransportListeners[pkgId]) return;
    if(!this.programTransportListeners[pkgId][programId]) return;
    var index = this.programTransportListeners[pkgId][programId].indexOf(listener);
    if(index==-1) return;
    this.programTransportListeners[pkgId][programId].splice(index, 1);
}


App.prototype.exists = function() {
    return this.path.exists();
}

App.prototype.getCache = function() {
    return this.cache;
}

App.prototype.getAppPackage = function() {
    return this.pkg;
}

App.prototype.getPackage = function(id) {
    return PACKAGE.Package(PACKAGES.usingCatalog[id].directory, id).setAppInfo(this.manifest.narwhalrunner);
}

App.prototype.getPackageForRefId = function(id) {
    if(!this.refIdMap[id]) {
        return false;
    }
    return this.getPackage(this.refIdMap[id]);
}

App.prototype.getInternalName = function() {
    return this.getInfo().InternalName;
}

App.prototype.getVersion = function() {
    if(!version) {
        version = JSON.decode(FILE.Path(this.getProgram().sea).join("package.json").read()).version;
    }
    return version;
}

App.prototype.getProfilePath = function() {
    var file = Cc["@mozilla.org/file/directory_service;1"].
                    getService(Ci.nsIProperties).
                        get("ProfD", Ci.nsIFile);
    return FILE.Path(file.path);    
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

App.prototype.getContentBaseUrl = function() {
    return this.pkgVars["Package.ContentBaseURL"];
}

App.prototype.getPreference = function(name) {
  var prefName = "extensions." + this.getInternalName() + "." + name;
  var type = PREFS.getPrefType(prefName);
  if (type == Ci.nsIPrefBranch2.PREF_STRING) {
      return PREFS.getCharPref(prefName);
  } else if (type == Ci.nsIPrefBranch2.PREF_INT) {
      return PREFS.getIntPref(prefName);
  } else if (type == Ci.nsIPrefBranch2.PREF_BOOL) {
      return PREFS.getBoolPref(prefName);
  } else if (type == Ci.nsIPrefBranch2.PREF_INVALID) {
//      system.log.error("Unknown preference: " + prefName);
    return null;
  }
}

App.prototype.setPreference = function(name, value) {
  var prefName = "extensions." + this.getInternalName() + "." + name;
  var type = PREFS.getPrefType(prefName);
  if (type == Ci.nsIPrefBranch2.PREF_STRING) {
      PREFS.setCharPref(prefName, value);
  } else if (type == Ci.nsIPrefBranch2.PREF_INT) {
      PREFS.setIntPref(prefName, value);
  } else if (type == Ci.nsIPrefBranch2.PREF_BOOL) {
      PREFS.setBoolPref(prefName, value);
  } else if (type == Ci.nsIPrefBranch2.PREF_INVALID) {
//      system.log.error("Unknown preference: " + prefName);
  }
}

App.prototype.getResourceUrlForPackage = function(pkg) {
    var path = pkg.getPath().valueOf();
    var id = STRUCT.bin2hex(MD5.hash(path));
    if(!UTIL.has(this.refIdMap, id)) {
        this.refIdMap[id] = PACKAGE.Package(pkg).setAppInfo(this.manifest.narwhalrunner);
    }    
    return "narwhalrunner://" + this.manifest.narwhalrunner.InternalName + "/" + id + "/resources/";
}

App.prototype.createSandbox = function(options) {
    options["type"] = options["type"] || "extension";
    options["internalID"] = options["internalID"] || this.getProgram().internalID;
    options["modules"] = options["modules"] || UTIL.copy(this.getProgram().modules);
    var sandbox = {};
    Components.utils.import("resource://narwhal-xulrunner/sandbox.js", sandbox);
    return sandbox.create(options);
}

App.prototype.registerProtocolHandler = function() {
    var self = this;
    
    var appInfo = self.manifest.narwhalrunner;
    
    appInfo["CommonPackage.ReferenceId"] = PACKAGE.Package(PACKAGES.usingCatalog[module["package"]].directory,module["package"]).setAppInfo(appInfo).getReferenceId();
    
    var protocolHandler = {
        internalAppName : self.getInternalName(),
        app: function(chromeEnv) {

            try {

                PROFILER.startTimer("protocolHandler", "overall");

                var pathInfo = chromeEnv["PATH_INFO"];
                
                // HACK: Path correction for SmartClient (seems to have an issue with the narwhalrunner:// protocol)
// @see http://forums.smartclient.com/showthread.php?t=9734
//                var m = pathInfo.match(/^\/.*?narwhalrunner:\/\/[^\/]*\/(.*)$/);
//                if(m) {
//                    pathInfo = "/" + m[1];
//                }


//                print("Processing: " + pathInfo);
                
                var parts = pathInfo.substr(1).split("/"),
                    packageRefId = parts.shift(),
                    baseName = parts[parts.length-1],
                    extension = baseName.split(".").pop();

                var packageName;
                if(packageRefId==self.getAppPackage().getName()) {
                    packageName = self.getAppPackage().getName();
                } else {
                    packageName = self.refIdMap[packageRefId];
                }
                
                // new logic
                if(self.routes[packageRefId]) {
                    var responderModule = false;
                    var responderApp = false;
                    self.routes[packageRefId].forEach(function(info) {
                        if(responderApp) return;
                        if(info.route.test(pathInfo)) {

                            if(RELOAD_ROUTE_RESPONDERS) {
/*                            
ONE POSSIBLE SOLUTION:
                                // create a sandbox to allow for reloading                    
                                var modules = {
                                    "system": SYSTEM,
                                    "jar-loader": require("jar-loader")
                                };
                                var loader = LOADER.Loader({
                                    "paths": [
                                        "chrome://narwhal-xulrunner/content/lib",
                                        "chrome://narwhal-xulrunner/content/narwhal/engines/default/lib",
                                        "chrome://narwhal-xulrunner/content/narwhal/lib"
                                    ]
                                });
                                try {
                                    // some wildfire modules need to be singletons and survive reloads
                                    modules["wildfire"] = require("wildfire");
                                    modules["wildfire/binding/jack"] = require("wildfire/binding/jack");
                                } catch(e) {}
                                var sandbox = SANDBOX.Sandbox({
                                    "system": SYSTEM,
                                    "loader": loader,
                                    "debug": require.loader.debug,
                                    "modules": modules
                                });
                                responderApp = sandbox(info.module, null, info["package"]).app;
ANOTHER POSSIBLE SOLUTION (preferred):
                                var sandbox = {};
                                Components.utils.import('resource://narwhal-xulrunner/sandbox.js', sandbox);
                            
                                // TODO: Add named sub-sandbox support to support dynamic reloading of a given set of modules
                                var requestProgram = sandbox.get({
                                    "type": "extension",
                                    "id": self.program.id
                                });
                            
                                responderApp = requestProgram.require(info.module, info["package"]).app;
*/                            
                            } else {
                                
//print("processing package: " + info["package"]);                                

//print("[narwhalrunner][registerProtocolHandler][runApp] responderApp module: " + info.module);
//print("[narwhalrunner][registerProtocolHandler][runApp] responderApp package: " + info["package"]);
                                
                                if(!info.instances) {
                                    if(info.require) {
                                        responderModule = info.require(info.module, info["package"]);
                                        responderApp = responderModule.app({
                                            "packageReferenceId": packageRefId
                                        });
                                    } else {
                                        responderModule = require(info.module, info["package"]);
                                        responderApp = responderModule.app({
                                            "packageReferenceId": packageRefId
                                        });
                                    }
                                    info.instances = {
                                        "module": responderModule,
                                        "app": responderApp
                                    };
                                } else {
                                    responderModule = info.instances.module;
                                    responderApp = info.instances.app;
                                }
                            }
                        }
                    });
                    if(responderApp) {

                        if(responderModule.isCachable && !self.getPreference("NR_forceReloadDynamicProtocolResources") && responderModule.isCachable()) {
                            
                            if(!responderModule.getHeaders) {
                                throw new Error("Responder module for path '"+pathInfo+"' does not implement exports.getHeaders(env)");
                            }

                            // check if we have a cached file, if we do serve it instead
                            var cacheStr = self.getCache().getString([pathInfo, self.getVersion()]);
                            if(cacheStr!==false) {
            
                                PROFILER.stopTimer("protocolHandler", "overall");
//print("FROM CACHE 1");

                                return {
                                    status: 200,
                                    headers: responderModule.getHeaders(chromeEnv),
                                    body: [cacheStr]
                                }
                            }
                            
                        }

                        PROFILER.startTimer("protocolHandler", "jsgi");

                        chromeEnv.narwhalrunner = {
                            "packageReferenceId": packageRefId,
                            "packageId": packageName
                        }

//print("[narwhalrunner][registerProtocolHandler][runApp] packageId: " + packageName);

                        var result = responderApp(chromeEnv);

                        if(!result) {
                            return {
                                status: 500,
                                headers: {"Content-Type":"text/plain"},
                                body: ["Internal Server Error", "</br>", "Error calling responder App"]
                            }                
                        }

                        if(UTIL.isArrayLike(result.body)) {
                            if(!result.alreadyBase65Encoded) {
                                // base64 encode the body
                                for( var i=0 ; i<result.body.length ; i++ ) {
                                    result.body[i] = BASE64.encode(result.body[i]);
                                }
                            }
                        } else
                        if(UTIL.has(result.body, "forEach")) {
                            var buffer = [];
                            result.body.forEach(function(str) {
                                buffer.push(str);
                            });
                            if(result.alreadyBase65Encoded) {
                                result.body = [buffer.join("")];
                            } else {
                                result.body = [BASE64.encode(buffer.join(""))];
                            }
                        }
                        delete result.alreadyBase65Encoded;

                        if(responderModule.isCachable && responderModule.isCachable()) {
                            // write body to cache for faster access in future
                            self.getCache().setString([pathInfo, self.getVersion()], result.body.join(""));
                        }

                        PROFILER.stopTimer("protocolHandler", "jsgi");
                        PROFILER.stopTimer("protocolHandler", "overall");

                        return result;
                    }
                }
                
                
                // old logic

                PROFILER.startTimer("protocolHandler", "legacy-init");

                var pkg;
                if(!packageName || typeof packageName == "string") {
                    if(!UTIL.has(PACKAGES.usingCatalog, packageName)) {

                        system.log.warn(new AppError("Package not found packageName[" + packageName + "] packageRefId[" + packageRefId + "]"));

                        PROFILER.stopTimer("protocolHandler", "legacy-init");
                        PROFILER.stopTimer("protocolHandler", "overall");

                        return {
                            status: 500,
                            headers: {"Content-Type":"text/plain"},
                            body: ["Internal Server Error", "</br>", "Package not found: " + packageName]
                        }                
                    }
                    pkg = PACKAGE.Package(PACKAGES.usingCatalog[packageName].directory, packageName);
                } else {
                    pkg = packageName;
                }
                var filePath = pkg.getPath();
    
                if(parts[0]=="resources") {
                    // path is fine the way it is
                    
                    // if /resources/ is not found look for /chrome/resources/
                    
                    if(!filePath.join(parts.join("/")).exists() &&
                       filePath.join("chrome", parts.join("/")).exists()) {
                        filePath = filePath.join("chrome");
                    }
                    
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
                    PROFILER.stopTimer("protocolHandler", "legacy-init");
                    PROFILER.stopTimer("protocolHandler", "overall");
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
                        if(!UTIL.has(info, "contentType")) info.contentType = "application/x-javascript";
    
                    case "json":
                        if(!UTIL.has(info, "contentType")) info.contentType = "application/json";
    
                        if(!UTIL.has(info, "binary")) info.binary = false;
    
                    // Binary
    
                    case "png":
                        if(!UTIL.has(info, "contentType")) info.contentType = "image/png";
                    
                    default:
                        if(!UTIL.has(info, "binary")) info.binary = true;
                        if(!UTIL.has(info, "contentType")) info.contentType = "application/binary";
                }

                PROFILER.stopTimer("protocolHandler", "legacy-init");

                fileMtime = filePath.mtime();

//print("fileMtime: "+fileMtime);
//print("getVersion: "+self.getVersion());

                // check if we have a cached file, if we do serve it instead
                if(!info.binary && !self.getPreference("NR_forceReloadDynamicProtocolResources")) {
                    var cacheStr = self.getCache().getString([filePath.valueOf(), fileMtime, pathInfo, self.getVersion()]);
                    if(cacheStr!==false) {

                        PROFILER.stopTimer("protocolHandler", "overall");
//print("FROM CACHE 2");
                        return {
                            status: 200,
                            headers: {"Content-Type": info.contentType},
                            body: [cacheStr]
                        }
                    }
                }

                app = function(env) {
    
//                    print("Serving: " + filePath);

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

                        var m;
                        while(m = body.match(/<\?narwhalrunner\s*\n([\s\S]*?)\n\s*\?>/)) {
                            if(m) {
                                var helper = require("__helper__", pkg.getUid());
                                body = body.replace(m[0], helper.evaluate(m[1]));
                            }
                        }
                    }

                    return {
                        status: 200,
                        headers: {"Content-Type": info.contentType},
                        body: [body]
                    }
                }

                PROFILER.startTimer("protocolHandler", "legacy-processing");

                var result = app(chromeEnv);

                PROFILER.stopTimer("protocolHandler", "legacy-processing");

                PROFILER.startTimer("protocolHandler", "legacy-encoding");

                // base64 encode the body
                // NOTE: The following does not work with binary data (not sure why): result.body = [BASE64.encode(result.body.join(""))];
                for( var i=0 ; i<result.body.length ; i++ ) {
                    result.body[i] = BASE64.encode(result.body[i]);
                }

                // write body to cache for faster access in future
                if(!info.binary) {
                    self.getCache().setString([filePath.valueOf(), fileMtime, pathInfo, self.getVersion()], result.body.join(""));
                }

                PROFILER.stopTimer("protocolHandler", "legacy-encoding");

                PROFILER.stopTimer("protocolHandler", "overall");

                return result;
            } catch(e) {
                system.log.error(e);
            }
        }
    };

    Cc["@mozilla.org/network/protocol;1?name=narwhalrunner"].
        getService().
            wrappedJSObject.registerExtension(protocolHandler);
    
    Cc["@mozilla.org/network/protocol;1?name=narwhalrunner-accessible"].
        getService().
            wrappedJSObject.registerExtension(protocolHandler);
}

App.prototype.start = function(type, loaderWindow, args, program) {
    var self = this;

    if(self.status) {
        // app can only initialize once
        return;
    }

    self.status = "starting";
    self.type = type;
    self.loaderWindow = loaderWindow;
    self.program = program;

    // Call the main.js module of the app once the loaderWindow is completely loaded
    self.onLoaderWindowLoad = function() {

        // TODO: revision ("master") needs to be dynamically determined
//print("\n\n"+"LAUNCH: "+self.pkg.getTopLevelId() + "/master"+"\n\n");        

        self.programModule = require("main", self.pkg.getTopLevelId() + "/master");

        try {
            self.programModule.main(args);
        } catch(e) {
            system.log.error(e);
        }

        self.onNewChrome(self.getChrome());
    }

    if(CHROME.isGecko2()) {
        self.onLoaderWindowLoad();
    } else {
        loaderWindow.addEventListener("load", self.onLoaderWindowLoad, false);
    }
}

App.prototype.started = function() {

    this.status = "started";

    if(this.type=="application" && this.loaderWindow) {
        this.loaderWindow.close();
    }

    var self = this;
    this.program.onAllReady = function() {
        APPS.triggerAllReady(self);
    }
    // notify the narwhal-xulrunner sandbox program that we are ready
    this.program.ready();
}

App.prototype.getProgram = function() {
    return this.program;
}

App.prototype.onNewChrome = function(chrome) {
    try {
        app.publish("newChrome", chrome);

        if(this.programModule && this.programModule.newChrome) {
            this.programModule.newChrome(chrome);
        }
    } catch(e) {
        system.log.error(e);
    }
}

App.prototype.onDestroyChrome = function(chrome) {
    try {
        app.publish("destroyChrome", chrome);

        if(this.programModule && this.programModule.destroyChrome) {
            this.programModule.destroyChrome(chrome);
        }
    } catch(e) {
        system.log.error(e);
    }
}


// Chrome management

var activeChrome = null;
var chromeLoading = false;
var chromes = [];           // all known chromes

App.prototype.getChrome = function() {
    return exports.getChrome();
}

App.prototype.forEachChrome = function(callback) {
    for( var i=0 ; i<chromes.length ; i++ ) {
        callback(chromes[i]);
    }    
}


exports.getChrome = function() {
    
    // NOTE: activeChrome always contains the latest opened window, not the focused one
    //       this is due to the focus event not firing in ./chrome.js
    //       the workaround is to not rely on activeChrome for now and get the top window
    
    var chrome = CHROME.getTopChrome();
    // HACK: While a window is loading it is not on top yet and getChrome() may be called
    //       This will return null above or the chrome for the previous window
    // TODO: Ensure activeChrome is returned until the window is fully loaded (after which we can rely on getTopChrome())
    if(chrome) {
        return chrome;
    }
    return activeChrome;
}

CHROME.Chrome.prototype.subscribeTo("loading", function(chrome) {
    chromeLoading = true;
});

CHROME.Chrome.prototype.subscribeTo("new", function(chrome) {
    // when a new chrome is initialized we assume it is a browser window and that it
    // has or will get the focus
    chromeLoading = false;
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

CHROME.Chrome.prototype.subscribeTo("unload", function(chrome) {
    for( var i=chromes.length-1 ; i>=0 ; i-- ) {
        if(chromes[i]===chrome) {
            chromes.splice(i, 1);
        }
    }
    var app = exports.getApp();
    if(app) {
        app.onDestroyChrome(chrome);
    }
});

CHROME.Chrome.prototype.subscribeTo("focus", function(chrome) {
    activeChrome = chrome;
});



var AppError = exports.AppError = function(message) {
    this.name = "AppError";
    this.message = message;

    // this lets us get a stack trace in Rhino
    if (typeof Packages !== "undefined")
        this.rhinoException = Packages.org.mozilla.javascript.JavaScriptException(this, null, 0);
}
AppError.prototype = new Error();






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
