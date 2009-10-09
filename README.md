
NarwhalRunner
=============

NarwhalRunner is a toolkit for building [XULRunner](https://developer.mozilla.org/en/XULRunner)
applications and extensions with [Narwhal](http://narwhaljs.org/).

*STATUS: Under development. Not functional yet!*


Setup
=====

Assumptions:

 * You must be using Christoph Dorn's **tusk-catalog** branch.

TODO: instructions

 * You have firefox installed

 * You are on:
   * **Mac OS X**  - *fully tested*
   * UNIX - *should be working*
   * Windows - *tusk-catalog* still needs some work:
     * Primarily to do with symlinks and paths

Instructions:

    // Add the narwhalrunner catalog
    tusk catalog add magic://com.github.cadorn.narwhalrunner

    // Create a new sea to play in and switch to it
    tusk create sea -s --name playground ./playground

    // Install developer tool
    tusk package install --catalog com.github.cadorn.narwhalrunner devtools
    
    // Add firefox binary
    dev add-bin /Applications/Firefox.app/Contents/MacOS/firefox-bin

test-application
----------------
    
    // Install the test application
    tusk package install --catalog com.github.cadorn.narwhalrunner test-application
    
    // Build the test application
    tusk package build test-application
    
    // Launch the test application
    dev launch --dev --app firefox --package test-application

test-firefox-extension
----------------------
    
    // Install the test extension
    tusk package install --catalog com.github.cadorn.narwhalrunner test-firefox-extension
    
    // Build the test extension
    tusk package build test-application
    
    // Create a dev firefox profile
    dev create-profile --dev test1
    
    // Add test extension to profile
    dev add-extension -l --profile test1 build/test-firefox-extension
    
    // Launch firefox with the test extension
    dev launch --dev --app firefox --profile test1







License
=======

[New BSD License](http://www.opensource.org/licenses/bsd-license.php)

Copyright (c) 2009, Christoph Dorn

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

* Redistributions of source code must retain the above copyright notice,
  this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright
  notice, this list of conditions and the following disclaimer in the
  documentation and/or other materials provided with the distribution.
* Neither the name of Christoph Dorn nor the names of its contributors
  may be used to endorse or promote products derived from this software
  without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.