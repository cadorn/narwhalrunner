
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


// TODO: Refactor for clarity and simplicity

exports.Program = function(program, buildOptions) {


    // PRIVATE
    
    var rawPackageStore = {
        "get": function(locator) {
            return PACKAGE.Package(buildOptions.path.join("raw", "using", locator.getFsPath()));
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
    if(!version) {
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
    }

    info["Version"] = version;


    // determine common and platform packages
    var commonPackage = PACKAGE.Package(PACKAGES.usingCatalog[module["using"].common].directory),
        platformPackage = PACKAGE.Package(PACKAGES.usingCatalog[module["using"][info["Type"]]].directory);


    info["CommonPackage.ReferenceId"] = commonPackage.setAppInfo(info).getReferenceId();
    info["ProgramPackage.Id"] = programPackage.getUid();
    programPackage.setAppInfo(info);
    platformPackage.setAppInfo(info);
    commonPackage.setAppInfo(info);


    var buildPath = buildOptions.path;
    var targetPath = buildPath.join("extension");


    var Program = {};
    
    // PUBLIC
    
    Program.platformPackage = platformPackage;
    
    Program.getTargetPath = function() {
        return targetPath;
    }
    
    
    Program.dist = function(args) {

        var parser = new ARGS.Parser();
        parser.option('--source')
            .bool();
        var options = parser.parse(args);

        args = args || {};

        if(options.source) {
            Program.build();
        } else {
            Program.build({"chrome.manifest.type": "JarredManifest"});
        }
        
        print("Bundling package '" + programPackage.getName() + "' from path: " + programPackage.getPath());

        var vars = programPackage.getTemplateVariables();
        UTIL.update(vars, pinfVars);
        
        var releaseVersion = vars["Program.Version"];
        
        var sourcePath = Program.getTargetPath(),
            archivePath = buildPath.join(programPackage.getName() + "-" + releaseVersion + ".xpi"),
            stagingPath = buildPath.join(programPackage.getName() + "-" + releaseVersion);

        // copy files we want from build dir to staging dir
        if(stagingPath.exists()) stagingPath.rmtree();
        var command = "rsync -r --copy-links --exclude \"- .DS_Store\" --exclude \"- .git/\" --exclude \"- /packages/narwhal/engines/rhino/\" " + sourcePath + "/* " + stagingPath;
        print(command);
        OS.command(command);


        if(options.source) {
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
        if(archivePath.exists()) archivePath.remove();
        command = "cd " + stagingPath + "; zip -r " + archivePath + " ./";
        print(command);
        result = OS.command(command);


        // write update.rdf
        var fromPath = platformPackage.getUpdateRdfPath();
        var toPath = buildPath.join(programPackage.getName() + "-" + releaseVersion + ".update.rdf");
        BUILD_UTIL.copyWhile(fromPath, toPath, [
            [BUILD_UTIL.replaceVariables, [vars]]
        ]);
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
        if(!options["chrome.manifest.type"]) options["chrome.manifest.type"] = "Manifest";
        
        var parts = [
                "chromeOverlay",
                "preferences",
                "modules",
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
            vars = pkg.getTemplateVariables();
//            UTIL.update(vars, pinfVars);

            var pkgId = pkg.getUid();

            vars["module[package]"] = pkgId;
            
            // copy files that cannot be dynamically loaded
            parts.forEach(function(part) {
                fromPath = pkg["get" + part.substr(0,1).toUpperCase() + part.substr(1) + "Path"]();
                if(fromPath.exists()) {
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


        // build program package
        buildPackage(programPackage);


        
        // build all dependencies
        var sinks = {
            "preferences": []
        }
        var visited = {};
        programPackage.getDescriptor().traverseEveryUsing(function(parentPackage, name, locator, stacks) {
            var pkg = rawPackageStore.get(locator);
            if(visited[pkg.getPath().valueOf()]) {
                return;
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
        [options["chrome.manifest.type"]].forEach(function(manifestType) {
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
            "name": vars["Program.ID"]
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
        fromPath = programPackage.getPath();
        toPath = packagesPath.join(programPackage.getName());
        if(!toPath.exists()) {
            toPath.dirname().mkdirs();    
            fromPath.symlink(toPath);
        }
        print("Linked '" + toPath + "' to '" + fromPath + "'");    


        // link using packages
        fromPath = buildPath.join("raw", "using");
        toPath = usingPath;
        if(!toPath.exists()) {
            toPath.dirname().mkdirs();    
            fromPath.symlink(toPath);
        }
        print("Linked '" + toPath + "' to '" + fromPath + "'");    
        

        Program.buildDynamicPlatform();    
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
