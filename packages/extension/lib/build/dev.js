
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
    

    // link chrome directories
    
    fromPath = locatePath("chrome/content", "common");
    toPath = targetBuildPath.join("narwhalrunner", "chrome", "content", "common");
    if(!toPath.exists()) {
        toPath.dirname().mkdirs();    
        fromPath.symlink(toPath);
    }
    
        

}}



if (module.id == require.main)
    exports.main(system.args);
