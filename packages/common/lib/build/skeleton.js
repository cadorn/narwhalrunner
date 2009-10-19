
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require('file');
var UTIL = require("util");
var JSON = require('json');
var STREAM = require('term').stream;
var HARNESS = require("./harness");
var MANIFEST = require("narwhal/tusk/manifest");
var PACKAGE = require("../package");


exports.main = function(args, options) { with(HARNESS.initialize(args, options)) {
        
    var vars = options.vars;
    vars.CommonPackageName = commonPackageName;
    
    
    // determine xulrunner engine path
    var enginePath = commonPackage.getPackage("narwhal-xulrunner").getPath();
    var dependenciesPath = sea.getDependenciesPath();
    vars.XULRunnerEnginePath = "dependencies" + enginePath.substr(dependenciesPath.valueOf().length);

    
    var templateVars = {
        build: {
            common: {
                file: ""
            }
        }
    }

    // chrome.manifest
    
    fromPath = locatePath("chrome.manifest.tpl.txt");
    toPath = targetBuildChromePath.join("chrome.manifest");
    
    templateVars.build.common.file = locatePath("chrome.manifest.tpl.txt", "common");
    
    copyWhile(fromPath, toPath, [
        [replaceVariables, [vars]],
        [runTemplate, [templateVars]],
    ]);

    // chrome.manifest of all dependencies
    
    pkg.forEachDependency(function(dependency) {
        var dependencyPackage = dependency.getPackage();
        var manifestPath = dependencyPackage.getPath().join("chrome.manifest.tpl.txt");
        if(manifestPath.exists()) {
            
            // TODO: identify packages directly via a package ID rather than via the catalog
            switch(dependency.getLocator().getUrl() + ":" + dependencyPackage.getName()) {
                case "http://github.com/cadorn/narwhalrunner/raw/master/catalog.json:common":
                case "http://github.com/cadorn/narwhalrunner/raw/master/catalog.json:extension":
                case "http://github.com/cadorn/narwhalrunner/raw/master/catalog.json:application":
                    // ignore chrome manifest files or these packagesas they are handled differently (see above)
                    break;
                default:
                    fromPath = manifestPath;
                    
                    // write to temporary file
                    toPath = targetBuildChromePath.join(".tmp_chrome.manifest~");

                    // cast the dependent package to a common/package object
                    dependencyPackage = PACKAGE.Package(dependencyPackage);
                    dependencyPackage.setAppInfo(pkg.getManifest().manifest.narwhalrunner);
                    
                    var pkgVars = UTIL.copy(vars);
                    UTIL.update(pkgVars, dependencyPackage.getTemplateVariables());
                    
                    copyWhile(fromPath, toPath, [
                        [replaceVariables, [pkgVars]]
                    ]);
                    
                    // append to chrome.manifest file
                    targetBuildChromePath.join("chrome.manifest").write(
                        targetBuildChromePath.join("chrome.manifest").read() + "\n" +
                        toPath.read()
                    );
                    toPath.remove();
                    break;
            }
        }        
    });
    
     
    
    // copy chrome directory for common and extension/application packages
    
    UTIL.forEach(["common", options.type], function(packageName) {

        fromPath = locatePath("chrome/content", packageName);
        toPath = targetBuildChromePath.join("narwhalrunner", "chrome", "content", packageName);
        toPath.mkdirs();
        if(fromPath && fromPath.exists()) {
            fromPath.listPaths().forEach(function(path) {
                var name = path.basename();
                copyWhile(path, toPath.join(name), [
                    [replaceVariables, [vars]],
                ]);
            });
        }        
    });

    // copy modules directory for common

    fromPath = locatePath("modules", "common");
    toPath = targetBuildChromePath.join("narwhalrunner", "modules");
    toPath.mkdirs();
    if(fromPath && fromPath.exists()) {
        fromPath.listPaths().forEach(function(path) {
            var name = path.basename();
            copyWhile(path, toPath.join(name), [
                [replaceVariables, [vars]],
            ]);
        });
    }

    
    // copy components directory for common
    
    fromPath = locatePath("components", "common");
    toPath = targetBuildPath.join("components");
    toPath.mkdirs();
    fromPath.listPaths().forEach(function(path) {

        var name = path.basename().valueOf();

        // for all JS files
        if(name.split(".")[1]=="js") {

            // copy if changed and touch .autoreg
            // @see http://kb.mozillazine.org/Dev_:_Extending_the_Chrome_Protocol
            
            if(!toPath.join(name).exists() || toPath.join(name).read()!=replaceVariables(null, path.read(), vars)) {
                
                copyWhile(path, toPath.join(name), [
                    [replaceVariables, [vars]],
                ]);
                
                var devtoolsManifest = sea.path.join("devtools.local.json");
                if(devtoolsManifest.exists()) {
                    devtoolsManifest = JSON.parse(devtoolsManifest.read());
                    if(UTIL.has(devtoolsManifest, "binaries")) {
                        devtoolsManifest.binaries.forEach(function(info) {
                            var path = FILE.Path(info[1]);
                            if(path.exists()) {
                                var parts = path.valueOf().split("/");
                                if(parts[parts.length-2]=="MacOS") {

                                    path = path.dirname().join(".autoreg");
                                    
                                    path.touch();
                                    
                                    print("Touched: " + path);
                                }
                            }
                        });
                    }
                }
            }
            
        } else {
            path.copy(toPath.join(name));
            print("Copied '" + path + "' to '" + toPath + "'");    
        }
    });
        
    // copy package.json for extension
    fromPath = pkg.getManifest().path;
    toPath = targetBuildPath.join("package.json");
    fromPath.copy(toPath);
    print("Copied '" + fromPath + "' to '" + toPath + "'");
    
    
      
    // copy defaults/preferences for packages

    var packages = [
        commonPackageId,
        platformPackageId,
        packageName
    ];
    var fromBasePath;
    packages.forEach(function(name) {

        fromBasePath = locatePath("defaults/preferences", name);
        
        if(fromBasePath && fromBasePath.exists()) {

            targetBuildPath.join("defaults", "preferences").mkdirs();
            
            fromBasePath.listPaths().forEach(function(entry) {
                if(entry.isFile()) {

                    fromPath = fromBasePath.join(entry.basename());
                    toPath = targetBuildPath.join("defaults", "preferences", entry.basename());

                    copyWhile(fromPath, toPath, [
                        [replaceVariables, [vars]]
                    ]);
                }
            });
        }
    });
    
    
    // copy chrome content & locale for all dependencies
    
    var packages = [];

    pkg.forEachDependency(function(dependency) {
        
        var dependencyPackage = dependency.getPackage();
        
        // cast the dependent package to a common/package object
        dependencyPackage = PACKAGE.Package(dependencyPackage);
        dependencyPackage.setAppInfo(pkg.getManifest().manifest.narwhalrunner);

        var pkgVars = UTIL.copy(vars);
        UTIL.update(pkgVars, dependencyPackage.getTemplateVariables());
        
        // locales
        var locales = dependencyPackage.getLocales();
        if(locales) {
            locales.forEach(function(locale) {
                
                fromPath = FILE.Path(locale[1]);
                toPath = targetBuildPath.join("chrome", "locale", locale[0], dependencyPackage.getReferenceId());
                
                copyTreeWhile(fromPath, toPath, [
                    [replaceVariables, [pkgVars]]
                ]);
            });
        }

        // content
        var contentPath = dependencyPackage.getPath().join("chrome", "content");
        if(contentPath.exists()) {

            fromPath = contentPath;
            toPath = targetBuildPath.join("chrome", "content", dependencyPackage.getReferenceId());

            copyTreeWhile(fromPath, toPath, [
                [replaceVariables, [pkgVars]]
            ]);
        }
    });    
    
}}

if (module.id == require.main)
    exports.main(system.args);
