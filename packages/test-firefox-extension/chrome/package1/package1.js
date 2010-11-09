
var PACKAGE2 = require("package2/package2");

exports.announceNext = function(console) {

    console.log("Chrome Package 1");

    PACKAGE2.announceNext(console);

}

exports.announcePrevious = function(console) {

    console.log("Chrome Package 1");

}
