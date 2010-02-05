

function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var PROGRAM = require("../program");
var BUILD_UTIL = require("../util");


exports.Program = function (program, options) {

    // PRIVATE
    
    var Program = PROGRAM.Program(program, options);
    
    // PUBLIC

    Program.getBuildSubPath = function() {
        return "extension"
    }

    Program.buildStaticPlatform = function(scope) {
        with(scope) {
            // write install.rdf
            var fromPath = platformPackage.getInstallRdfPath();
            var toPath = Program.getInstallRdfPath();
            BUILD_UTIL.copyWhile(fromPath, toPath, [
                [BUILD_UTIL.replaceVariables, [vars]]
            ]);
            
            if(!options.remoteProgram) {
                var contents = toPath.read();
                contents = contents.replace(/<em:updateURL>(.*?)<\/em:updateURL>/g, "");
                toPath.write(contents);
            } else {
                // write update.rdf
                fromPath = platformPackage.getUpdateRdfPath();
                toPath = Program.getUpdateRdfPath();
                BUILD_UTIL.copyWhile(fromPath, toPath, [
                    [BUILD_UTIL.replaceVariables, [vars]]
                ]);
            }
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
    
    Program.getUpdateRdfPath = function() {
        return Program.getTargetPath().join("update.rdf");
    }
    
    return Program;
    
    // PRIVATE
    
}
