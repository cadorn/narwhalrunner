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
    
    // TODO: use require("...", "common") once implemented in narwhal

    var FILE = narwhal.require("file");
    var CHROME = narwhal.require("common/chrome");
    var APP = narwhal.require("common/app");

    CHROME.set(this);
    
    APP.initializeApp(FILE.Path(narwhal.prefix)).start("%%Type%%", window, {});
    
})();

