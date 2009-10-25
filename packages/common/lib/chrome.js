

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

exports.getWindow = function() {
    return chrome.window;
}

exports.getBrowser = function() {
    return chrome.getBrowser();
}

exports.getConsoleService = function() {
    return Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
}

exports.reloadPage = function()
{
    exports.getBrowser().selectedBrowser.reload();
}
