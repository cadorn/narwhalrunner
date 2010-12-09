
exports.main = function() {

    var console = (top && top.console) || {"log": function(msg) { print(msg); }};
    
    var PACKAGE1 = require("./package1");
    
    PACKAGE1.announceNext(console);
    
}
