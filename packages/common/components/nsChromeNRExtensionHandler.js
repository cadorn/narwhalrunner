/*----------------------------------------------------------------------
 * nsChromeExtensionHandler
 * By Ed Anuff <ed@anuff.com>
 *
 * Last modified: 04/13/2005 15:49 PST
 *
 * DESCRIPTION:
 *
 * This component implements an extension mechanism to the chrome
 * protocol handler for mapping in dynamically generated content
 * into chrome URIs.  This content will have the same system
 * permissions as regular chrome content, making it possible to
 * create scripts which programmatically generate XUL pages and
 * stylesheets.  Remote chrome can also be implemented.
 *
 * This protocol handler could be installed with the same
 * contract ID as the chrome protocol handler so that all chrome
 * requests pass through it, but it has not been sufficiently tested
 * for that to be recommended.
 *
 *
 * EXAMPLE USAGE:
 *
 * To register an extension, use code like the following within privileged
 * Javascript running in your chrome:
 *
 *   var my_extension = {
 *
 *    pkg : "myext",
 *
 *    path : "myext.xul",
 *
 *    newChannel : function(uri) {
 *
 *      var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService();
 *      ioService = ioService.QueryInterface(Components.interfaces.nsIIOService);
 *
 *      var uri_str = "data:,My%20extension%20content";
 *
 *      var ext_uri = ioService.newURI(uri_str, null, null);
 *      var ext_channel = ioService.newChannelFromURI(ext_uri);
 *
 *      return ext_channel;
 *
 *    }  
 *  };
 *
 *  var chrome_ext = Components.classes["@mozilla.org/network/protocol;1?name=xchrome"].getService();
 *  chrome_ext.wrappedJSObject.registerExtension(my_extension);
 *
 * The above example will register an extension at the following URL:
 *
 *  xchrome://myext/content/ext/myext.xul
 *
 *
 * For many extensions, using data: URLs to pass content back through
 * the ChromeExtensionHandler is the easiest mechanism.  See the following page
 * for more information on constructing data: URLs:
 *
 *  http://www.mozilla.org/quality/networking/testing/datatests.html
 *
 *
 * Protocol handler code based on techniques from:
 *
 *  http://www.nexgenmedia.net/docs/protocol/
 *  http://simile.mit.edu/piggy-bank/
 *
 *----------------------------------------------------------------------
 */

/*----------------------------------------------------------------------
 * The ChromeExtension Module
 *----------------------------------------------------------------------
 */

// Custom protocol related
const kSCHEME = "narwhalrunner";
const kPROTOCOL_CID = Components.ID("{DA473A57-6AC8-4706-9B06-DA454C12028F}");
const kPROTOCOL_CONTRACTID = "@mozilla.org/network/protocol;1?name=" + kSCHEME;
const kPROTOCOL_NAME = "Chrome Extension Protocol for NarwhalRunner";

// Dummy chrome URL used to obtain a valid chrome channel
// This one was chosen at random and should be able to be substituted
// for any other well known chrome URL in the browser installation
//const kDUMMY_CHROME_URL = "chrome://mozapps/content/xpinstall/xpinstallConfirm.xul";
const kDUMMY_CHROME_URL = "chrome://global/content/console.xul";

// Mozilla defined
const kCHROMEHANDLER_CID_STR = "{61ba33c0-3031-11d3-8cd0-0060b0fc14a3}";
const kCONSOLESERVICE_CONTRACTID = "@mozilla.org/consoleservice;1";
const kIOSERVICE_CID_STR = "{9ac9e770-18bc-11d3-9337-00104ba0fd40}";
const kIOSERVICE_CONTRACTID = "@mozilla.org/network/io-service;1";
const kNS_BINDING_ABORTED = 0x804b0002;
const kSIMPLEURI_CONTRACTID = "@mozilla.org/network/simple-uri;1";
const kSTANDARDURL_CONTRACTID = "@mozilla.org/network/standard-url;1";
const kURLTYPE_STANDARD = 1;
const nsIComponentRegistrar = Components.interfaces.nsIComponentRegistrar;
const nsIConsoleService = Components.interfaces.nsIConsoleService;
const nsIFactory = Components.interfaces.nsIFactory;
const nsIIOService = Components.interfaces.nsIIOService;
const nsIProtocolHandler = Components.interfaces.nsIProtocolHandler;
const nsIRequest = Components.interfaces.nsIRequest;
const nsIStandardURL = Components.interfaces.nsIStandardURL;
const nsISupports = Components.interfaces.nsISupports;
const nsIURI = Components.interfaces.nsIURI;

var tracingEnabled = false;

function trace(msg) {
  if (tracingEnabled) {
    Components.classes[kCONSOLESERVICE_CONTRACTID].getService(nsIConsoleService).logStringMessage(msg);
  }
};

var ChromeExtensionModule = {
  
  /* CID for this class */
  cid: kPROTOCOL_CID,

  /* Contract ID for this class */
  contractId: kPROTOCOL_CONTRACTID,

  registerSelf : function(compMgr, fileSpec, location, type) {
    compMgr = compMgr.QueryInterface(nsIComponentRegistrar);
    compMgr.registerFactoryLocation(
      kPROTOCOL_CID, 
      kPROTOCOL_NAME, 
      kPROTOCOL_CONTRACTID, 
      fileSpec, 
      location,
      type
    );
  },
  
  getClassObject : function(compMgr, cid, iid) {
    if (!cid.equals(kPROTOCOL_CID)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    if (!iid.equals(nsIFactory)) {
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    }
    return this.myFactory;
  },
  
  canUnload : function(compMgr) {
    return true;
  },
  
  myFactory : {
    createInstance : function(outer, iid) {
      if (outer != null) {
        throw Components.results.NS_ERROR_NO_AGGREGATION;
      }
                        
      return new ChromeExtensionHandler().QueryInterface(iid);
    }
  }
};

function NSGetModule(compMgr, fileSpec) {
    return ChromeExtensionModule;
}

/*----------------------------------------------------------------------
 * The ChromeExtension Handler
 *----------------------------------------------------------------------
 */

function ChromeExtensionHandler() {
  trace("[ChromeExtensionHandler.<init>]");
  
  this.wrappedJSObject = this;
  
  this._system_principal = null;
  
  this._extensions = new Object();

/*  
  var TestExt = {
    pkg : "test",
    
    path : "test.xul",
    
    newChannel : function(uri) {
    
      var ioService = Components.classesByID[kIOSERVICE_CID_STR].getService();
      ioService = ioService.QueryInterface(nsIIOService);

      var uri_str = "data:,ChromeExtension%20test%20content";
      
      var ext_uri = ioService.newURI(uri_str, null, null);
      var ext_channel = ioService.newChannelFromURI(ext_uri);
      
      return ext_channel;
      
    }  
  };
  
  var TestExtSpec = kSCHEME + "://" + TestExt.pkg + "/content/" + TestExt;
//  var TestExtSpec = kSCHEME + "://" + TestExt.pkg + "/content/" + TestExt.path;
  TestExtSpec = TestExtSpec.toLowerCase();

  this._extensions[TestExtSpec] = TestExt;
*/  
}

ChromeExtensionHandler.prototype = {

  scheme: kSCHEME,
  
  defaultPort : -1,
  
  protocolFlags : nsIProtocolHandler.URI_DANGEROUS_TO_LOAD,
  
  registerExtension : function(ext) {
    
//    var ext_spec = kSCHEME + "://" + ext.pkg + "/content/" + ext.path;
    var ext_spec = kSCHEME + "://" + ext.internalAppName + "/";
    ext_spec = ext_spec.toLowerCase();
    
    trace("[ChromeExtensionHandler.registerExtension] " + ext_spec);

    if (this._extensions[ext_spec] != null) {
      trace("[ChromeExtensionHandler.registerExtension] failed - extension already registered: " + ext_spec);
    }
    else {
      this._extensions[ext_spec] = ext;
      trace("[ChromeExtensionHandler.registerExtension] extension registered: " + ext_spec);
    }
  },
  
  allowPort : function(port, scheme) {
    trace("[ChromeExtensionHandler.allowPort]");
    
    return false;
  },
  
  newURI : function(spec, charset, baseURI) {
    trace("[ChromeExtensionHandler.newURI] " + spec);
      
    var new_url = Components.classes[kSTANDARDURL_CONTRACTID].createInstance(nsIStandardURL);
    new_url.init(kURLTYPE_STANDARD, -1, spec, charset, baseURI);    
    
    var new_uri = new_url.QueryInterface(nsIURI);
    return new_uri;
  },
  
  newChannel : function(uri) {
    trace("[ChromeExtensionHandler.newChannel] new channel requested for: " + uri.spec);

    var chrome_service = Components.classesByID[kCHROMEHANDLER_CID_STR].getService();
    chrome_service = chrome_service.QueryInterface(nsIProtocolHandler);

    var new_channel = null;
    
    try {
      var uri_string = uri.spec.toLowerCase();

      for (ext_spec in this._extensions) {
        var ext = this._extensions[ext_spec];
        
        if (uri_string.indexOf(ext_spec) == 0) {

          trace("[ChromeExtensionHandler.newChannel] matched to registered extension: " + ext_spec);

          if (this._system_principal == null) {
            trace("[ChromeExtensionHandler.newChannel] no system principal cached");

            var ioService = Components.classesByID[kIOSERVICE_CID_STR].getService();
            ioService = ioService.QueryInterface(nsIIOService);

            var chrome_uri_str = kDUMMY_CHROME_URL;

            trace("[ChromeExtensionHandler.newChannel] spoofing chrome channel to URL: " + chrome_uri_str);
            
            var chrome_uri = chrome_service.newURI(chrome_uri_str, null, null);
            var chrome_channel = chrome_service.newChannel(chrome_uri);

            trace("[ChromeExtensionHandler.newChannel] retrieving system principal from chrome channel");
            
            this._system_principal = chrome_channel.owner;

            var chrome_request = chrome_channel.QueryInterface(nsIRequest);
            chrome_request.cancel(kNS_BINDING_ABORTED);
            
            trace("[ChromeExtensionHandler.newChannel] system principal is cached");
            
          }

          trace("[ChromeExtensionHandler.newChannel] retrieving extension channel for: " + ext_spec);
          
          var ext_channel = this.processRequest(ext, uri); //ext.newChannel(uri);

          if (this._system_principal != null) {
            trace("[ChromeExtensionHandler.newChannel] applying cached system principal to extension channel");
            
            ext_channel.owner = this._system_principal;
          }
          else {
            trace("[ChromeExtensionHandler.newChannel] no cached system principal to apply to extension channel");
          }

          ext_channel.originalURI = uri;

          trace("[ChromeExtensionHandler.newChannel] returning extension channel for: " + ext_spec);
          
          return ext_channel;

        }

      }
    
      trace("[ChromeExtensionHandler.newChannel] passing request through to ChromeProtocolHandler::newChannel");
      trace("[ChromeExtensionHandler.newChannel] requested uri = " + uri.spec);
      
      if (uri_string.indexOf("chrome") != 0) {
        uri_string = uri.spec;
        uri_string = "chrome" + uri_string.substring(uri_string.indexOf(":"));
        
        trace("[ChromeExtensionHandler.newChannel] requested uri fixed = " + uri_string);
        
        uri = chrome_service.newURI(uri_string, null, null);
        
        trace("[ChromeExtensionHandler.newChannel] requested uri canonified = " + uri.spec);
        
      }
      
      new_channel = chrome_service.newChannel(uri);
      
    } catch (e) {
      trace("[ChromeExtensionHandler.newChannel] error - NS_ERROR_FAILURE");
      
      throw Components.results.NS_ERROR_FAILURE;
    }
    
    return new_channel;
  },
  
  processRequest: function(handler, uri) {

    var env = {};
        
    env["REQUEST_METHOD"] = "GET";
    env["REQUEST_URI"] = uri.spec.substr(uri.prePath.length);
    env["SERVER_PROTOCOL"] = "HTTP/1.1";
    env["HTTP_HOST"] = uri.host;
    env["SERVER_NAME"] = uri.host;
    env["SERVER_PORT"] = "";
    
    var parts = this.regExec(/([^?]+)\??(.*)/i,env["REQUEST_URI"]);
    env["PATH_INFO"] = parts[1];
    env["QUERY_STRING"] = parts[2] || "";
    env["SCRIPT_NAME"] = "";

    env["jack.version"] = [0,1];
    env["jack.input"] = null; // FIXME
    env["jack.errors"] = null;  //FIXME
    env["jack.multithread"] = false;
    env["jack.multiprocess"] = true;
    env["jack.run_once"] = false;
    env["jack.url_scheme"] = "http"; // FIXME

    // call the app
    var result = null;
    
    try
    {
        result = handler.app(env);
    }
    catch(e)
    {
        trace(e);

        result = {
            status: 500,
            headers: {"Content-Type":"text/plain"},
            body: ["Internal Server Error", "</br>", e]
        }
    }

    var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService();
    ioService = ioService.QueryInterface(Components.interfaces.nsIIOService);
        
    var uri_str = "data:",
        contentType;
    
    for( var name in result.headers ) {
        if(name.toLowerCase()=="content-type") {
            contentType = result.headers[name];
        }
    }
    
    if(!contentType) {
        contentType = "text/plain";
    }
    
    uri_str += contentType + ";base64,";
    
    var chunk;
    for( var i=0 ; i<result.body.length ; i++ ) {
        chunk = result.body[i];
        if(chunk["decodeToString"]) {
            uri_str += chunk.decodeToString('utf-8');
        } else {
            uri_str += chunk;
        }
    };

    var ext_uri = ioService.newURI(uri_str, null, null);
    var ext_channel = ioService.newChannelFromURI(ext_uri);

    return ext_channel;
  },
  
  regExec: function(expr, subject)
  {
    /**
     * NOTE: We are calling exec() on expr twice as it predictably fails on every second call
     */
    var parts = expr.exec(subject);
    if(parts) {
        return parts;
    }
    return expr.exec(subject);
  },
  
  QueryInterface : function(iid) {
    trace("[ChromeExtensionHandler.QueryInterface]");

    if (!iid.equals(Components.interfaces.nsIProtocolHandler) &&
      !iid.equals(Components.interfaces.nsISupports)) {
      
      trace("[ChromeExtensionHandler.QueryInterface] error - NS_ERROR_NO_INTERFACE " + iid);
      
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    return this;
  }
};
