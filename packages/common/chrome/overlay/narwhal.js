/**
 * Called to initialize the narwhal system
 */
(function() {
    
    // -----------------------------------
    // initialize global narwhal for app
    // -----------------------------------
    
    var narwhal = {}
    Components.utils.import("__Program.AppModuleURL__", narwhal);
     

    // -----------------------------------
    // initialize narwhalrunner utilities
    // -----------------------------------

    var CHROME = narwhal.require("chrome", "__module[package]__");    
    var APP = narwhal.require("app", "__module[package]__");
    
    var chrome = CHROME.Chrome(this);
    
    APP.initializeApp("__Program.ProgramPackage.Id__", chrome).start("__Program.Type__", window, {});
    
})();
