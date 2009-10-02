/**
 * Called to inject the already initialized narwhal system into a window
 */
(function() {
    
    // -----------------------------------
    // fetch global narwhal for app
    // -----------------------------------
    
    var narwhal = {}
    Components.utils.import("resource://%%InternalName%%-narwhalrunner/modules/app.jsm", narwhal);
    
    this.require = narwhal.require;
    
})();