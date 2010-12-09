
var PACKAGE1 = require("packageA/package1");
var PACKAGE3 = require("packageB/package3");

exports.announceNext = function(console) {

    console.log("Chrome Package 2");

    PACKAGE3.announceNext(console);

}

exports.announcePrevious = function(console) {

    console.log("Chrome Package 2");

    PACKAGE1.announcePrevious(console);

}
