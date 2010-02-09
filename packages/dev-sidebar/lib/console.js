
var SIDEBAR = require("./sidebar").Sidebar();


exports.isEnabled = function()
{
    return true;
}

exports.action = function(label, callback)
{
    return SIDEBAR.addTestAction(label, callback);
}

exports.log = function(log)
{
    return SIDEBAR.logMessage(log);
}
