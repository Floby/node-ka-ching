var fs = require('fs');
var rmR = require('rm-r');
var mkdirp = require('mkdirp');
var path = require('path');
var stream = require('stream');
var writeRead = require('stream-write-read');

module.exports = KaChing;

function KaChing (cacheDir) {
  var cached = {};
  kaChing.clear = clear;
  return kaChing;

  function kaChing(id, provider) {
    if(typeof provider !== 'function') {
      return empty();
    }
    if(cached[id]) {
      return cached[id].createReadable();
    }

    var cachePath = path.join(cacheDir, id);
    var cachedStream = provider().pipe(writeRead(cachePath, { delayOpen: true }));
    cached[id] = cachedStream;
    whenDirectoryReady(function (err) {
      cachedStream.open();
    });
    return cachedStream;
  }


  function whenDirectoryReady (callback) {
    mkdirp(cacheDir, callback);
  }
  function clear (callback) {
    rmR(cacheDir).node(callback);
  }
}

function empty () {
  var empty = stream.PassThrough()
  empty.end();
  return empty;
}
