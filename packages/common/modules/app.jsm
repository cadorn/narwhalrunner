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

    var UTIL = require("util");
    var FILE = require("file");
    var SANDBOX = require("sandbox");
    var LOADER = require("loader");
    var Loader = LOADER.Loader;
    var Sandbox = SANDBOX.Sandbox;
    
    
    var system = UTIL.copy(narwhal.system);
    //system.engines = UTIL.copy(system.engines);

    
    var loader = Loader({"paths": UTIL.copy(require.paths)});
    var sandbox = Sandbox({
        "loader": loader,
        "system": system,
        "modules": {
            "system": system
        }
    });
    
    sandbox.force("system").env["SEA"] = getPath('/');
    sandbox("global");
    
    // everything goes through the sandbox from now on
    require = function(id, pkg) {
        return sandbox(id, null, false, false, pkg);
    }


    // -----------------------------------
    // load packages into sandbox
    // -----------------------------------
    
    // Add our extension and user packages to the sandbox
    
    var paths = [];
    
    // First locate user-installed packages
//    paths.push(getFile('/user').path);

    // Then application/extension packages
    var prefix = getPath('/');
    paths.push(prefix);

    // Finally all narwhal system packages
    paths.push(system.prefix);

    require('packages').load(paths);



    function getPath(path) {
        if("%%Type%%"=="extension") {
            var em = Cc["@mozilla.org/extensions/manager;1"].getService(Ci.nsIExtensionManager);
            return em.getInstallLocation("%%ID%%").getItemFile("%%ID%%", path).path;
        } else {
            var ResourceHandler = Cc['@mozilla.org/network/protocol;1?name=resource'].getService(Ci.nsIResProtocolHandler);
            var IOService = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService)
            var FileService = IOService.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler);
            return FileService.getFileFromURLSpec(ResourceHandler.resolveURI(IOService.newURI("resource:"+path, null, null))).path;
        }
    }
 