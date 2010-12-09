
NarwhalRunner
=============

NarwhalRunner is a toolkit for building [XULRunner](https://developer.mozilla.org/en/XULRunner)
applications and extensions with [Narwhal](http://narwhaljs.org/).


Setup
=====

Requirements
------------

  * [Firefox 3.5+](http://www.mozilla.com/en-US/firefox/)
  * [PINF](http://github.com/cadorn/pinf) *(NOTE: There is no release for PINF yet. Will be coming very soon.)*.

You are on:

   * **Mac OS X**  - *fully tested*
   * UNIX - *should be working*
   * Windows - not tested, PINF will only work on windows OSs that support symlinks

Instructions
------------

Checkout the narwhalrunner workspace and switch to it:

    pinf checkout-workspace -s github.com/cadorn/narwhalrunner
    
Add firefox binary

    nr add-bin /Applications/Firefox.app/Contents/MacOS/firefox-bin

Create test profile

    nr create-profile --dev test
    nr populate-profile test


Demo: test-firefox-extension
----------------------------

Add test extension to profile

    nr add-extension -l --profile test packages/test-firefox-extension

Launch test profile

    nr launch --dev --profile test


Demo: test-application
----------------------------

Build the test application

    pinf build-program packages/test-application

Launch the test application

    nr launch --dev --program packages/test-application


Examples
--------

You can find more sample applications and extensions in the [narwhalrunner-examples](http://github.com/cadorn/narwhalrunner-examples) project.    


Preferences
===========

    extensions.XXX.NR_forceReloadDynamicProtocolResources: [true|false]



Links
=====

  * Tips
    * [Faster JS with TraceMonkey](http://ejohn.org/blog/tracemonkey/)
    * [Five wrong reasons to use eval() in an extension](http://adblockplus.org/blog/five-wrong-reasons-to-use-eval-in-an-extension)
  * Reference
    * [Online Book: Rapid Application Development with Mozilla!](http://mb.eschew.org/)
    * [W3C: XML Binding Language (XBL) 2.0](http://www.w3.org/TR/xbl/)
    * [MDC: XUL Tutorial](https://developer.mozilla.org/en/XUL_Tutorial)
    * [MDC: XBL](https://developer.mozilla.org/en/XBL)
    * [MSDN: Naming Files, Paths, and Namespaces](http://msdn.microsoft.com/en-us/library/aa365247%28VS.85%29.aspx)
    * [MDC: Extension Versioning, Update and Compatibility](https://developer.mozilla.org/en/Extension_Versioning,_Update_and_Compatibility)
    * [MDC: Toolkit version format](https://developer.mozilla.org/en/Toolkit_version_format)
    * [MDC: Multiple Item Package](https://developer.mozilla.org/en/Multiple_Item_Packaging)
    * [MDC: Extension Dependencies](https://wiki.mozilla.org/Extension_Dependencies)
    * [Semantic Versioning](http://semver.org/)
    * [MozWiki: Content Process Event Handlers](https://wiki.mozilla.org/Content_Process_Event_Handlers)
    * [MozWiki: Electrolysis/CPOW](https://wiki.mozilla.org/Content_Processes/JPW)


License
=======

[MIT License](http://www.opensource.org/licenses/mit-license.php)

Copyright (c) 2009-2010 Christoph Dorn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
