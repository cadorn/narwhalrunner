
var CHROME = require("chrome", "nr-common");

exports.main = function() {
    
    print("hello world from module main-window.js");
    
    CHROME.getConsoleService().logStringMessage("hello world from module main-window.js");

}
