
var JSON = require("json");

var JsonStore = exports.JsonStore = function(file) {
    this.file = file;
}

JsonStore.prototype.exists = function() {
    return this.file.exists();
};

JsonStore.prototype.init = function() {
    if(this.exists()) {
        throw new Error("Store exists. Cannot initialize store at: " + this.file);
    }
    this.data = {};
    this.save(true);
};

JsonStore.prototype.set = function(data) {
    this.data = data;
    this.dirty = true;
    this.save();
};

JsonStore.prototype.get = function() {
    this.load();
    return this.data;
};

JsonStore.prototype.hasFileChanged = function() {
    if(!this.exists()) return false;
    return !(""+this.fileMtime == ""+this.file.mtime());
}

JsonStore.prototype.load = function(force) {
    if(this.dirty && !force) {
        throw new Error("Cannot load store. Unsaved data present.");
    }
    if(!this.exists()) {
        throw new Error("Cannot load store. Store does not exist on disk at: " + this.file);
    }
    if(this.hasFileChanged()) {
        this.data = JSON.decode(this.file.read());
        this.fileMtime = this.file.mtime();
    }
    this.dirty = false;
};

JsonStore.prototype.save = function(force) {
    if(!this.exists() && !force) {
        throw new Error("Cannot save store. Store does not exist on disk at: " + this.file);
    }
    if(this.hasFileChanged() && !force) {
        throw new Error("Cannot save store. Data changed on disk: "+this.file);
    }
    if(!this.dirty && !force) return;
    if(!this.file.dirname().exists()) this.file.dirname().mkdirs();
    this.file.write(JSON.encode(this.data, null, '    '));
    this.fileMtime = this.file.mtime();
    this.dirty = false;
};
