/**
 * Called to initialize the narwhal system
 */
(function() {

    try {
        // -----------------------------------
        // initialize global narwhal for app
        // -----------------------------------
        
        var self = this;

        var sandbox = {};

        Components.utils.import('resource://narwhal-xulrunner/sandbox.js', sandbox);

dump("[narwhalrunner][chrome/overlay/narwhal] get sandbox" + "\n");

        sandbox.get({
            "type": "__Program.Type__",
            "id": "__Program.ID__"
        }, function(program) {

dump("[narwhalrunner][chrome/overlay/narwhal] init program" + "\n");

            // -----------------------------------
            // initialize narwhalrunner utilities
            // -----------------------------------
            try {

                var CHROME = program.require("chrome", "__module[package]__");    
                var APP = program.require("app", "__module[package]__");

                var chrome = CHROME.Chrome(self);

dump("[narwhalrunner][chrome/overlay/narwhal] init app" + "\n");

                APP.initializeApp("__Program.ProgramPackage.Id__", chrome).start("__Program.Type__", window, {}, program);

dump("[narwhalrunner][chrome/overlay/narwhal] done init app" + "\n");

            } catch(e) {
                program.system.log.error(e);
            }
        });

    } catch(e) {
        var notificationBox = this.getBrowser().getNotificationBox();
        // NOTE: Timeout is needed otherwise the styling of the notification box is missing (as chrome has not finished initializing?)
        setTimeout(function() {
            notificationBox.appendNotification(
                "Error initializing __Program.Name__ Extension. Narwhal for XULRunner Extension not installed or enabled!",
                "narwhal-not-installed",
                null,
                notificationBox.PRIORITY_CRITICAL_HIGH,
                []
            );
        }, 5000);
    }
    
})();
