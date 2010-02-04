
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require("file");
var JSON = require("json");
var UTIL = require("util");



var Config = exports.Config = function (config) {
    if (!(this instanceof exports.Config))
        return new exports.Config(config);
    this.config = config;

    if(!config.exists()) {
        config.init();
    }
}

Config.prototype.getBinaries = function() {
    if(!this.config.has(["binaries"])) {
        return null;
    }
    return this.config.get(["binaries"]);
}

Config.prototype.getBinaryForAppVersion = function(app, version) {
    var binaries = this.getBinaries();
    if(!binaries) {
        return null;
    }
    var binary = null;
    binaries.forEach(function(info) {
        if(binary) return;
        if(info.app==app && info.version==version) {
            binary = info.path;
        }
    });
    return binary;
}

Config.prototype.getLatestVersionForApp = function(app) {
    var binaries = this.getBinaries();
    if(!binaries) {
        return null;
    }
    var version = [0,0],
        tmp;
    binaries.forEach(function(info) {
        if(info.app==app) {
           tmp = info.version.split(".");
           for( var i = 0 ; i<tmp.length ; i++ ) {
               tmp[i] = UTIL.padBegin(tmp[i],3);
           }
           tmp = "1" + tmp.join("");
           if(tmp>version[0]) {
               version = [tmp, info.version];
           }
        }
    });
    return version[1];
}

Config.prototype.hasBinaryForPath = function(path) {
    var binaries = this.getBinaries();
    if(!binaries) {
        return null;
    }
    var found = false;    
    binaries.forEach(function(info) {
        if(info.path==path) {
            found = true;
        }
    });
    return found;
}

Config.prototype.addBinary = function(app, version, path) {
    
    if(this.hasBinaryForPath(path)) {
        return false;
    }

    var binaries = this.getBinaries();
    if(!binaries) {
        binaries = [];
    }
    
    binaries.push({
        "app": app,
        "version": version,
        "path": path
    });
    
    this.config.set(["binaries"], binaries);
    
    return true;
}
