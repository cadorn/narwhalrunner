
var CHROME = require("common/chrome");
var APP = require("common/app");

exports.main = function(args) {
    
    print("hello world from MAIN for test extension!");    

    var browser = CHROME.getBrowser();
    
    browser.addTab("narwhalrunner://narwhalrunner-test-firefox-extension/test-firefox-extension/content/test.xul");
    browser.mTabContainer.advanceSelectedTab(1, true);

    // notify NarwhalRunner that extension is loaded    
    APP.getApp().started();
    
}
