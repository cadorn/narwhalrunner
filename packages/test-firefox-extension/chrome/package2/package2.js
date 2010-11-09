
var PACKAGE1 = require("package1/package1");
var PACKAGE3 = require("package3/package3");

exports.announceNext = function(console) {

    console.log("Chrome Package 2");

    PACKAGE3.announceNext(console);

}

exports.announcePrevious = function(console) {

    console.log("Chrome Package 2");

    PACKAGE1.announcePrevious(console);

}
