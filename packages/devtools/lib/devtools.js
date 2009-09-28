
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var system = require("system");
var fs = require('file');
var os = require('os');
var args = require("args");
var parser = exports.parser = new args.Parser();
var UTIL = require("util");
var MD5 = require("md5");
var STRUCT = require("struct");
var CONFIG = require("./config");
var SEA = require("narwhal/tusk/sea");
var STREAM = require('term').stream;

parser.help('xulrunner developer tools');

parser.helpful();



var seaPath = SEA.getActive().path,
    config = CONFIG.Config(seaPath),
    profilesPath = seaPath.join("build", "profiles"),
    profileSeaKey = STRUCT.bin2hex(MD5.hash(profilesPath.valueOf())),
    command;


command = parser.command('launch', function(options) {
    
    var app = options.app,
        version = options.version,
        profile = options.profile,
        dev = options.dev;
    
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
    
    if(profile) {
        var profileDirectory = profilesPath.join(profile);
        if(!profileDirectory.exists(profileDirectory)) {
            print("error: profile with name '" + profile + "' does not exist at: " + profileDirectory);
            return;
        }        
        cmd.push("-P " + profile + "-" + profileSeaKey);
    }
    if(dev) {
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
command.helpful();



command = parser.command('add-bin', function(options) {
    
    var path = fs.Path(options.args[0]).absolute();

    var result = os.command(path + " -v").trim(),
        parts,
        app,
        version;
    
    if(parts = result.match(/Mozilla Firefox ([\d.]*), Copyright \(c\) 1998 - \d{4} mozilla.org/)) {
        app = "firefox";
        version = parts[1];
    } else {
        print("error: no match found for version string: "+result);
        return;
    }
    
    if(config.addBinary(app, version, path)) {
        print("added binary for '"+app+"' with version '"+version+"'");
    } else {
        print("error: binary already exists for path");
    }
});
command.help("Add a xulrunner-based binary (firefox)")
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
    


exports.main = function (args) {
    var options = parser.parse(args);
    if (!options.acted) {
        parser.printHelp(options);
    }
}
