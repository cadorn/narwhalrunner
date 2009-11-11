
NarwhalRunner
=============

NarwhalRunner is a toolkit for building [XULRunner](https://developer.mozilla.org/en/XULRunner)
applications and extensions with [Narwhal](http://narwhaljs.org/).


Setup
=====

Assumptions
-----------

You have [firefox 3.5+](http://www.mozilla.com/en-US/firefox/) installed.

You are on:

   * **Mac OS X**  - *fully tested*
   * UNIX - *should be working*
   * Windows - *tusk-catalog* still needs some work:
     * Primarily to do with symlinks and paths

Instructions
------------

Clone Christoph Dorn's [**tusk-catalog** narwhal branch](http://github.com/cadorn/narwhal/tree/tusk-catalog) and the [narwhal-xulrunner](http://github.com/cadorn/narwhal-xulrunner) engine.

	mkdir tutorial

	// Clone narwhal
	git clone git://github.com/cadorn/narwhal.git
	cd narwhal
 
	// Switch to branch
	git branch --track tusk-catalog origin/tusk-catalog
	cd ..
	
	// Clone narwhal-xulrunner
	git clone git://github.com/cadorn/narwhal-xulrunner.git
	cd ..
	
	// Link the engine into narwhal
	cd narwhal/engines
	ln -s ../../narwhal-xulrunner xulrunner
	cd ../../

	// Activate narwhal to setup environment variables
	narwhal/bin/activate

Setup a testing playground.

    // Clear the tusk cache (this will not be necessary soon)
    rm -Rf ~/.tusk/cache/*

    // Create a new sea to play in and switch to it
    tusk sea create -s --name playground ./playground

    // Install developer tools
    tusk package install --alias nr-devtools http://github.com/cadorn/narwhalrunner/raw/master/catalog.json devtools
    
    // Add firefox binary
    nr add-bin /Applications/Firefox.app/Contents/MacOS/firefox-bin

Demo: test-application
----------------------
    
    // Install the test application
    tusk package install http://github.com/cadorn/narwhalrunner/raw/master/catalog.json test-application
    
    // Build the test application
    tusk package --package test-application build
    
    // Launch the test application
    nr launch --dev --app firefox --package test-application

Demo: test-firefox-extension
----------------------------
    
    // Install the test extension
    tusk package install http://github.com/cadorn/narwhalrunner/raw/master/catalog.json test-firefox-extension
    
    // Build the test extension
    tusk package --package test-firefox-extension build
    
    // Create a dev firefox profile
    nr create-profile --dev test1
    
    // Add test extension to profile
    nr add-extension -l --profile test1 build/test-firefox-extension
    
    // Launch firefox with the test extension
    nr launch --dev --app firefox --profile test1

Other Examples
--------------

You can find more sample applications and extensions in the [narwhalrunner-examples](http://github.com/cadorn/narwhalrunner-examples) project.    

Your own application
--------------------

As a sea package:

    // Clear the tusk cache (this will not be necessary soon)
    rm -Rf ~/.tusk/cache/*
    
    // Create a new sea for your application and switch to it
    tusk sea create -s --name test-application ./test-application
    
    // Install the NarwhalRunner developer tools
    tusk package install --alias nr-devtools http://github.com/cadorn/narwhalrunner/raw/master/catalog.json devtools
        
    // Write some code
    nr inject-sample helloworld-application
    
    // Install all dependencies
    tusk package install -f
    
    // Build the application
    tusk package build

    // Add firefox binary
    nr add-bin /Applications/Firefox.app/Contents/MacOS/firefox-bin

    // Launch the test application
    nr launch --dev --app firefox --package test-application

As a deep-sea package:

    // Clear the tusk cache (this will not be necessary soon)
    rm -Rf ~/.tusk/cache/*

    // Create a new sea for your project and switch to it
    tusk sea create -s --name test-project ./test-project    
    
    // Create a new package for your application
    tusk package create test-application
        
    // Install the NarwhalRunner developer tools
    tusk package install --alias nr-devtools http://github.com/cadorn/narwhalrunner/raw/master/catalog.json devtools

    // Write some code
    nr inject-sample --package test-application helloworld-application

    // Install all dependencies
    tusk package --package test-application install -f
    
    // Build the application
    tusk package --package test-application build

    // Add firefox binary
    nr add-bin /Applications/Firefox.app/Contents/MacOS/firefox-bin

    // Launch the test application
    nr launch --dev --app firefox --package test-application



License
=======

[MIT License](http://www.opensource.org/licenses/mit-license.php)

Copyright (c) 2009 Christoph Dorn

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
