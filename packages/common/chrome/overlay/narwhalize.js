/**
 * Called to inject the already initialized narwhal system into a window
 */
(function() {

    // -----------------------------------
    // fetch global narwhal for app
    // -----------------------------------

    var sandbox = {};
    Components.utils.import('resource://narwhal-xulrunner/sandbox.js', sandbox);

    dump("[narwhalrunner][chrome/overlay/narwhalize] GET SANDBOX" + "\n");

    var self = this;
    
    var initializedProgram;

    var callbacks = [];

    self.onNarwhalized = function(callback) {
        if(initializedProgram) {
            callback();
        } else {
            callbacks.push(callback);
        }
    }

    var program = sandbox.get({
        "type": "__Program.Type__",
        "id": "__Program.ID__"
    }, function(program) {
        
        dump("[narwhalrunner][chrome/overlay/narwhalize] GOT SANDBOX" + "\n");

        self.require = program.require;
        self.system = program.system;

        initializedProgram = program;

        if(callbacks.length>0) {
            for( var i=0 ; i<callbacks.length ; i++ ) {
                dump("[narwhalrunner][chrome/overlay/narwhalize] trigger callback" + "\n");
                callbacks[i]();
            }
            callbacks = [];
        }
    });

})();