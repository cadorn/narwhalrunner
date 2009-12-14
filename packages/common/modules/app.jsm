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
    var SANDBOX = require("sandbox");
    var LOADER = require("loader");
    var Loader = LOADER.Loader;
    var Sandbox = SANDBOX.Sandbox;
    
    var system = UTIL.copy(narwhal.system);

    var paths = [
        narwhal.system.prefixes[0] + "/lib",
        narwhal.system.prefixes[1] + "/engines/default/lib",
        narwhal.system.prefixes[1] + "/lib"
    ]
        
    var loader = Loader({"paths": paths});
    var sandbox = Sandbox({
        "loader": loader,
        "system": system,
        "modules": {
            "system": system
        }
    });
        
    sandbox.force("system").env["SEA"] = getPath('/%%Program.SeaPath%%');
    sandbox("global");
    
    // everything goes through the sandbox from now on
    require = function(id, pkg) {
        return sandbox(id, null, pkg);
    }


    // -----------------------------------
    // load packages into sandbox
    // -----------------------------------
    
    var paths = [];

    // application/extension packages
    paths.push(getPath('/%%Program.SeaPath%%'));

    // all narwhal system packages
    paths.push(system.prefix);
    
    // load packages from paths
    require('packages').load(paths);

    // fix loader paths that were trashed when loading packages
    loader.paths.unshift(narwhal.system.prefixes[1] + "/lib");
    loader.paths.unshift(narwhal.system.prefixes[1] + "/engines/default/lib");
    loader.paths.unshift(narwhal.system.prefixes[0] + "/lib");
    
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
