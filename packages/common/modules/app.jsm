/**
 * Keeps a global reference to our app
 * 
 * @author Christoph Dorn <christoph@christophdorn.com>
 * @copyright Copyright (c) 2009 Christoph Dorn <christoph@christophdorn.com>
 * @license MPL
 */

EXPORTED_SYMBOLS = ["system", "require", "print", "prefix"];

const Cc = Components.classes;
const Ci = Components.interfaces;

// -----------------------------------
// load narwhal    
// -----------------------------------

var narwhal = Cc["@narwhaljs.org/xulrunner/global;1"].createInstance(Ci.nsINarwhal).system.global;
var print = narwhal.print;
var require = narwhal.require;


// -----------------------------------
// create sandbox
// -----------------------------------

try {

    var UTIL = require("util");
    var FILE = require("file");
    var PACKAGES = require("packages");
    var Sandbox = require("sandbox").Sandbox;
    var LOADER = require("loader");
    LOADER.reassignFileModule(FILE);
    var Loader = LOADER.Loader;
    var JAR_LOADER = require("jar-loader");
        
    // start with the program root path and locate all resources from there
    var programRootPath = FILE.Path(getPath('/%%Program.SeaPath%%'));

    if(programRootPath.join("using.jar").exists()) {
        JAR_LOADER.registerJar(
            programRootPath.join("using").valueOf(),
            programRootPath.join("using.jar").valueOf()
        );
    }
    if(programRootPath.join("packages.jar").exists()) {
        JAR_LOADER.registerJar(
            programRootPath.join("packages").valueOf(),
            programRootPath.join("packages.jar").valueOf()
        );
    }
    
    var system = UTIL.copy(narwhal.system);
    var loader = Loader({
        // construct own loader paths to ensure predictable environment
        "paths": [
            PACKAGES.usingCatalog["narwhal-xulrunner"].libPath,
            FILE.join(PACKAGES.usingCatalog["narwhal"].directory, "engines", "default", "lib"),
            PACKAGES.usingCatalog["narwhal"].libPath
        ]
    });
    var sandbox = Sandbox({
        "loader": loader,
        "system": system,
        "modules": {
            "system": system,
            "jar-loader": JAR_LOADER        // prevents module from being re-loaded in the sandbox
        },
        "debug": false
    });

    sandbox.force("system").env["SEA"] = programRootPath.valueOf();
    sandbox("global");
    
    // everything goes through the sandbox from now on
    require = function(id, pkg) {
        return sandbox(id, null, pkg);
    }

    // -----------------------------------
    // load packages into sandbox
    // -----------------------------------

    // load packages from paths
    require('packages').load([
        programRootPath.valueOf()    // application/extension packages
    ]);
    
} catch(e) {
    narwhal.system.log.error(e);
}

function getPath(path) {
    if("%%Program.Type%%"=="extension") {
        var em = Cc["@mozilla.org/extensions/manager;1"].getService(Ci.nsIExtensionManager);
        return em.getInstallLocation("%%Program.ID%%").getItemFile("%%Program.ID%%", path).path;
    } else {
        var ResourceHandler = Cc['@mozilla.org/network/protocol;1?name=resource'].getService(Ci.nsIResProtocolHandler);
        var IOService = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService)
        var FileService = IOService.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler);
        return FileService.getFileFromURLSpec(ResourceHandler.resolveURI(IOService.newURI("resource:"+path, null, null))).path;
    }
}
