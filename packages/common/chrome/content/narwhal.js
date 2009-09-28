(function() {


const Cc = Components.classes;
const Ci = Components.interfaces;


const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
const em = Cc["@mozilla.org/extensions/manager;1"].getService(Ci.nsIExtensionManager);

var narwhal = Cc["@narwhaljs.org/xulrunner/global;1"].createInstance(Ci.nsINarwhal).system.global;


var print = narwhal.print;


//var system = narwhal.system;
var require = narwhal.require;


var UTIL = require("util");
var FILE = require("file");
var SANDBOX = require("sandbox");

var Loader = SANDBOX.Loader;
var Sandbox = SANDBOX.Sandbox;


var system = UTIL.copy(narwhal.system);
system.engines = UTIL.copy(system.engines);
var paths = require.paths.map(function (path) {
    return String(path);
});


paths.push(FILE.join(system.prefix, "engines", "xulrunner", "lib"));
paths.push(FILE.join(system.prefix, "engines", "default", "lib"));
paths.push(FILE.join(system.prefix, "lib"));

//print(paths);


var loader = Loader({"paths": paths});
var sandbox = Sandbox({
    "loader": loader,
    "system": system,
    "modules": {
        "system": system
    }
});

sandbox.force("system");
sandbox("global");

require = sandbox;


    // A nicer print facility
/*
    system.print = function(message, label)
    {
        if (label) {
            console.dump(label, message, 'Narwhal');
        } else {
            console.dump(message, message, 'Narwhal');
        }           
    };
*/
    
    // Add our extension and user modules to the narwhal sandbox
    
    var paths = [];
    
    // First locate user-installed packages
//    paths.push(getFile('/user').path);

    // Then application/extension packages
    paths.push(getFile('/'));


print("system.prefixes: " +system.prefixes);
print("system.prefix: " +system.prefix);

    // Finally all narwhal system packages
    paths.push(system.prefix);

print(paths);

    require('packages').load(paths);



require("test/hello").say("Yipee!");




    function getFile(path) {
        return em.getInstallLocation("%%ID%%").getItemFile("%%ID%%", path).path;
    }

})();

