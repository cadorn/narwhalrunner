


function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };

const WINDOW_MEDIATOR = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

var APPLICATION = Cc["@mozilla.org/fuel/application;1"].getService(Ci.fuelIApplication);

var APP_INFO = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);  
var VERSION_COMPARE = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);


var FILE = require("file");
var UTIL = require("util");
var OBSERVABLE = require("observable", "observable");
var BINDING = require("./binding");
var PACKAGES = require("packages");
var PACKAGE = require("./package");
var TAB_WATCHER = require("./tab-watcher");

var chromeIndex = 0,
    chromes = [];



exports.getTopChrome = function() {

    var window = WINDOW_MEDIATOR.getMostRecentWindow("navigator:browser");

    for( var i=0, c=chromes.length ; i<c ; i++ ) {
        if(chromes[i].global.window===window) {
            return chromes[i];
        }
    }
    
    return false;
}

exports.isGecko2 = function() {
    if(VERSION_COMPARE.compare(APP_INFO.platformVersion, "2")>=0 || APP_INFO.platformVersion.substr(0,1)=="2") {
        return true;
    }
    return false;
}

if(exports.isGecko2()) {
    Components.utils.import("resource://gre/modules/AddonManager.jsm");
}


var Chrome = exports.Chrome = function(global) {
    if (!(this instanceof exports.Chrome)) {
        return new exports.Chrome(global);
    }
    var self = this;

    chromes.push(self);

    self.chromeIndex = chromeIndex++;
    self.global = global;
    
    self.instances = {};
    self.bindings = {};
    self.containers = {};
    self.components = {};

/*        
    NOTE: The focus event is not firing for some reason
    TODO: Get focus event and re-fire

    self.getWindow().addEventListener("focus", function() {
        self.publish("focus", self);
    }, false);
*/

    OBSERVABLE.mixin(self);

    self.tabWatcher = TAB_WATCHER.TabWatcher(self);

    self.getWindow().addEventListener("load", function() {
        
        self.tabWatcher.attach();

        Chrome.prototype.publish("load", self);
    }, false);

    self.getWindow().addEventListener("unload", function() {
        try {
            for( var i=0, c=chromes.length ; i<c ; i++ ) {
                if(chromes[i]===self) {
                    chromes.splice(i, 1);
                }
            }

            self.tabWatcher.unattach();
    
            UTIL.forEach(self.components, function(item) {
                if(typeof item[1].destroy != "undefined") {
                    try {
                        item[1].destroy();
                    } catch(e) {
                        system.log.error(e);
                    }
                }
            });

            Chrome.prototype.publish("unload", self);
            self.publish("unload", self);
        } catch(e) {
            system.log.error(e);
        }
    }, false);

    Chrome.prototype.publish("new", self);
}
OBSERVABLE.mixin(Chrome.prototype);

Chrome.prototype.addComponent = function(id, component) {
    this.components[id] = component;
}

Chrome.prototype.getComponent = function(id) {
    return this.components[id];
}

Chrome.prototype.registerBinding = function(pkgId, object, name, id) {
    if(!UTIL.has(this.bindings, pkgId)) {
        this.bindings[pkgId] = {};
    }
    if(!this.bindings[pkgId][name]) {
        this.bindings[pkgId][name] = {};
    }
    return this.bindings[pkgId][name][id || ""] = BINDING.Binding(pkgId, object, name, id);
}

Chrome.prototype.getBinding = function(pkgId, name, id) {
    pkgId = normalizePackageID(pkgId);
    if(!UTIL.has(this.bindings, pkgId)) {
        return false;
    }
    if(!UTIL.has(this.bindings[pkgId], name)) {
        return false;
    }
    id = id || "";
    if(!UTIL.has(this.bindings[pkgId][name], id)) {
        return false;
    }
    return this.bindings[pkgId][name][id];
}

function normalizePackageID(id) {

    if(UTIL.has(PACKAGES.catalog, id)) {
        var pkg = PACKAGE.Package(PACKAGES.catalog[id].directory);
        // HACK: Suffix "master" for now
        // TODO: Read proper version from catalog and append that
        return pkg.getTopLevelId() + "/master";
    }

    return id;
}

Chrome.prototype.registerContainer = function(pkgId, object, module, name) {
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

Chrome.prototype.getContainer = function(pkgId, name) {
    if(!UTIL.has(this.containers, pkgId)) {
        return false;
    }
    if(!UTIL.has(this.containers[pkgId], name)) {
        return false;
    }
    return this.containers[pkgId][name];
}

Chrome.prototype.registerInstance = function(name, obj) {
    if(this.instances[name]) {
        throw new Error("Instance with name '"+name+"' already registered");
    }
    this.instances[name] = obj;
}

Chrome.prototype.getInstance = function(name) {
    if(!this.instances[name]) {
        throw new Error("Instance with name '"+name+"' not found");
    }
    return this.instances[name];
}

Chrome.prototype.getGlobal = function() {
    return this.global;
}

Chrome.prototype.getWindow = function() {
    return this.global.window;
}

Chrome.prototype.getBrowser = function() {
    return this.global.getBrowser();
}

Chrome.prototype.getTabWatcher = function() {
    return this.tabWatcher;
}


/*
 * priority:
 *   PRIORITY_INFO_LOW
 *   PRIORITY_INFO_MEDIUM
 *   PRIORITY_INFO_HIGH
 *   PRIORITY_WARNING_LOW
 *   PRIORITY_WARNING_MEDIUM
 *   PRIORITY_WARNING_HIGH
 *   PRIORITY_CRITICAL_LOW
 *   PRIORITY_CRITICAL_MEDIUM
 *   PRIORITY_CRITICAL_HIGH
 *   PRIORITY_CRITICAL_BLOCK
 * 
 * buttons:
 *   [{label: "", callback: function(notification, button) {}}]
 *   
 * @see https://developer.mozilla.org/en/XUL/Method/appendNotification
 */
Chrome.prototype.appendNotification = function(text, name, icon, priority, buttons) {
    var notificationBox = this.getBrowser().getNotificationBox();
    return notificationBox.appendNotification(text, name, icon, notificationBox[priority], buttons || []);
}

Chrome.prototype.getNotification = function(name) {
    var notificationBox = this.getBrowser().getNotificationBox();
    return notificationBox.getNotificationWithValue(name);
}

Chrome.prototype.closeNotification = function(name) {
    var notificationBox = this.getBrowser().getNotificationBox();
    var notification = notificationBox.getNotificationWithValue(name);
    if(notification) {
        notificationBox.removeNotification(notification);
    }
}


Chrome.prototype.getConsoleService = function() {
    return Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
}

Chrome.prototype.reloadPage = function() {
    this.getBrowser().selectedBrowser.reload();
}

Chrome.prototype.openNewTab = function(url, postText) {
    if (!url) return;
    var postData = null;
    if (postText) {
        if(typeof postText == "object") {
            var str = [];
            UTIL.forEach(postText, function(item) {
                str.push(encodeURIComponent(item[0]) + "=" + encodeURIComponent(item[1]));
            });
            postText = str.join("&");
        }
        var stringStream = getInputStreamFromString(postText);
        postData = Cc["@mozilla.org/network/mime-input-stream;1"].createInstance(Ci.nsIMIMEInputStream);
        postData.addHeader("Content-Type", "application/x-www-form-urlencoded");
        postData.addContentLength = true;
        postData.setData(stringStream);
    }
    var gBrowser = this.getBrowser();
    gBrowser.selectedTab = gBrowser.addTab(url, null, null, postData);

    return gBrowser.selectedTab;
};


Chrome.prototype.openNewWindow = function(url) {
    if (!url) return;
    return this.getWindow().open(url);
};


Chrome.prototype.getProfilePath = function() {
    var file = Cc["@mozilla.org/file/directory_service;1"].
                    getService(Ci.nsIProperties).
                        get("ProfD", Ci.nsIFile);
    return FILE.Path(file.path);    
}

Chrome.prototype.isExtensionEnabled = function(id, callback) {
    if(exports.isGecko2()) {
        AddonManager.getAddonByID(id, function(addon) {
            if(addon.isActive) {
                callback();
            }
        });
    } else {
        if(APPLICATION.extensions.has(id)) {
            if(APPLICATION.extensions.get(id).enabled) {
                callback();
            }
        }
    }

/*    
    var application = Cc["@mozilla.org/fuel/application;1"].getService(Ci.fuelIApplication);
    var extensions = {};
    for (var i=0; i<application.extensions.all.length; i++)
    {
        var ext = application.extensions.all[i];
        extensions[ext.id] = {
            name: ext.name,
            id: ext.id,
            enabled: ext.enabled
        };
    }
    return extensions;
*/
}


Chrome.prototype.expireCacheForDomains = function(domains) {
    
    try {

        const CACHE_SERVICE = Cc["@mozilla.org/network/cache-service;1"].getService(Ci.nsICacheService);
        var httpCacheSession = CACHE_SERVICE.createSession("HTTP", Ci.nsICache.STORE_ON_DISK, true);
        
        domains.forEach(function(domain) {
            var matchString = "http://"+domain+"/",
                matchLength = matchString.length;
            var keys = [];
 
            try {
                
                CACHE_SERVICE.visitEntries({
                    QueryInterface : function(iid) {
                        if (iid.equals(Ci.nsICacheVisitor)) return this;
                        throw Cr.NS_NOINTERFACE;
                    },
                    visitDevice : function(deviceID, deviceInfo) {
                       return true;
                    },
                    visitEntry : function(deviceID, entryInfo) {
                        if(deviceID=="disk" && entryInfo.clientID=="HTTP") {
                            if(entryInfo.key.substring(0, matchLength)==matchString) {
                                keys.push(entryInfo.key);
                            }
                        }
                       return true;
                    }
                });
                keys.forEach(function(key) {
                    var entry = httpCacheSession.openCacheEntry(key, Ci.nsICache.ACCESS_WRITE, false);
                    entry.doom();
                    entry.close();
                });

            } catch(e) {
                system.log.warn(e);
            }
        });
    } catch(e) {
        system.log.warn(e);
    }
}


function getInputStreamFromString(dataString) {
    var stringStream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
    if ("data" in stringStream) {// Gecko 1.9 or newer
        stringStream.data = dataString;
    } else {// 1.8 or older
        stringStream.setData(dataString, dataString.length);
    }
    return stringStream;
};