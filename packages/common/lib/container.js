
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var UTIL = require("util");
var APP = require("./app");


exports.Container = function (pkgId, object, name) {

    // PRIVATE

    var onLoad = function() {
        Container.onLoad();
    }
    var onUnload = function() {
        Container.onUnload();
    }
    watch();

    var Container = {};

    
    // PUBLIC

    Container.getObject = function() {
        return object;
    }
    
    Container.reattach = function() {
        watch();
    }
    
    Container.destroy = function() {
        unwatch();
    }
    
    Container.getBinding = function(name) {
        return APP.getApp().getBinding(pkgId, name);
    }

    Container.onLoad = function() {
    }

    Container.onUnload = function() {
    }
    

    return Container;
    
    // PRIVATE
    
    function getWindow() {
        return object.window;
    }
    
    function watch() {
        var window = getWindow();
        if(!window) {
            return;
        }
        window.addEventListener("load", onLoad, false);
        window.addEventListener("unload", onUnload, false);
    }

    function unwatch() {
        var window = getWindow();
        if(!window) {
            return;
        }
        try {
            window.removeEventListener("load", onLoad, false);
            window.removeEventListener("unload", onUnload, false);
        } catch(e) {}
    }
}

