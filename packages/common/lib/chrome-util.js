
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
