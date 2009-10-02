/**
 * Called to initialize the narwhal system
 */
(function() {
    
    // -----------------------------------
    // initialize global narwhal for app
    // -----------------------------------
    
    var narwhal = {}
    Components.utils.import("resource://%%InternalName%%-narwhalrunner/modules/app.jsm", narwhal);
     

    // -----------------------------------
    // initialize narwhalrunner utilities
    // -----------------------------------

    var FILE = narwhal.require("file");
    var CHROME = narwhal.require("chrome", "common");    
    var APP = narwhal.require("app", "common");

    CHROME.set(this);
    
    APP.initializeApp(FILE.Path(narwhal.prefix)).start("%%Type%%", window, {});
    
})();

