
var APP = require("app", "nr-common").getApp();

exports.main = function() {
    
    print("hello world from module test.js");
    
    APP.getChrome().getConsoleService().logStringMessage("hello world from module test.js");

}
