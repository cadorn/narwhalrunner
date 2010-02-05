
var APP = require("app", "common");

exports.main = function(args) {
    
    print("hello world from MAIN for test app!");    

    APP.getChrome().getConsoleService().logStringMessage("hello world from MAIN for test app!");

    APP.getChrome().getWindow().open(APP.getApp().getContentBaseUrl()+"test.xul",
                            "main",
                            "chrome,left=200,top=200");
        
    // notify NarwhalRunner that application is loaded    
    APP.getApp().started();

}

