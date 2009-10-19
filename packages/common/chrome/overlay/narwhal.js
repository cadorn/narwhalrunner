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

    var FILE = narwhal.require("file");
    var CHROME = narwhal.require("chrome", "__module[package]__");    
    var APP = narwhal.require("app", "__module[package]__");

    CHROME.set(this);
    
    APP.initializeApp("__Program.ProgramPackage.Id__").start("__Program.Type__", window, {});
    
})();

