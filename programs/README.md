

Development
===========

    pinf switch-workspace github.com/cadorn/narwhalrunner


test-firefox-extension
----------------------

    pinf build-program programs/test-firefox-extension

  

  
  
  
  
  
  
  
Setting up new programs
=======================

    pinf register-package cadorn.org/github/narwhalrunner/programs programs/test-firefox-extension
    pinf announce-release --branch master programs/test-firefox-extension
    pinf map-sources
