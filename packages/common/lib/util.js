
/**
 * Default from narwhal/util
 */

var util = require("util");

for( var n in util ) {
    exports[n] = util[n];
}


/**
 * Object
 */

exports.object.extend = function(l, r)
{
    var newOb = {};
    for (var n in l)
        newOb[n] = l[n];
    for (var n in r)
        newOb[n] = r[n];
    return newOb;
}


/**
 * Array
 */

exports.array.removeItem = function(list, item)
{
    for (var i = 0; i < list.length; ++i)
    {
        if (list[i] == item)
        {
            list.splice(i, 1);
            break;
        }
    }
};

exports.array.hasItem = function(list, item)
{
    for (var i = 0; i < list.length; ++i)
    {
        if (list[i] == item)
        {
            return true;
        }
    }
    return false;
};


/**
 * DOM
 */

exports.dom = {};

exports.dom.hasClass = function(node, name) // className, className, ...
{
    if (!node || node.nodeType != 1)
        return false;
    else
    {
        for (var i=1; i<arguments.length; ++i)
        {
            var name = arguments[i];
            var re = new RegExp("(^|\\s)"+name+"($|\\s)");
            if (!re.exec(node.getAttribute("class")))
                return false;
        }

        return true;
    }
};

exports.dom.setClass = function(node, name)
{
    if (node && !exports.dom.hasClass(node, name))
        node.className += " " + name;
};

exports.dom.removeClass = function(node, name)
{
    if (node && node.className)
    {
        var index = node.className.indexOf(name);
        if (index >= 0)
        {
            var size = name.length;
            node.className = node.className.substr(0,index-1) + node.className.substr(index+size);
        }
    }
};


/**
 * Prototypes
 */

exports.prototypes = {};

exports.prototypes.Listener = function() {}
exports.prototypes.Listener.prototype =
{
    addListener: function(listener)
    {
        if (!this._listeners) {
            this._listeners = []; 
        }
        this._listeners.push(listener);
    },
    removeListener: function(listener)
    {
        exports.array.removeItem(this._listeners, listener);
    },
    
    dispatch: function(event, arguments)
    {
        for( var i in this._listeners ) {
            if (this._listeners[i][event]) {
                this._listeners[i][event].apply(this._listeners[i], arguments);
            }
        }
    }
};

