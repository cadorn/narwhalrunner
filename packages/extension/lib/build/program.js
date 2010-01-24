
var PROGRAM = require("build/program", "common");
var BUILD_UTIL = require("build/util", "common");


exports.Program = function (programPackage) {

    // PRIVATE
    
    var Program = PROGRAM.Program(programPackage);
    
    // PUBLIC
    

    Program.buildStaticPlatform = function(scope) {
        with(scope) {
            // write install.rdf
            fromPath = platformPackage.getInstallRdfPath();
            toPath = Program.getInstallRdfPath();
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
        return Program.getTargetPath().join("modules");
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
        return Program.getTargetPath().join("chrome.manifest");
    }

    Program.getChromeJarredManifestPath = function() {
        return Program.getTargetPath().join("chrome.jarred.manifest");
    }

    Program.getPackageJsonPath = function() {
        return Program.getTargetPath().join("package.json");
    }

    Program.getInstallRdfPath = function() {
        return Program.getTargetPath().join("install.rdf");
    }
    
    return Program;
    
    // PRIVATE
    
}
