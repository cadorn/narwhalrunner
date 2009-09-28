
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require('file');
var UTIL = require("util");
var STREAM = require('term').stream;
var SEA = require("narwhal/tusk/sea");

var HARNESS = require("./harness");
var SKELETON = require("./sceleton");



exports.main = function(args) { with(HARNESS.initialize(args)) {
    
    // copy everything required for proper extension registration
    
    SKELETON.main(args);
    
        

    // link narwhal directory
    
    fromPath = FILE.Path(system.prefix);
    toPath = targetBuildPath.join("narwhalrunner", "narwhal");
    if(!toPath.exists()) {
        toPath.dirname().mkdirs();    
        fromPath.symlink(toPath);
    }
    print("Linked '" + toPath + "' to '" + fromPath + "'");    


}}



if (module.id == require.main)
    exports.main(system.args);
