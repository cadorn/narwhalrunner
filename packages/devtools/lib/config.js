
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require("file");
var JSON = require("json");
var UTIL = require("util");



var Config = exports.Config = function (path) {
    if (!(this instanceof exports.Config))
        return new exports.Config(path);
    this.path = path.join("devtools.local.json");
    this.config = (this.exists())?JSON.decode(this.path.read({charset:"utf-8"})):{};
}

Config.prototype.exists = function() {
    return this.path.exists();
}

Config.prototype.save = function() {
    this.path.dirname().mkdirs();
    this.path.write(
        JSON.encode(this.config, null, 4),
        {charset: 'utf-8'}
    );
}

Config.prototype.getBinaries = function() {
    if(!UTIL.has(this.config, "binaries")) {
        return null;
    }
    return this.config.binaries;
}

Config.prototype.getBinaryForAppVersion = function(app, version) {
    if(!UTIL.has(this.config, "binaries")) {
        return null;
    }
    var binary = null;
    this.config.binaries.forEach(function(info) {
        if(binary) {
            return;
        }
        if(info[0]==app && info[2]==version) {
            binary = info[1];
        }
    });
    return binary;
}

Config.prototype.getLatestVersionForApp = function(app) {
    if(!UTIL.has(this.config, "binaries")) {
        return null;
    }
    var version = [0,0],
        tmp;
    this.config.binaries.forEach(function(info) {
        if(info[0]==app) {
           tmp = info[2].split(".");
           for( var i = 0 ; i<tmp.length ; i++ ) {
               tmp[i] = UTIL.padBegin(tmp[i],3);
           }
           tmp = "1" + tmp.join("");
           if(tmp>version[0]) {
               version = [tmp, info[2]];
           }
        }
    });
    return version[1];
}

Config.prototype.hasBinaryForPath = function(path) {
    if(!UTIL.has(this.config, "binaries")) {
        return false;
    }
    var found = false;    
    this.config.binaries.forEach(function(info) {
        if(info[1]==path) {
            found = true;
        }
    });
    return found;
}

Config.prototype.addBinary = function(app, version, path) {
    
    if(this.hasBinaryForPath(path)) {
        return false;
    }
    
    if(!UTIL.has(this.config, "binaries")) {
        this.config.binaries = [];
    }
    
    this.config.binaries.push([app, path, version]);
    
    this.save();
    
    return true;
}
