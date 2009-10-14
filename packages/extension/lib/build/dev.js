
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require('file');
var UTIL = require("util");
var STREAM = require('term').stream;
var TUSK = require("narwhal/tusk/tusk");
var HARNESS = require("build/harness", "common");
var DEV = require("build/dev", "common");
var SKELETON = require("./skeleton");


exports.main = function(args) {
    args["platform"] = module["package"];
    with(HARNESS.initialize(args, {type: "extension"})) {
    
    SKELETON.main(args);

    DEV.main(args, {
        type: "extension"
    });

}}



if (module.id == require.main)
    exports.main(system.args);
