
var CHROME = require("chrome", "common");

exports.main = function() {
    
    print("hello world from module test.js");
    
    CHROME.getConsoleService().logStringMessage("hello world from module test.js");

}
