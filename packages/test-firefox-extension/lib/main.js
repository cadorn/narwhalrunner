
var APP = require("app", "nr-common").getApp();

exports.main = function(args) {
    
    print("hello world from MAIN for test extension!");    
    
    var browser = APP.getChrome().getBrowser();
    
    browser.addTab(APP.getContentBaseUrl() + "test.xul");
    browser.mTabContainer.advanceSelectedTab(1, true);

    // notify NarwhalRunner that extension is loaded    
    APP.started();
    
}
