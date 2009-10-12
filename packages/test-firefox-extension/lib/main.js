
var CHROME = require("chrome", "common");
var APP = require("app", "common");

exports.main = function(args) {
    
    print("hello world from MAIN for test extension!");    

    var browser = CHROME.getBrowser();
    
    browser.addTab("narwhalrunner://"+APP.getApp().getInternalName()+"/"+APP.getApp().getPackageName()+"/content/test.xul");
    browser.mTabContainer.advanceSelectedTab(1, true);

    // notify NarwhalRunner that extension is loaded    
    APP.getApp().started();
    
}
