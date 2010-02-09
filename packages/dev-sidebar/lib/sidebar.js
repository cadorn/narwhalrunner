

function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var CONSOLE_SERVICE = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);

var APP = require("app", "nr-common").getApp();
var UTIL = require("util");

var Sidebar;

exports.Sidebar = function () {
    
    // singleton
    if(Sidebar) {
        return Sidebar;
    }

    // PRIVATE

    var testActions = [];


    Sidebar = {};
    
    
    // PUBLIC

    Sidebar.getTestActions = function() {
        return testActions;
    }

    Sidebar.addTestAction = function(label, callback) {
        testActions.push([label, callback]);
        buildUI();
    }

    Sidebar.logMessage = function(message) {
        var ui = APP.getChrome().getContainer(module["package"], "Sidebar");
        if(!ui) return false;
        return ui.logMessage(message);
    }
    
    
    function logError(info) {
        Sidebar.logMessage(JSON.encode({
            "type": "error",
            "data": info
        }, null, "  "));
    }


    // attach listener no narwhal logger
    var loggerListener = {
        "onError": function(error) {
            if(error instanceof Error) {
                logError({
                    "message": error.message || null,
                    "file": error.fileName || null,
                    "line": error.lineNumber || null,
                    "stackString": error.stack || null
                });
            } else {
                logError({
                    "message": error || null
                });
            }
        }
    };
    system.log.addListener(loggerListener);
    
    
    
    // attach listener to console service
    var consoleListener =
    {
        observe: function(message) {
            try {
                
                var message = (""+message.message),
                    m;
                
                //"[JavaScript Error: \"oops 2!!!\" {file: \"...\" line: 41}]"
                if(m = message.match(/^\[JavaScript Error: "(.*?)" \{(.*)}\]$/)) {
                    var error = {
                        "message": m[1]
                    }
                    if(m[2]) {  // < not sure if needed
                        if(m = m[2].match(/^file: "(.*)" line: (\d*)$/)) {
                            error.file = m[1];
                            error.line = m[2];
                        }
                    }
                    logError(error);
                }
            } catch(e) {
                // silent
            }
        },
        QueryInterface: function (iid) {
            if (!iid.equals(Ci.nsIConsoleListener) && !iid.equals(Ci.nsISupports)) {
                throw Components.results.NS_ERROR_NO_INTERFACE;
            }
            return this;
        }
    };
    CONSOLE_SERVICE.registerListener(consoleListener);



    return Sidebar;

    
    // PRIVATE
    
    function buildUI() {
        var ui = APP.getChrome().getContainer(module["package"], "Sidebar");
        if(ui) {
            ui.buildUI();
        }
    }
}