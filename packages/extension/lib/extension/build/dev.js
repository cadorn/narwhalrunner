
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require('file');
var UTIL = require("util");
var STREAM = require('term').stream;
var SEA = require("narwhal/tusk/sea");

var HARNESS = require("common/build/harness");
var DEV = require("common/build/dev");
var SKELETON = require("./sceleton");



exports.main = function(args) { with(HARNESS.initialize(args, {type: "extension"})) {
    
    SKELETON.main(args);

    DEV.main(args, {
        type: "extension"
    });

}}



if (module.id == require.main)
    exports.main(system.args);
