
var PACKAGE2 = require("package2/package2");

exports.announceNext = function(console) {

    console.log("Chrome Package 3");

    PACKAGE2.announcePrevious(console);

}
