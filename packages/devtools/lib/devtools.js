
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };






var system = require("system");
var fs = require('file');
var os = require('os');
var args = require("args");
var UTIL = require("util");
var FILE = require("file");
var MD5 = require("md5");
var STRUCT = require("struct");
var CONFIG = require("./config");
var STREAM = require('term').stream;
var PINF = require("pinf", "pinf");
var LOCATOR = require("package/locator", "pinf");
var ARGS_UTIL = require("args-util", "util");
var VALIDATOR = require("validator", "util");


var parser = exports.parser = new args.Parser();
parser.help('xulrunner developer tools');
parser.helpful();

PINF.setDatabase(PINF.getDefaultDatabase());

var config = CONFIG.Config(PINF.getDatabase().getConfig("registry.pinf.org/cadorn.org/github/narwhalrunner/packages/devtools/config")),
    profilesPath = PINF.getDatabase().getDataPath("registry.pinf.org/cadorn.org/github/narwhalrunner/packages/devtools/profiles"),
    profileIdSeed = STRUCT.bin2hex(MD5.hash(system.env.PINF_WORKSPACE_HOME)),
    command;


command = parser.command('launch', function(options) {
    
    var app = options.app,
        version = options.version,
        profile = options.profile,
        program = (options["program"])?VALIDATOR.validate("directory", options["program"], {
            "makeAbsolute": true,
            "return": "FILE.Path"
        }):null,
        build = (options.build)?VALIDATOR.validate("directory", options.build, {
            "makeAbsolute": true,
            "return": "FILE.Path"
        }):null;

    
    if(!app) {
        app = "firefox";
    }
    
    if(!version) {
        version = config.getLatestVersionForApp(app);
        if(!version) {
            print("error: could not determine latest version for app: " + app);
            return;
        }
    }

    var path = config.getBinaryForAppVersion(app, version),
        cmd = [path];

    if(!path || !fs.Path(path).exists()) {
        print("error: could not find binary for app '" + app + "' and version '" + version + "' at: " + path);
        return;
    }
    
    if(program) {
        
        if(profile) {
            print("error: you cannot specify --profile and --package at the same time");
            return;
        }
                
        // path is not a path to an extension - see if it is a path to a program
        var locator = PINF.locatorForDirectory(program),
            workspace = PINF.getDatabase().getWorkspaceForSelector(program);
        if(!locator) {
            throw new Error("Program not found at: " + program);
        }
        locator.setRevision(workspace.getRevisionControlBranch());
    
        var pkg = PINF.getDatabase().getProgram(locator),
            applicationPath = PINF.getDatabase().getBuildPathForPackage(pkg).join("application");
    
        if(build) {
            buildAtPath(build);
        }
        
        if(!applicationPath.exists()) {
            print("error: application not found at: " + applicationPath);
            return;
        }
        
        if(app=="xulrunner") {
            cmd.push(applicationPath.join("application.ini").valueOf());
        } else
        if(app=="firefox") {
            cmd.push("-app " + applicationPath.join("application.ini").valueOf());
        }
        
    } else
    if(profile) {
        var profileDirectory = profilesPath.join(profile + "-" + profileIdSeed);
        if(!profileDirectory.exists(profileDirectory)) {
            print("error: profile with name '" + profile + "' does not exist at: " + profileDirectory);
            return;
        }        
        cmd.push("-P " + profile + "-" + profileIdSeed);

        if(build) {
            buildAtPath(build);
        }

        if(options.compreg) {
            var compregFile = profileDirectory.join("compreg.dat");
            if(compregFile.exists()) {
                compregFile.remove();
                print("Deleted: " + compregFile);
            } else {
                print("Skipping delete of compreg.dat as it does not exist at: " + compregFile);
            }
        }

    } else
    if(options.build) {
        print("error: you can only use the --build flag if --profile is also specified");
        return;
    }
        
    if(options.dev) {
        cmd.push("-jsconsole");
    }
    cmd.push("-no-remote");
    if(options.chromebug) {
        cmd.push("--chromebug");
    }
    cmd = cmd.join(" ");
    
    print("Running: " + cmd);
    
    os.system(cmd);
    
});
command.help('Launch a binary');
command.option('--app').set().help("The binary name");
command.option('--version').set().help("The binary version");
command.option('--profile').set().help("The profile to launch with");
command.option('--dev').bool().help("Start binary in development mode");
command.option('--chromebug').bool().help("Enable chromebug");
command.option('--build').set().help("Build the program/package at the specified path before launching");
command.option('--program').set().help("Path to program to launch for xulrunner apps");
command.option('--compreg').set().help("Delete compreg.dat in profile folder before launch");
command.helpful();



command = parser.command('add-bin', function(options) {
    
    var path = fs.Path(options.args[0]).absolute();

    var result = exports.command(path + " -v").trim(),
        parts,
        app,
        version;

    if(parts = result.match(/Mozilla Firefox ([\d.ab]*), Copyright \(c\) 1998 - \d{4} mozilla.org/)) {
        app = "firefox";
        version = parts[1];
    } else
    if(parts = result.match(/Mozilla Firefox ([\d.ab]*)/)) {
        app = "firefox";
        version = parts[1];
    } else
    if(parts = result.match(/Mozilla XULRunner ([\d.ab]*) - \d*/)) {
        app = "xulrunner";
        version = parts[1];
    } else {
        print("error: no match found for version string: " + result);
        return;
    }
    
    if(config.addBinary(app, version, path.valueOf())) {
        print("added binary for '"+app+"' with version '"+version+"'");
    } else {
        // update version of binary
       if(!config.updateBinary(app, version, path.valueOf())) {
           print("error: binary with same version already exists for path");
       }
    }
});
command.help("Add a xulrunner-based binary (firefox or xulrunner)")
    .arg('path');
command.helpful();



command = parser.command('populate-profile', function(options) {
    
    var name = options.args[0];
    
    if(!name) {
        print("error: you must specify a profile with the first argument");
        return;
    }

    var profileDirectory = profilesPath.join(name + "-" + profileIdSeed);
    if(!profileDirectory.exists()) {
        print("error: profile with name '" + name + "' does not exist at: " + profileDirectory);
        return;
    }

    var id = "narwhal@narwhaljs.org";    
    
    var targetPath = profileDirectory.join("extensions", id);
    targetPath.dirname().mkdirs();
    
    if(targetPath.exists()) {
        print("error: extension already exists at path: " + targetPath);
        return;
    }
    
    var pkg = PINF.getDatabase().getProgram(LOCATOR.PackageLocator({
            "catalog": "http://registry.pinf.org/cadorn.org/github/catalog.json",
            "name": "narwhal-xulrunner",
            "revision": "master"
        })),
        path;

    path = pkg.getBuildPath();
/*
    path = pkg.build({
        "remoteProgram": false,
        "remoteDependencies": false
    });
*/

    path.join("extension").symlink(targetPath);
    print("Linked extension '" + id + "' from '" + path.join("extension") + "' to: " + targetPath);
});
command.help('Populate a profile with default extensions');
command.arg("Name");
command.helpful();



command = parser.command('add-extension', function(options) {
    
    var path = VALIDATOR.validate("directory", options.args[0], {
            "makeAbsolute": true,
            "return": "FILE.Path"
        }),
        profile = options.profile,
        link = options.link;
    
    if(!path.exists()) {
        print("error: extension path does not exist: " + path);
        return;
    }
    
    var manifestPath = path.join("install.rdf");
    if(!manifestPath.exists()) {
            
        var buildPath = buildAtPath(path);
        if(buildPath) {
            path = buildPath.join("extension");
            manifestPath = path.join("install.rdf");
        }

        if(!manifestPath.exists()) {
            print("error: no install.rdf found at: " + manifestPath);
            return;
        }
    }
    
    if(!profile) {
        print("error: you must specify a profile with --profile");
        return;
    }

    var profileDirectory = profilesPath.join(profile + "-" + profileIdSeed);
    if(!profileDirectory.exists(profileDirectory)) {
        print("error: profile with name '" + profile + "' does not exist at: " + profileDirectory);
        return;
    }
    
    // determine extension ID
    
    var id = manifestPath.read().match(/<em:id>(.*)<\/em:id>/);
    if(!id) {
        print("error: could not determine extension ID from: " + manifestPath);
        return;
    }
    id = id[1];

    var targetPath = profileDirectory.join("extensions", id);
    targetPath.dirname().mkdirs();


    if(targetPath.exists()) {
        if(options.replace) {
            if(targetPath.isLink()) {
                targetPath.remove();
            } else {
                throw new Error("NYI - Remove old extension files");
            }
        } else {
            print("error: extension already exists at path: " + targetPath);
            return;
        }
    }
    
    if(link) {        
        
        path.symlink(targetPath);
        
        print("Linked extension '" + id + "' to: " + targetPath);
        
    } else {
        
        fs.copyTree(path, targetPath);
        
        print("Copied extension '" + id + "' to: " + targetPath);
    }

});
command.help('Add an extension to a profile');
command.arg('path');
command.option('--profile').set().help("The profile to add the extension to");
command.option('-l', '--link').bool().help("Link the path instead of copying it");
command.option('--replace').bool().help("Replace existing extension if it exists");
command.helpful();


command = parser.command('create-profile', function(options) {

    var name = options.args[0],
        dev = options.dev,
        homepage = options.homepage;
    
    if(!name) {
        print("error: you must specify a name for the profile");
        return;
    }
    
    profilesPath.mkdirs();
    
    var profileDirectory = profilesPath.join(name + "-" + profileIdSeed);
    
    if(profileDirectory.exists()) {
        print("error: a profile directory already exists at: " + profileDirectory);
        return;
    }
    
    profileDirectory.mkdirs();
    
    if(dev) {
        var userPreferencesPath = profileDirectory.join("user.js");
        var prefs = [
            'user_pref("javascript.options.showInConsole", true);',
            'user_pref("nglayout.debug.disable_xul_cache", true);',
            'user_pref("browser.dom.window.dump.enabled",  true);',
            'user_pref("javascript.options.strict", true);',
            'user_pref("extensions.logging.enabled", true);',
            'user_pref("browser.tabs.warnOnClose", false);'
        ];
        if(homepage) {
            prefs.push('user_pref("browser.startup.homepage", "' + homepage + '");');
        }
        userPreferencesPath.write(prefs.join("\n"), {charset: 'utf-8'});
        
        print("Write preferences file to: " + userPreferencesPath);
    }

    var app = "firefox",
        version = config.getLatestVersionForApp(app);

    if(!version) {
        print("error: could not determine latest version for app: " + app);
        return;
    }

    var path = config.getBinaryForAppVersion(app, version),
        cmd = [path];

    if(!path || !fs.Path(path).exists()) {
        print("error: could not find binary for app '" + app + "' and version '" + version + "' at: " + path);
        return;
    }
    
    cmd.push("-CreateProfile '" + name + "-" + profileIdSeed + " " + profileDirectory + "'");
    cmd = cmd.join(" ");
    
    print("Running: " + cmd);
    os.system(cmd);
    
    // TODO: Try and do this automatically
    STREAM.print();
    STREAM.print("  \0magenta(|----------------------------------|\0)");
    STREAM.print("  \0magenta(| \0bold(\0yellow(YOU MUST CLOSE FIREFOX MANUALLY!\0)\0) |\0)");
    STREAM.print("  \0magenta(|----------------------------------|\0)");
    STREAM.print();
    
    cmd = [path, "-P " + name + "-" + profileIdSeed, "-no-remote"].join(" ");

    print("Running: " + cmd);
    os.system(cmd);
    
    print("Created profile with name '" + name + "' at: " + profileDirectory);

});
command.help("Create a firefox profile")
    .arg('name');
command.option('--dev', 'dev').bool().help("Create a development profile");
command.option('--homepage', 'homepage').bool().help("The homepage to use for the profile");
command.helpful();




command = parser.command('list-profiles', function(options) {
    
    if(!profilesPath.exists()) {
        print("no profiles found");
        return;
    }

    var expr = new RegExp("^(.*?)-" + profileIdSeed + "$"),
        m;
    
    profilesPath.listPaths().forEach(function(profileDirectory) {

        if(m = expr.exec(profileDirectory.basename().valueOf())) {

            STREAM.print("\0yellow("+m[1] + "\0) ("+profileDirectory+")");
            
            profileDirectory.join("extensions").listPaths().forEach(function(item) {

                STREAM.print("    \0cyan(" + item.basename() + "\0) : " + item.join("").canonical());
                
            });
        }
    });
});
command.help("Create a firefox profile")
    .arg('name');
command.helpful();




command = parser.command('list-bin', function(options) {
    
    var binaries = config.getBinaries();
    
    if(!binaries) {
        print("no binaries registered");
        return;
    }
    
    var apps = {};
    
    binaries.forEach(function(info) {
        if(!apps[info.app]) {
            apps[info.app] = [];
        }
        apps[info.app].push(info);
    });
    
    UTIL.keys(apps).forEach(function(app) {
        STREAM.print("\0green("+app+"\0)");
        apps[app].forEach(function(info) {
            STREAM.print("  \0yellow("+info.path+"\0): " + info.version);
        });
    });
});
command.help("List all registered binaries");
command.helpful();
    



/*
command = parser.command('inject-sample', function(options) {
    
    var sampleName = options.args[0];
    if(!sampleName) {
        print("No sample name provided");
        return;
    }
    var packageName = options["package"] || false;
    
    // if no package was provided we use the sea package
    var pkg;
    if(!packageName) {
        pkg = tusk.getSea().getSeaPackage();
        packageName = pkg.getName();
    } else {
        pkg = tusk.getSea().getPackage(packageName);
    }
    if(!pkg || !pkg.exists()) {
        print("Package does not exist");
        return;
    }

    var sourcePath = FILE.Path(module.path).dirname().join("samples", sampleName);
    var targetPath = pkg.getPath();

    print("Copying from '"+sourcePath.valueOf()+"' to '"+targetPath.valueOf()+"'.");
    
    FILE.copyTree(sourcePath.join("chrome"), targetPath.join("chrome"));
    FILE.copyTree(sourcePath.join("lib"), targetPath.join("lib"));
    
    var manifest = sourcePath.join("package.json").read();
    manifest = manifest.replace(/%%PackageName%%/g, packageName);
    targetPath.join("package.json").write(manifest);

    print("Done");
});
command.help("Inject sample code into a package")
    .arg('name');
command.option('--package').set().help("The package to inject the sample code into");
command.helpful();
*/



function buildAtPath(path) {
    
    try {
        
        // path is not a path to an extension - see if it is a path to a program
        var locator = PINF.locatorForDirectory(path),
            workspace = PINF.getDatabase().getWorkspaceForSelector(path);
        if(locator) {
            locator.setRevision(workspace.getRevisionControlBranch());

            var database = PINF.getDatabase();
    
            var pkg = database.buildProgram(locator, {
                "remoteProgram": false,
                "remoteDependencies": false
            });

            return pkg.getBuildPath();
        }
    } catch(e) {}

    return false;
}



exports.main = function (args) {
    var options = parser.parse(args);
    if (!options.acted) {
        parser.printHelp(options);
    }
}


exports.command = function (command) {
    var process = os.popen(command);
    var result = process.communicate();
    if (result.status !== 0)
        throw new Error(result.stderr.read());
    var stdout = result.stdout.read() || result.stderr.read();
    return stdout;
};

