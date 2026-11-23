'use strict';

const Module = require('module');
const path = require('path');
const originalLoad = Module._load;
const prefixSettings = require('./lib/prefix-settings');
const groupModeration = require('./lib/group-moderation');
const animeCommand = require('./lib/anime-command');

// Register moderation and specialized commands before the general command
// runtime so handled commands do not fall through to placeholder responses.
Module._load = function loadWithPrefixSettings(request, parent, isMain) {
  const loaded = originalLoad.call(this, request, parent, isMain);
  if (parent?.filename === path.join(__dirname, 'index.js') && request === './lib/command-runtime') {
    return {
      ...loaded,
      attachMessageHandler(sock) {
        groupModeration.attachMessageHandler(sock);
        animeCommand.attachMessageHandler(sock);
        return prefixSettings.attachMessageHandler(sock);
      },
    };
  }
  return loaded;
};

require('./index');
