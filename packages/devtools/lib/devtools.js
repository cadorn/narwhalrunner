
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var system = require("system");
var fs = require('file');
var os = require('os');
var args = require("args");
var parser = exports.parser = new args.Parser();
var UTIL = require("util");
var FILE = require("file");
var MD5 = require("md5");
var STRUCT = require("struct");
var CONFIG = require("./config");
var SEA = require("narwhal/tusk/sea");
var TUSK = require("narwhal/tusk/tusk");
var MANIFEST = require("narwhal/tusk/manifest");
var STREAM = require('term').stream;

parser.help('xulrunner developer tools');

parser.helpful();



var tusk = TUSK.Tusk().activate(),
    seaPath = TUSK.getActive().getSea().getPath(),
    config = CONFIG.Config(seaPath),
    profilesPath = seaPath.join("build", "profiles"),
    profileSeaKey = STRUCT.bin2hex(MD5.hash(profilesPath.valueOf())),
    command;


command = parser.command('launch', function(options) {
    
    var app = options.app,
        version = options.version,
        profile = options.profile,
        packageName = options["package"];
    
    if(!app) {
        print("error: you must specify --app");
        return;
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
    
    if(packageName) {
        
        if(profile) {
            print("error: you cannot specify --profile and --package at the same time");
            return;
        }
        
        var packagePath = seaPath.join("build", packageName);        
        
        if(options.build) {
            os.system("tusk package --package " + packageName + " build");
        }
        
        if(!packagePath.exists()) {
            print("error: package not found at: " + packagePath);
            return;
        }
        
        if(app=="xulrunner") {
            cmd.push(packagePath.join("application.ini").valueOf());
        } else
        if(app="firefox") {
            cmd.push("-app " + packagePath.join("application.ini").valueOf());
        }
        
    } else
    if(profile) {
        var profileDirectory = profilesPath.join(profile);
        if(!profileDirectory.exists(profileDirectory)) {
            print("error: profile with name '" + profile + "' does not exist at: " + profileDirectory);
            return;
        }        
        cmd.push("-P " + profile + "-" + profileSeaKey);

        if(options.build) {
            
            var extensionsDirectory = profileDirectory.join("extensions");
            extensionsDirectory.listPaths().forEach(function(extensionDirectory) {
                
                var manifest = MANIFEST.Manifest(extensionDirectory.join("package.json"));
                if(manifest.exists()) {

                    // build the package
                    os.system("tusk package --package " + manifest.getName() + " build");
                }
            });
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
    cmd = cmd.join(" ");
    
    print("Running: " + cmd);
    
    os.system(cmd);
    
});
command.help('Launch a binary');
command.option('--app', 'app').set().help("The binary name");
command.option('--version', 'version').set().help("The binary version");
command.option('--profile', 'profile').set().help("The profile to launch with");
command.option('--dev', 'dev').bool().help("Start binary in development mode");
command.option('--build', 'build').bool().help("Build all narwhalrunner extensions (from the active sea) in the profile before launch");
command.option('--package', 'package').set().help("The package to launch for xulrunner apps");
command.helpful();



command = parser.command('add-bin', function(options) {
    
    var path = fs.Path(options.args[0]).absolute();

    var result = exports.command(path + " -v").trim(),
        parts,
        app,
        version;

    if(parts = result.match(/Mozilla Firefox ([\d.]*), Copyright \(c\) 1998 - \d{4} mozilla.org/)) {
        app = "firefox";
        version = parts[1];
    } else
    if(parts = result.match(/Mozilla XULRunner ([\d.]*) - \d*/)) {
        app = "xulrunner";
        version = parts[1];
    } else {
        print("error: no match found for version string: " + result);
        return;
    }
    
    if(config.addBinary(app, version, path)) {
        print("added binary for '"+app+"' with version '"+version+"'");
    } else {
        print("error: binary already exists for path");
    }
});
command.help("Add a xulrunner-based binary (firefox or xulrunner)")
    .arg('path');
command.helpful();



command = parser.command('add-extension', function(options) {
    
    var path = fs.Path(options.args[0]).absolute(),
        profile = options.profile,
        link = options.link;
    
    if(!path.exists()) {
        print("error: extension path does not exist: " + path);
        return;
    }
    
    var manifestPath = path.join("install.rdf");
    if(!manifestPath.exists()) {
        print("error: no install.rdf found at: " + manifestPath);
        return;
    }
    
    if(!profile) {
        print("error: you must specify a profile with --profile");
        return;
    }

    var profileDirectory = profilesPath.join(profile);
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
        print("error: extension already exists at path: " + targetPath);
        return;
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
command.option('--profile', 'profile').set().help("The profile to add the extension to");
command.option('-l', '--link', 'link').bool().help("Link the path instead of copying it");
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
    
    var profileDirectory = profilesPath.join(name);
    
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
    
    cmd.push("-CreateProfile '" + name + "-" + profileSeaKey + " " + profileDirectory + "'");
    cmd = cmd.join(" ");
    
    print("Running: " + cmd);
    os.system(cmd);
    
    // TODO: Try and do this automatically
    STREAM.print();
    STREAM.print("  \0magenta(|----------------------------------|\0)");
    STREAM.print("  \0magenta(| \0bold(\0yellow(YOU MUST CLOSE FIREFOX MANUALLY!\0)\0) |\0)");
    STREAM.print("  \0magenta(|----------------------------------|\0)");
    STREAM.print();
    
    cmd = [path, "-P " + name + "-" + profileSeaKey, "-no-remote"].join(" ");

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
    
    profilesPath.listPaths().forEach(function(profileDirectory) {
        print(profileDirectory.basename());        
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
        if(!apps[info[0]]) {
            apps[info[0]] = [];
        }
        apps[info[0]].push([info[2], info[1]]);
    });
    
    UTIL.keys(apps).forEach(function(app) {
        STREAM.print("\0green("+app+"\0)");
        apps[app].forEach(function(info) {
            STREAM.print("  \0yellow("+info[0]+"\0): " + info[1]);
        });
    });
});
command.help("List all registered binaries");
command.helpful();
    




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

