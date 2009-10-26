
var CHROME = require("./chrome");

exports.reloadPage = function()
{
    CHROME.getBrowser().selectedBrowser.reload();
}

exports.getTabBrowserContentDimensions = function()
{
    var box = CHROME.getBrowser().selectedBrowser.boxObject;
    return {x:box.x, y: box.y, width: box.width, height: box.height};
}
