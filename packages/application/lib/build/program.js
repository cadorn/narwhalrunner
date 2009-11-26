
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };

var UTIL = require("util");
var PROGRAM = require("build/program", "common");
var BUILD_UTIL = require("build/util", "common");


exports.Program = function (programPackage) {

    // PRIVATE
    
    var Program = PROGRAM.Program(programPackage);
    
    // PUBLIC
    
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
    
    Program.getComponentsPath = function() {
        return Program.getTargetPath().join("components");
    }
    
    Program.getPackagesPath = function() {
        return Program.getTargetPath().join("chrome", "packages");
    }
    
    Program.getUsingPath = function() {
        return Program.getTargetPath().join("chrome", "using");
    }
    
    Program.getChromeManifestPath = function() {
        return Program.getTargetPath().join("chrome", "chrome.manifest");
    }

    Program.getChromeJarredManifestPath = function() {
        return Program.getTargetPath().join("chrome", "chrome.jarred.manifest");
    }

    Program.getPackageJsonPath = function() {
        return Program.getTargetPath().join("chrome", "package.json");
    }

    Program.getApplicationIniPath = function() {
        return Program.getTargetPath().join("application.ini");
    }
    
    return Program;
    
    // PRIVATE
    
}
