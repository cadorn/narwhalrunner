
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require('file');
var UTIL = require("util");
var STREAM = require('term').stream;
var TUSK = require("narwhal/tusk/tusk");
var PACKAGES = require("packages");

var HARNESS = require("./harness");



exports.main = function(args, options) { with(HARNESS.initialize(args, options)) {
    

    // link narwhal
    
    fromPath = FILE.Path(system.prefix);
    toPath = targetBuildChromePath.join("narwhalrunner", "narwhal");
    if(!toPath.exists()) {
        toPath.dirname().mkdirs();    
        fromPath.symlink(toPath);
    }
    print("Linked '" + toPath + "' to '" + fromPath + "'");    


    // link dependencies
/*    
    fromPath = sea.getDependenciesPath();
    toPath = targetBuildPath.join("packages", "dependencies");
    if(!toPath.exists()) {
        toPath.dirname().mkdirs();    
        fromPath.symlink(toPath);
    }
    print("Linked '" + toPath + "' to '" + fromPath + "'");
*/


    // link chrome/content
    
    fromPath = pkg.getPath().join("chrome", "content");
    if(fromPath.exists()) {
        toPath = targetBuildChromePath.join("content");
        if(!toPath.exists()) {
            toPath.dirname().mkdirs();    
            fromPath.symlink(toPath);
        }
        print("Linked '" + toPath + "' to '" + fromPath + "'");    
    }

    // link packages

    targetBuildPath.join("packages").mkdirs();
    
    var packages = [
        "common",
        options.type,
        packageName
    ];

    packages.forEach(function(name) {
        
        fromPath = locatePath("", name);
        toPath = targetBuildPath.join("packages", name);
        if(!toPath.exists()) {
            fromPath.symlink(toPath);
        }
        print("Linked '" + toPath + "' to '" + fromPath + "'");    
         
    });

}}



if (module.id == require.main)
    exports.main(system.args);
