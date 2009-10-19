
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require('file');
var UTIL = require("util");
var STREAM = require('term').stream;
var TUSK = require("narwhal/tusk/tusk");
var TEMPLATE = require("template", "template");
var STRUCT = require("struct");
var MD5 = require("md5");
var APP = require("../app");
var PACKAGE = require("../package");


var initialized = false;

var sea = TUSK.getActive().getSea(),
    buildDirectory = sea.getBuildPath(),
    applicationPackage,     // deprecated
    extensionPackage,       // deprecated
    platformPackage,
    platformPackageId,
    commonPackage,
    commonPackageName,      // deprecated
    commonPackageId,
    packageName,
    packageID,
    targetBuildPath,
    targetBuildChromePath,
    fromPath,
    toPath,
    app,
    pkg,
    pkgType;


exports.initialize = function(args, options) {
    
    if(!initialized) {
        packageName = args["package"];

        commonPackageId = commonPackageName = module["package"];
        commonPackage = sea.getPackage(commonPackageName);
        
        platformPackageId = args["platform"];
        platformPackage = sea.getPackage(args["platform"]);

        
        targetBuildChromePath = targetBuildPath = buildDirectory.join(packageName);
        if(options.type=="application") {
            targetBuildChromePath = targetBuildChromePath.join("chrome");
            applicationPackage = platformPackage;
        } else
        if(options.type=="extension") {
            extensionPackage = platformPackage;
        }
        pkg = PACKAGE.Package(sea.getPackage(packageName));
        pkg.setAppInfo(pkg.getManifest().manifest.narwhalrunner);
        pkgType = options.type;
        packageID = pkg.getReferenceId();

        targetBuildPath.mkdirs();

        initialized = true;
    }
    
    return {
        sea: sea,
        buildDirectory: buildDirectory,
        extensionPackage: extensionPackage,
        platformPackage: platformPackage,
        platformPackageId: platformPackageId,
        commonPackage: commonPackage,
        commonPackageName: commonPackageName,
        commonPackageId: commonPackageId,
        packageName: packageName,
        targetBuildPath: targetBuildPath,
        targetBuildChromePath: targetBuildChromePath,
        fromPath: fromPath,
        toPath: toPath,
        pkg: pkg,
        copyWhile: exports.copyWhile,
        copyTreeWhile: exports.copyTreeWhile,
        runTemplate: exports.runTemplate,
        replaceVariables: exports.replaceVariables,
        locatePath: exports.locatePath,
        packageID: packageID
    }
}

exports.copyWhile = function(fromPath, toPath, callbacks) {
    print("Copying '" + fromPath + "' to '" + toPath + "':");
    toPath.dirname().mkdirs();
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

exports.copyTreeWhile = function(source, target, callbacks, path) {
    var sourcePath = (source = FILE.path(source)).join(path);
    var targetPath = (target = FILE.path(target)).join(path);
    if (sourcePath.isDirectory()) {
        targetPath.mkdir();
        sourcePath.listPaths().forEach(function(entry) {
            exports.copyTreeWhile(source, target, callbacks, ((path)?path.join(entry.basename()):entry.basename()));
        });
    } else {
        exports.copyWhile(sourcePath, targetPath, callbacks);
    }
};

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
        platformPackage,
        commonPackage
    ];
    
    var test,
        file = null;
    
    tests.forEach(function(pkg) {
        if(file) {
            return;
        }
        if(name && pkg.getId()!=name && pkg.getName()!=name) {
            return;
        }
        test = pkg.getPath().join(path);
        
        if(test.exists()) {
            file = test;
        }
    });
    
    return file;
}

