
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var PROGRAM = require("build/program", "common");


exports.Program = function (programPackage) {

    // PRIVATE
    
    var Program = PROGRAM.Program(programPackage);
    
    // PUBLIC
    
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
        return Program.getTargetPath().join("defaults", "preferences");
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

    Program.getInstallRdfPath = function() {
        return Program.getTargetPath().join("install.rdf");
    }
    
    return Program;
    
    // PRIVATE
    
}
