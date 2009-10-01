

var chrome;

exports.set = function(obj) {
    chrome = obj;    
}

exports.get = function() {
    return chrome;
}

exports.registerProtocolHandler = function(handler) {

    var chrome_ext = Components.classes["@mozilla.org/network/protocol;1?name=narwhalrunner"].getService();

    chrome_ext.wrappedJSObject.registerExtension(handler);
    
}
