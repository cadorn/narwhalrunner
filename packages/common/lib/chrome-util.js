
var CHROME = require("./chrome");

exports.getWindow = function() {
    return CHROME.getWindow();
}

exports.getBrowser = function() {
    return CHROME.getBrowser();
}

exports.reloadPage = function() {
    CHROME.getBrowser().selectedBrowser.reload();
}


exports.openNewTab = function(url, postText) {
    if (!url) return;
    var postData = null;
    if (postText) {
        var stringStream = getInputStreamFromString(postText);
        postData = Cc["@mozilla.org/network/mime-input-stream;1"].createInstance(Ci.nsIMIMEInputStream);
        postData.addHeader("Content-Type", "application/x-www-form-urlencoded");
        postData.addContentLength = true;
        postData.setData(stringStream);
    }
    var gBrowser = exports.getBrowser();
    gBrowser.selectedTab = gBrowser.addTab(url, null, null, postData);
};




function getInputStreamFromString(dataString) {
    var stringStream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
    if ("data" in stringStream) {// Gecko 1.9 or newer
        stringStream.data = dataString;
    } else {// 1.8 or older
        stringStream.setData(dataString, dataString.length);
    }
    return stringStream;
};