
var FILE = require("file");
var UTIL = require("util");
var OBSERVABLE = require("observable", "observable");
var BINDING = require("./binding");


var chromeIndex = 0;

var Chrome = exports.Chrome = function(global) {
    if (!(this instanceof exports.Chrome)) {
        return new exports.Chrome(global);
    }
    var self = this;
    
    self.chromeIndex = chromeIndex++;
    self.global = global;
    
    self.instances = {};
    self.bindings = {};
    self.containers = {};
        
    self.getWindow().addEventListener("focus", function() {
        self.publish("focus", self);
    }, false);

    self.getWindow().addEventListener("load", function() {
        self.publish("load", self);
    }, false);

    self.publish("new", self);
}
OBSERVABLE.mixin(Chrome.prototype);

Chrome.prototype.registerBinding = function(pkgId, object, name) {
    if(!UTIL.has(this.bindings, pkgId)) {
        this.bindings[pkgId] = {};
    }
    return this.bindings[pkgId][name] = BINDING.Binding(pkgId, object, name);
}

Chrome.prototype.getBinding = function(pkgId, name) {
    if(!UTIL.has(this.bindings, pkgId)) {
        return false;
    }
    if(!UTIL.has(this.bindings[pkgId], name)) {
        return false;
    }
    return this.bindings[pkgId][name];
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
        var stringStream = getInputStreamFromString(postText);
        postData = Cc["@mozilla.org/network/mime-input-stream;1"].createInstance(Ci.nsIMIMEInputStream);
        postData.addHeader("Content-Type", "application/x-www-form-urlencoded");
        postData.addContentLength = true;
        postData.setData(stringStream);
    }
    var gBrowser = this.getBrowser();
    gBrowser.selectedTab = gBrowser.addTab(url, null, null, postData);
};

Chrome.prototype.getProfilePath = function() {
    var file = Cc["@mozilla.org/file/directory_service;1"].
                    getService(Ci.nsIProperties).
                        get("ProfD", Ci.nsIFile);
    return FILE.Path(file.path);    
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