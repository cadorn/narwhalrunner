
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require('file');
var UTIL = require("util");
var STREAM = require('term').stream;
var SEA = require("narwhal/tusk/sea");
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


    // link narwhal-xulrunner engine
/*    
    NOTE: For now we assume it is in narwhal/engines/xulrunner
    
    var xulrunnerEnginePath,
        scanPackages = [
            "narwhal/narwhal-xulrunner/link",   // This will be deprecated soon
            "narwhal/narwhal-xulrunner/latest",
            "narwhal-xulrunner"
        ];
    
    scanPackages.forEach(function(name) {
        if(xulrunnerEnginePath) {
            return xulrunnerEnginePath;
        }
        if(UTIL.has(PACKAGES.catalog, name)) {
            xulrunnerEnginePath = PACKAGES.catalog[name].directory;
        }    
    })
    if(!xulrunnerEnginePath) {    
        throw "Cannot find narwhal-xulrunner engine!";
    }
    
    fromPath = xulrunnerEnginePath;
    toPath = targetBuildPath.join("packages", "narwhal-xulrunner");
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
