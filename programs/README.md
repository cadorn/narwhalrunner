

Development
===========

    pinf switch-workspace github.com/cadorn/narwhalrunner


test-firefox-extension
----------------------

    nr create-profile --dev ff3
    nr add-extension -l --profile ff3 /Users/cadorn/pinf/builds/registry.pinf.org/cadorn.org/github/narwhal-xulrunner/master/extension
    nr add-extension -l --profile ff3 programs/test-firefox-extension

    pinf build-program --target extension programs/test-firefox-extension

    nr launch --dev --version 3.6 --profile ff3 programs/test-firefox-extension


    nr create-profile --dev ff4
    nr add-extension -l --profile ff4 /Users/cadorn/pinf/builds/registry.pinf.org/cadorn.org/github/narwhal-xulrunner/ff4/extension
    nr add-extension -l --profile ff4 programs/test-firefox-extension

    pinf build-program --target extension programs/test-firefox-extension

    nr launch --dev --version 4.0b6 --profile ff4 programs/test-firefox-extension
  

Setting up new programs
=======================

    pinf register-package cadorn.org/github/narwhalrunner/programs programs/test-firefox-extension
    pinf announce-release --branch master programs/test-firefox-extension
    pinf map-sources
