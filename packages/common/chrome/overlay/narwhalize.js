/**
 * Called to inject the already initialized narwhal system into a window
 */
(function() {
    
    // -----------------------------------
    // fetch global narwhal for app
    // -----------------------------------
    
    var narwhal = {}
    Components.utils.import("__Program.AppModuleURL__", narwhal);
    
    this.require = narwhal.require;
    
})();