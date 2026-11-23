'use strict';

const Module = require('module');
const path = require('path');
const originalLoad = Module._load;
const runtimePath = path.join(__dirname, 'lib', 'command-runtime.js');
const prefixSettings = require('./lib/prefix-settings');

// Add prefix settings at the command-runtime boundary without changing how its
// existing commands are implemented or dispatched.
Module._load = function loadWithPrefixSettings(request, parent, isMain) {
  const loaded = originalLoad.call(this, request, parent, isMain);
  if (parent?.filename === path.join(__dirname, 'index.js') && request === './lib/command-runtime') {
    return { ...loaded, attachMessageHandler: prefixSettings.attachMessageHandler };
  }
  return loaded;
};

require('./index');
