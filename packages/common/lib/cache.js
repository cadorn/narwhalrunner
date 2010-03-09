
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };

var JSON = require("json");
var UTIL = require("util");
var FILE = require("file");
var MD5 = require("md5");
var STRUCT = require("struct");


var Cache = exports.Cache = function (path) {
    if (!(this instanceof exports.Cache)) {
        return new exports.Cache(path);
    }
    this.path = path;
}

Cache.prototype.getPathForKey = function(key) {
    var path = this.path.join(STRUCT.bin2hex(MD5.hash(key.join("::"))));
    return path;
}

Cache.prototype.getObject = function(key) {
    var path = this.getPathForKey(key);
    if(!path.exists()) {
        return false;
    }
    return JSON.decode(path.read());
}

Cache.prototype.setObject = function(key, obj) {
    var path = this.getPathForKey(key);
    if(!path.dirname().exists()) {
        path.dirname().mkdirs();
    }
    if(path.exists()) {
        path.remove();
    }
    path.write(JSON.encode(obj, null, "    "));
}