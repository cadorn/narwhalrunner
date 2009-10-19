
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var UTIL = require("util");
var FILE = require("file");
var JSON = require("json");
var BUILD_UTIL = require("./util");
var PACKAGE = require("../package");


exports.Program = function(programPackage) {

    // PRIVATE

    // cast the programPackage to a common/package object
    programPackage = PACKAGE.Package(programPackage);
    var info = programPackage.getManifest().manifest.narwhalrunner;
    
    
    // determine common and platform packages
    var commonPackage,
        platformPackage;
    programPackage.forEachDependency(function(dependency) {
        var pkg = dependency.getPackage();

print(" : dependency.getName(): "+dependency.getName());
print(" : dependency.getName(): "+dependency.getLocator().getUrl());

        // TODO: make this more generic via a unique package ID
        if(dependency.getLocator().getUrl()=="http://github.com/cadorn/narwhalrunner/raw/master/catalog.json") {
            if(["common", "application", "extension"].indexOf(pkg.getName())>=0) {

print(" : pkg.getName(): "+pkg.getName() + " -- "+info["Type"]);
                // determine the platform package
                if(pkg.getName()==info["Type"]) {
                    platformPackage = pkg;
                } else
                // determine the common package
                if(pkg.getName()=="common") {
                    commonPackage = pkg;
                }
            }
        }
    });

print("platformPackage: "+platformPackage);
    
    platformPackage = PACKAGE.Package(platformPackage)
    commonPackage = PACKAGE.Package(commonPackage);
    info["CommonPackage.ReferenceId"] = commonPackage.setAppInfo(info).getReferenceId();    
    info["ProgramPackage.Id"] = programPackage.getId();    
    programPackage.setAppInfo(info);
    platformPackage.setAppInfo(info);
    commonPackage.setAppInfo(info);


    var sea = programPackage.getSea();
    var targetPath = sea.getBuildPath().join(programPackage.getName());


    var Program = {};
    
    // PUBLIC
    
    Program.getTargetPath = function() {
        return targetPath;
    }
    
    Program.build = function() {
        
        print("Building package '" + programPackage.getName() + "' from path: " + programPackage.getPath());
        
        Program.buildStatic();
        Program.buildDynamic();
        
        Program.triggerComponentReload();
    }    
    
    Program.buildStatic = function() {
        
        var parts = [
                "chromeOverlay",
                "preferences",
                "modules",
                "components",
                "chromeLocale"
            ],
            fromPath,
            toPath,
            vars;
        
        var chromeManifests = {};
        

        programPackage.forEachDependency(function(dependency) {
            
            // cast the dependent package to a common/package object
            var pkg = PACKAGE.Package(dependency.getPackage());
            pkg.setAppInfo(programPackage.getAppInfo());
            
            var id = pkg.getReferenceId();
            vars = pkg.getTemplateVariables();

            vars["module[package]"] = dependency.getId();
 
            
            // for the common package we need a special variable
            if(pkg.getPath().valueOf()==commonPackage.getPath().valueOf()) {
                vars["module[packages][narwhal-xulrunner]"] = pkg.getPackage("narwhal-xulrunner").getId();
            }
            
            // copy files that cannot be dynamically loaded
            parts.forEach(function(part) {
                fromPath = pkg["get" + part.substr(0,1).toUpperCase() + part.substr(1) + "Path"]();
                if(fromPath.exists()) {
                    if(part=="chromeLocale") {
                        // locales need to be written into subdirectories
                        fromPath.listPaths().forEach(function(localeDir) {
                            toPath = Program.getChromeLocalePath().join(localeDir.basename(), id);
                            BUILD_UTIL.copyTreeWhile(fromPath.join(localeDir.basename()), toPath, [
                                [BUILD_UTIL.replaceVariables, [vars, "%%"]],
                                [BUILD_UTIL.replaceVariables, [vars, "__"]]
                            ]);
                        });
                    } else {
                        if(part=="components") {
                            // components need to be at the root of the components directory
                            toPath = Program["get" + part.substr(0,1).toUpperCase() + part.substr(1) + "Path"]();
                        } else {
                            toPath = Program["get" + part.substr(0,1).toUpperCase() + part.substr(1) + "Path"]().join(id);
                        }
                        BUILD_UTIL.copyTreeWhile(fromPath, toPath, [
                            [BUILD_UTIL.replaceVariables, [vars, "%%"]],
                            [BUILD_UTIL.replaceVariables, [vars, "__"]]
                        ]);
                    }
                }
            });
            

print(" ::: pkg.getPath().valueOf(): "+pkg.getPath().valueOf() + " :: " +platformPackage.getPath().valueOf());

            // determine ID for some important narwhalrunner packages                        
            var pkgId = pkg.getId();
            if(pkg.getPath().valueOf()==commonPackage.getPath().valueOf() ||
               pkg.getPath().valueOf()==platformPackage.getPath().valueOf()) {

                pkgId = "__" + pkg.getName() + "__";
            }
              
            
            // fetch chrome manifest
            fromPath = pkg.getChromeManifestPath();

print(" ::: pkgId: "+pkgId + " :: " +fromPath);

            if(fromPath.exists()) {
                chromeManifests[pkgId] = BUILD_UTIL.process([
                    [BUILD_UTIL.replaceVariables, [vars, "%%"]],
                    [BUILD_UTIL.replaceVariables, [vars, "__"]]
                ], fromPath.read());
            }
            
        }, "package", true);

        
        // setup all vars for the program package
        vars = programPackage.getTemplateVariables();
        
        
        // write chrome.manifest
        toPath = Program.getChromeManifestPath();
        var templateVars = { build: {} };
        var rootTemplate;
        UTIL.every(chromeManifests, function(entry) {
            if(entry[0]=="__common__") {
                templateVars.build.common = entry[1];
            } else
            if(entry[0]=="__" + vars["Program.Type"] + "__") {
                rootTemplate = entry[1];
            } else
            if(entry[0]==programPackage.getName()) {
                templateVars.build.program = entry[1];
            } else {
                if(!UTIL.has(templateVars.build, "dependencies")) {
                    templateVars.build.dependencies = [];
                }
                templateVars.build.dependencies.push(entry[1]);
            }
        });
        

dump(templateVars);
print(rootTemplate);

        
        templateVars.build.dependencies = templateVars.build.dependencies.join("\n");
        toPath.write(BUILD_UTIL.runTemplate([], rootTemplate, templateVars));
        print("Wrote chrome.manifest file to: " + toPath);


        // write install.rdf
        fromPath = platformPackage.getInstallRdfPath();
        toPath = Program.getInstallRdfPath();
        BUILD_UTIL.copyWhile(fromPath, toPath, [
            [BUILD_UTIL.replaceVariables, [vars]]
        ]);


        // write package.json
        toPath = Program.getTargetPath().join("package.json");
        toPath.write(JSON.encode({
            "name": vars["Program.ID"],
            "dependencies": [programPackage.getName()]
        }, null, 4));
        print("Wrote package.json file to: " + toPath);
        
        
        // copy catalog.json
        fromPath = sea.getPath().join("catalog.json");
        toPath = Program.getTargetPath().join("catalog.json");
        BUILD_UTIL.copyWhile(fromPath, toPath, []);

    }    

    Program.buildDynamic = function() {
        
//        var chromeContentPath = Program.getChromeContentPath();
//        var chromeLocalePath = Program.getChromeLocalePath();

        var packagesPath = Program.getPackagesPath();
        
        var fromPath,
            toPath;

        // link program package

        fromPath = programPackage.getPath();
        toPath = packagesPath.join(programPackage.getId());
        if(!toPath.exists()) {
            toPath.dirname().mkdirs();    
            fromPath.symlink(toPath);
        }
        print("Linked '" + toPath + "' to '" + fromPath + "'");    


        programPackage.forEachDependency(function(dependency) {
            
            // cast the dependent package to a common/package object
            var pkg = PACKAGE.Package(dependency.getPackage());
            pkg.setAppInfo(programPackage.getAppInfo());
            
                        
            // link package
            fromPath = pkg.getPath();
            toPath = packagesPath.join(pkg.getId());
            if(!toPath.exists()) {
                toPath.dirname().mkdirs();    
                fromPath.symlink(toPath);
            }
            print("Linked '" + toPath + "' to '" + fromPath + "'");    


            
        }, "package", true);
    }    
    
    
    Program.triggerComponentReload = function() {
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

    return Program;
    
    
    // PRIVATE
    
}
