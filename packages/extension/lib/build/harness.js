
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require('file');
var UTIL = require("util");
var STREAM = require('term').stream;
var SEA = require("narwhal/tusk/sea");
var TEMPLATE = require("template");


var initialized = false;

var sea = SEA.getActive(),
    buildDirectory = sea.getBuildPath(),
    extensionPackage = sea.getPackage("extension"),  // TODO: We need a way to fetch packages even if installed as dependencies
    commonPackage = sea.getPackage("common"),  // TODO: We need a way to fetch packages even if installed as dependencies
    packageName,
    targetBuildPath,
    fromPath,
    toPath,
    pkg;
    

exports.initialize = function(args) {
    if(!initialized) {
        packageName = args["package"];
        targetBuildPath = buildDirectory.join(packageName);
        pkg = sea.getPackage(packageName);

        targetBuildPath.mkdirs();

        initialized = true;
    }
    
    return {
        sea: sea,
        buildDirectory: buildDirectory,
        extensionPackage: extensionPackage,
        commonPackage: commonPackage,
        packageName: packageName,
        targetBuildPath: targetBuildPath,
        fromPath: fromPath,
        toPath: toPath,
        pkg: pkg,
        copyWhile: exports.copyWhile,
        runTemplate: exports.runTemplate,
        replaceVariables: exports.replaceVariables,
        locatePath: exports.locatePath
    }
}


exports.copyWhile = function(fromPath, toPath, callbacks) {
    print("Copying '" + fromPath + "' to '" + toPath + "':");
    var data = fromPath.read();
    callbacks.forEach(function(callback) {
        var args = UTIL.copy(callback[1]);
        args.unshift(data);
        args.unshift(callbacks);
        data = callback[0].apply(null, args);
    });
    toPath.write(data);
    print("  Done.");
}

exports.runTemplate = function(callbacks, data, vars) {
    return new TEMPLATE.Template(data, {
        formatters: {
            "includeFile": function(path) {
                var data = path.read();
                callbacks.forEach(function(callback) {
                    
                    var args = UTIL.copy(callback[1]);
                    args.unshift(data);
                    args.unshift(callbacks);
                    data = callback[0].apply(null, args);
                });
                return data;
            }
        }
    }).render(vars);
}

exports.replaceVariables = function(callbacks, data, vars) {
    UTIL.keys(vars).forEach(function(name) {
        data = data.replace(new RegExp("%%" + name + "%%", "g"), vars[name]);
    });
    var m;
    while((m = /%%([^%]*)%%/g.exec(data)) != null) {
        STREAM.print("  %%\0red(" + m[1] + "\0)%%\0red( was not replaced!\0)");
    }
    return data;
}


/**
 * Locate a file path first in the target package and if not found
 * in any of the default packages
 */
exports.locatePath = function(path, name) {
    
    var tests = [
        pkg,
        extensionPackage,
        commonPackage
    ];
    
    var test,
        file = null;
    
    tests.forEach(function(pkg) {
        if(file) {
            return;
        }
        if(name && pkg.getName()!=name) {
            return;
        }
        test = pkg.getPath().join(path);
        if(test.exists()) {
            file = test;
        }
    });
    
    return file;
}

