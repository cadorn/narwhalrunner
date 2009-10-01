(function() {
    
    var chrome = this;

    const Cc = Components.classes;
    const Ci = Components.interfaces;
    const em = Cc["@mozilla.org/extensions/manager;1"].getService(Ci.nsIExtensionManager);
    
    
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
    var Loader = SANDBOX.Loader;
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
    
    sandbox.force("system");
    sandbox("global");
    
    // everything goes through the sandbox from now on
    require = sandbox;


    // -----------------------------------
    // load packages into sandbox
    // -----------------------------------
    
    // Add our extension and user packages to the sandbox
    
    var paths = [];
    
    // First locate user-installed packages
//    paths.push(getFile('/user').path);

    // Then application/extension packages
    paths.push(getPath('/'));

    // Finally all narwhal system packages
    paths.push(system.prefix);

    require('packages').load(paths);
    


    // -----------------------------------
    // initialize narwhalrunner utilities
    // -----------------------------------
    
    // TODO: use require("...", "common") once implemented in narwhal

    require("common/chrome").set(chrome);
    
    var app = require("common/app").initializeApp(FILE.Path(getPath('/')));
    
//    require("common/protocol-handler").registerForApp(app);




    function getPath(path) {
        return em.getInstallLocation("%%ID%%").getItemFile("%%ID%%", path).path;
    }

})();

