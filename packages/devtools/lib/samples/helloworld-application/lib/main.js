
var CHROME = require("chrome", "nr-common");
var APP = require("app", "nr-common");


exports.main = function(args) {
    
    print("hello world from MAIN for test app!");    

    CHROME.getConsoleService().logStringMessage("hello world from MAIN for test app!");

    CHROME.getWindow().open("narwhalrunner://"+APP.getApp().getInternalName()+"/"+APP.getApp().getPackageName()+"/content/mainWindow.xul",
                            "main",
                            "chrome,left=200,top=200");
        
    // notify NarwhalRunner that application is loaded    
    APP.getApp().started();

}
