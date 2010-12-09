
var OBSERVABLE = require("observable", "observable");



var TabWatcher = exports.TabWatcher = function(chrome) {
    if (!(this instanceof exports.TabWatcher)) {
        return new exports.TabWatcher(chrome);
    }
    this.chrome = chrome;
    
    var self = this;
    self._TabCloseListener = function() {
        self.TabCloseListener.apply(self, arguments);
    }
    self._PageLoadListener = function() {
        self.PageLoadListener.apply(self, arguments);
    }
    self._TabSelectListener = function() {
        self.TabSelectListener.apply(self, arguments);
    }

    OBSERVABLE.mixin(self);
    
    this.selectedUrl = false;
}

TabWatcher.prototype.attach = function() {    
    this.chrome.getBrowser().addEventListener("load", this._PageLoadListener, true);
    this.chrome.getBrowser().tabContainer.addEventListener("TabClose", this._TabCloseListener, false);
    this.chrome.getBrowser().tabContainer.addEventListener("TabSelect", this._TabSelectListener, false);
}

TabWatcher.prototype.unattach = function() {
    this.chrome.getBrowser().tabContainer.removeEventListener("TabSelect", this._TabSelectListener, false);
    this.chrome.getBrowser().tabContainer.removeEventListener("TabClose", this._TabCloseListener, false);
    this.chrome.getBrowser().removeEventListener("load", this._PageLoadListener, true);  
}

TabWatcher.prototype.TabCloseListener = function(event) {

    var browser = this.chrome.getBrowser().getBrowserForTab(event.target),
        hostPort = browser.currentURI.hostPort;

    // check if the same hostPort is still present in any other tab
    var browsers = this.chrome.getBrowser().browsers;
    for (var i = 0; i < browsers.length; i++) {
        if(browsers[i]!==browser && browsers[i].currentURI.hostPort==hostPort) {
            return;
        }
    }

    // the hostPort is no longer open in any tab
    this.publish("noMoreHostPort", event.target, browser);
}

TabWatcher.prototype.TabSelectListener = function(event) {
    this.notifyPossibleActiveUrlChanged(this.chrome.getBrowser().getBrowserForTab(event.target));
}

TabWatcher.prototype.PageLoadListener = function(event) {
    if (event.originalTarget instanceof this.chrome.getGlobal().HTMLDocument) {  
        if (event.originalTarget.defaultView.frameElement) {
            return;
        }
        this.notifyPossibleActiveUrlChanged(this.chrome.getBrowser().getBrowserForDocument(event.originalTarget.defaultView.top.document));
    }
}

TabWatcher.prototype.notifyPossibleActiveUrlChanged = function(browser) {
    try {
        var tab = this.chrome.getBrowser().tabContainer.getItemAtIndex(this.chrome.getBrowser().getBrowserIndexForDocument(browser.contentDocument));

        // if tab is not currently selected we ignore the event (it will fire again when the tab is selected)
        if(tab!=this.chrome.getBrowser().selectedTab) {
            return;
        }

        // check if URL has changed
        if(browser.currentURI.spec==this.selectedUrl) {
            return;
        }
        this.selectedUrl = browser.currentURI.spec;
        
        // the active URL has changed either by selecting a different tab or loading a different URL in the current tab
        this.publish("activeUrlChanged", tab, browser);

    } catch(e) {
        system.log.error(e);
    }
}

