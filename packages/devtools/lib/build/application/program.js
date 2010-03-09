
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };

var UTIL = require("util");
var PROGRAM = require("../program");
var BUILD_UTIL = require("../util");
var PINF = require("pinf", "pinf");
var LOCATOR = require("package/locator", "pinf");


exports.Program = function (programPackage, options) {

    // PRIVATE
    
    var Program = PROGRAM.Program(programPackage, options);
    
    // PUBLIC

    Program.getBuildSubPath = function() {
        return "application"
    }
    
    Program.buildStaticPlatform = function(scope) {
        with(scope) {
            var date =  new Date();
            vars["Program.BuildID"] = String(date.getFullYear()) +
                                      String(UTIL.padBegin(date.getMonth(),2)) +
                                      String(UTIL.padBegin(date.getDate(),2));
            
            // write application.ini
            fromPath = platformPackage.getApplicationIniPath();
            toPath = Program.getApplicationIniPath();
            BUILD_UTIL.copyWhile(fromPath, toPath, [
                [BUILD_UTIL.replaceVariables, [vars]]
            ]);
        }
    }
    
    Program.buildDynamicPlatform = function(scope) {
        with(scope) {

            var pkg = PINF.getDatabase().getProgram(LOCATOR.PackageLocator({
                "catalog": "http://registry.pinf.org/cadorn.org/github/catalog.json",
                "name": "narwhal-xulrunner",
                "revision": "master"
            })),
            path = PINF.getDatabase().getBuildPathForPackage(pkg),
            buildPath = path.join("extension");

            if(!buildPath.exists()) {
                pkg.build({
                    "path": path,
                    "remoteProgram": false,
                    "remoteDependencies": false
                });
            }
            
            var m = buildPath.join("install.rdf").read().toString().match(/<em:id>([^<]*)<\/em:id>/);
            if(!m) {
                throw new Error("Unable to read extension ID from: " + buildPath.join("install.rdf"));
            }
            
            toPath = Program.getTargetPath().join("extensions", m[1]);
            toPath.dirname().mkdirs();
            buildPath.symlink(toPath);
        }
    }    
        
    Program.getChromeOverlayPath = function() {
        return Program.getTargetPath().join("chrome", "overlay");
    }

    Program.getChromeContentPath = function() {
        return Program.getTargetPath().join("chrome", "content");
    }

    Program.getChromeLocalePath = function() {
        return Program.getTargetPath().join("chrome", "locale");
    }
    
    Program.getChromeSkinPath = function() {
        return Program.getTargetPath().join("chrome", "skin");
    }
    
    Program.getPreferencesPath = function() {
        return Program.getTargetPath().join("defaults", "preferences", "prefs.js");
    }
    
    Program.getModulesPath = function() {
        return Program.getTargetPath().join("chrome", "modules");
    }
    
    Program.getChromeResourcesPath = function() {
        return Program.getTargetPath().join("chrome", "resources");
    }
    
    Program.getComponentsPath = function() {
        return Program.getTargetPath().join("components");
    }
    
    Program.getPackagesPath = function() {
        return Program.getTargetPath().join("packages");
    }
    
    Program.getUsingPath = function() {
        return Program.getTargetPath().join("using");
    }
    
    Program.getChromeManifestPath = function() {
        return Program.getTargetPath().join("chrome", "chrome.manifest");
    }

    Program.getChromeJarredManifestPath = function() {
        return Program.getTargetPath().join("chrome", "chrome.jarred.manifest");
    }

    Program.getPackageJsonPath = function() {
        return Program.getTargetPath().join("package.json");
    }

    Program.getApplicationIniPath = function() {
        return Program.getTargetPath().join("application.ini");
    }
    
    return Program;
    
    // PRIVATE
    
}
