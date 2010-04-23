/**
 * Called to initialize the narwhal system
 */
(function() {
    
    // -----------------------------------
    // initialize global narwhal for app
    // -----------------------------------

    var sandbox = {};
    Components.utils.import('resource://narwhal-xulrunner/sandbox.js', sandbox);

    var program = sandbox.get({
        "type": "__Program.Type__",
        "id": "__Program.ID__"
    });
     

    // -----------------------------------
    // initialize narwhalrunner utilities
    // -----------------------------------

    var CHROME = program.require("chrome", "__module[package]__");    
    var APP = program.require("app", "__module[package]__");
    
    var chrome = CHROME.Chrome(this);
    
    try {

        APP.initializeApp("__Program.ProgramPackage.Id__", chrome).start("__Program.Type__", window, {}, program);

    } catch(e) {
        program.system.log.error(e);
    }

})();
