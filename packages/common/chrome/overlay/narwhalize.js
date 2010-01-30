/**
 * Called to inject the already initialized narwhal system into a window
 */
(function() {
    
    // -----------------------------------
    // fetch global narwhal for app
    // -----------------------------------
    
    var sandbox = {};
    Components.utils.import('resource://narwhal-xulrunner/sandbox.js', sandbox);

    var program = sandbox.get({
        "type": "__Program.Type__",
        "id": "__Program.ID__"
    });
    
    this.require = program.require;
    this.system = program.system;
    
})();