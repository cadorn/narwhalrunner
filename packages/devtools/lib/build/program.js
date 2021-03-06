
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var SYSTEM = require("system");
var OS = require("os");
var UTIL = require("util");
var FILE = require("file");
var JSON = require("json");
var ZIP = require("zip");
var BUILD_UTIL = require("./util");
var PACKAGE = require("package", "common");
var ARGS = require('args');
var PACKAGES = require("packages");
var LOCATOR = require("package/locator", "pinf");
var PINF = require("pinf", "pinf");
var TERM = require("term");

// TODO: Refactor for clarity and simplicity

exports.Program = function(builder, buildOptions) {


TERM.stream.print("\0green(*** Building narwhalrunner program ***\0)");
TERM.stream.print("\0green(    sourcePackage: "+builder.sourcePackage.getPath()+"\0)");
TERM.stream.print("\0green(    rawPackage   : "+builder.rawPackage.getPath()+"\0)");
TERM.stream.print("\0green(    targetPackage: "+builder.targetPackage.getPath()+"\0)");
    


    var locator = builder.rawPackage.getDescriptor().getUsingLocatorForName("extension");
    var program = PINF.getPackageForLocator(locator);
    

    

    

    // PRIVATE

    var rawPackageStore = {
        "get": function(locator) {
            if(locator.getForceRemote()) {
                var pkg = PINF.getPackageForLocator(locator);
                return PACKAGE.Package(pkg.getPath());
            }
            return PACKAGE.Package(builder.rawPackage.getPath().join("using", locator.getFsPath()), locator);
        }
    }
    

    // cast the programPackage to a common/package object
    programPackage = PACKAGE.Package(program);
    var packageDatum = programPackage.getDescriptor().getCompletedSpec();
    
    // resolve PINF vars
//    var pinfVars = {};
//    PACKAGE.resolvePackageInfoVariables(packageDatum, pinfVars);
    var info = packageDatum.narwhalrunner;


    var version = program.getVersion();
//    if(!version) {
        // if no version is supplied we date stamp the archive
        var time = new Date()
        version = [
            "0.0.0" + program.getLocator().getRevision(),
            (""+time.getFullYear()).substr(2,2),
            UTIL.padBegin(time.getMonth()+1, 2),
            UTIL.padBegin(time.getDate(), 2),
            UTIL.padBegin(time.getHours(), 2),
            UTIL.padBegin(time.getMinutes(), 2)
        ].join("");
//    }

    info["Version"] = version;



    // determine common and platform packages
//    var commonPackage = rawPackageStore.get(buildOptions.uidLocators["http://registry.pinf.org/cadorn.org/github/narwhalrunner/packages/common/"]),
    // TODO: Ensure the locator being fetched is the corrent one when remote dependencies/versions are used
    var commonPackage = rawPackageStore.get(programPackage.getDescriptor().getUsingLocatorForName("nr-common")),
        platformPackage = PACKAGE.Package(PACKAGES.usingCatalog[module["using"][info["Type"]]].directory);


    info["CommonPackage.ReferenceId"] = commonPackage.setAppInfo(info).getReferenceId();
    info["ProgramPackage.Id"] = programPackage.getTopLevelId();//getUid();
    programPackage.setAppInfo(info);
    platformPackage.setAppInfo(info);
    commonPackage.setAppInfo(info);



//    var buildPath = program.getBuildPath();


    var Program = {};
    
    // PUBLIC
    
    Program.platformPackage = platformPackage;
    
    Program.getTargetPath = function() {
        
        return builder.targetPackage.getPath();
    }


    Program.dist = function(distOptions) {

        if(distOptions.nojar) {
            Program.build();
        } else {
            Program.build({"chrome.manifest.type": "JarredManifest"});
        }
        
        print("Bundling package '" + programPackage.getName() + "' from path: " + programPackage.getPath());

        var vars = programPackage.getTemplateVariables();
//        UTIL.update(vars, pinfVars);

        
        var releaseVersion = vars["Program.Version"];

        
        var sourcePath = Program.getTargetPath(),
            archivePath = buildPath.join(programPackage.getName() + ".xpi"),
            stagingPath = buildPath.join(programPackage.getName());



// HACK: This is temporary until the program package is a "using" package as well        
        OS.command("rm -Rf " + sourcePath.join("packages", programPackage.getName(), "packages"));
        var fromPath = builder.rawPackage.getPath().join("package.json"),
            toPath = sourcePath.join("packages", programPackage.getName(), "package.json");
        toPath.remove();
        fromPath.copy(toPath);
        



        // copy files we want from build dir to staging dir
        if(stagingPath.exists()) stagingPath.rmtree();
        var command = "rsync -r --copy-links --exclude \"- .DS_Store\" --exclude \"- .git/\" " + sourcePath + "/* " + stagingPath;
        print(command);
        OS.command(command);


        if(distOptions.nojar) {
            print("Skipping jarring to generate source distribution");
        } else {
            // package jars
            packageJar(stagingPath.join("chrome", "overlay"));
            packageJar(stagingPath.join("packages"));
            packageJar(stagingPath.join("using"));
    
            // use jarred manifest
            stagingPath.join("chrome.jarred.manifest").rename("chrome.manifest");
        }        

        // create archive
/*        
        if(archivePath.exists()) archivePath.remove();
        command = "cd " + stagingPath + "; zip -r " + archivePath + " ./";
        print(command);
        result = OS.command(command);
*/

        // write update.rdf
/*        
        var fromPath = platformPackage.getUpdateRdfPath();
        var toPath = buildPath.join(programPackage.getName() + "-" + releaseVersion + ".update.rdf");
        BUILD_UTIL.copyWhile(fromPath, toPath, [
            [BUILD_UTIL.replaceVariables, [vars]]
        ]);
*/
    }    
    
    Program.build = function(options) {
        
        print("Building package '" + programPackage.getName() + "' from path: " + programPackage.getPath());
        
        var targetPath = Program.getTargetPath();
        
        Program.buildStatic(options);

        Program.buildDynamic();
        
        Program.triggerComponentReload();
    }    
    
    Program.buildStatic = function(options) {
        
        options = options || {};
//        if(!options["chrome.manifest.type"]) options["chrome.manifest.type"] = "Manifest";
        
        var parts = [
                "chromeOverlay",
                "preferences",
                "modules",
                "chromeResources",
                "components",
                "chromeLocale",
                "chromeSkin"
            ],
            fromPath,
            toPath,
            vars;
        
        var chromeManifests = {"Manifest": {}, "JarredManifest": {}};
        
        
        function buildPackage(pkg, sinks) {

            // ignore packages without uid as they are not likely to contain anything we need to worry about
            if(!pkg.hasUid()) return;
            
            var id = pkg.getReferenceId();
            vars = pkg.getTemplateVariables(commonPackage);
//            UTIL.update(vars, pinfVars);

            var pkgId = pkg.getUid();

//            vars["module[package]"] = pkgId;
            vars["module[package]"] = pkg.getTopLevelId();
            
            // copy files that cannot be dynamically loaded
            parts.forEach(function(part) {
                fromPath = pkg["get" + part.substr(0,1).toUpperCase() + part.substr(1) + "Path"]();
                if(fromPath.exists()) {
                    if(part=="chromeResources") {
                        // just link
                        toPath = Program["get" + part.substr(0,1).toUpperCase() + part.substr(1) + "Path"]().join(id);
                        toPath.mkdirs();
                        fromPath.listPaths().forEach(function(sourceDir) {
                            sourceDir.symlink(toPath.join(sourceDir.basename()));
                        });
                    } else
                    if(part=="chromeLocale" || part=="chromeSkin") {
                        // locales & skins need to be written into subdirectories
                        fromPath.listPaths().forEach(function(sourceDir) {
                            toPath = Program["get" + part.substr(0,1).toUpperCase() + part.substr(1) + "Path"]().join(sourceDir.basename(), id);
                            BUILD_UTIL.copyTreeWhile(fromPath.join(sourceDir.basename()), toPath, [
                                [BUILD_UTIL.replaceVariables, [vars, "%%"]],
                                [BUILD_UTIL.replaceVariables, [vars, "__"]]
                            ]);
                        });
                    } else
                    if(part=="preferences") {
                        // all preferences need to go into one prefs.js file
                        fromPath.listPaths().forEach(function(entry) {
                            sinks.preferences.push(BUILD_UTIL.process([
                                [BUILD_UTIL.replaceVariables, [vars, "%%"]],
                                [BUILD_UTIL.replaceVariables, [vars, "__"]]
                            ], entry.read()));
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

            // determine ID for some important narwhalrunner packages                        
            if(pkg.getUid()==commonPackage.getUid() || pkg.getUid()==platformPackage.getUid()) {
                pkgId = "__" + pkg.getName() + "__";
            }
            
            // fetch chrome manifest
            ["Manifest", "JarredManifest"].forEach(function(manifestType) {
                fromPath = pkg["getChrome" + manifestType + "Path"]();
                if(fromPath.exists()) {
                    chromeManifests[manifestType][pkgId] = BUILD_UTIL.process([
                        [BUILD_UTIL.replaceVariables, [vars, "%%"]],
                        [BUILD_UTIL.replaceVariables, [vars, "__"]]
                    ], fromPath.read());
                }
            });
        }

        var sinks = {
            "preferences": []
        }

        // build program package
        buildPackage(programPackage, sinks);


        
        // build all dependencies
        var visited = {};
        programPackage.getDescriptor().traverseEveryUsing(function(parentPackage, name, locator, stacks) {
            var key = ["packages", "using"].concat(stacks.names).concat([name, "@"]);

            if(buildOptions.remoteProgram) {
                // overwite locator with the one from the program config
                locator = LOCATOR.PackageLocator(program.spec.get(key).locator);
            }

            if(buildOptions.remoteDependencies) {
                locator.setForceRemote(true);
            }

            var pkg = rawPackageStore.get(locator);

            // linked packages do not contain 'version' properties
            if(pkg.getVersion()) {
                locator.pinAtVersion(pkg.getVersion());
            }

            if(visited[pkg.getPath().valueOf()]) {
                return locator;
            }
            visited[pkg.getPath().valueOf()] = true;

            pkg.setAppInfo(programPackage.getAppInfo());
            
            buildPackage(pkg, sinks);

            return locator;
        }, {
            "packageStore": rawPackageStore,
            "package": programPackage
        });
        
        // dump all sinks
        if(sinks.preferences.length>0) {
            toPath = Program.getPreferencesPath();
            toPath.dirname().mkdirs();
            toPath.write(sinks.preferences.join("\n"));
            print("Wrote preferences file to: " + toPath);
        }

  
        
        // setup all vars for the program package
        vars = programPackage.getTemplateVariables();
//        UTIL.update(vars, pinfVars);


        // write chrome manifest files
        [
            "Manifest",
            "JarredManifest"
        ].forEach(function(manifestType) {
            toPath = Program["getChrome" + manifestType + "Path"]();
            var templateVars = { "build": {"dependencies": []} };
            var rootTemplate;
            UTIL.every(chromeManifests[manifestType], function(entry) {
                if(entry[0]=="__common__") {
                    templateVars.build.common = entry[1];
                } else
                if(entry[0]=="__" + vars["Program.Type"] + "__") {
                    rootTemplate = entry[1];
                } else
                if(entry[0]==programPackage.getName()) {
                    templateVars.build.program = entry[1];
                } else {
                    templateVars.build.dependencies.push(entry[1]);
                }
            });
            templateVars.build.dependencies = templateVars.build.dependencies.join("\n");
            toPath.write(BUILD_UTIL.runTemplate([], rootTemplate, templateVars));
            print("Wrote " + manifestType + " file to: " + toPath);
        })

        // write package.json
        toPath = Program.getPackageJsonPath();

        toPath.write(JSON.encode({
            "name": vars["Program.ID"],
            "version": version
        }, null, 4));
        print("Wrote package.json file to: " + toPath);
        
        

        Program.buildStaticPlatform({
            "fromPath": fromPath,
            "toPath": toPath,
            "platformPackage": platformPackage,
            "vars": vars
        });
    }    

    Program.buildStaticPlatform = function() {
        
    }

    Program.buildDynamic = function() {
        
//        var chromeContentPath = Program.getChromeContentPath();
//        var chromeLocalePath = Program.getChromeLocalePath();

        var packagesPath = Program.getPackagesPath(),
            usingPath = Program.getUsingPath();
        
        var fromPath,
            toPath;

        // link program package
/*        
Program package is now a using package
        fromPath = programPackage.getPath();
        toPath = packagesPath.join(programPackage.getName());
        if(!toPath.exists()) {
            toPath.dirname().mkdirs();    
            fromPath.symlink(toPath);
        }
        print("Linked '" + toPath + "' to '" + fromPath + "'");    
*/

        // link using packages
        fromPath = builder.rawPackage.getPath().join("using");
        toPath = usingPath;
        if(!toPath.exists()) {
            toPath.dirname().mkdirs();    
            fromPath.symlink(toPath);
        }
        print("Linked '" + toPath + "' to '" + fromPath + "'");    
        

        Program.buildDynamicPlatform({
            "fromPath": fromPath,
            "toPath": toPath
        });    
    }    

    Program.buildDynamicPlatform = function() {
        // to be subclassed
    }
    
    Program.triggerComponentReload = function() {
/*        
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
*/        
    }

    return Program;
    
    
    // PRIVATE
    
    function packageJar(path) {
        if(!path.exists()) {
            throw "Directory not found! Cannot package jar for path: " + path;
        }
        var command = "cd " + path + "; zip -r " + path.valueOf() + ".jar ./";
        print(command);
        var result = OS.command(command);
        print(result);
        path.rmtree();
    }
}
