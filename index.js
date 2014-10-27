var fs = require('fs');
var rmR = require('rm-r');
var mkdirp = require('mkdirp');
var path = require('path');
var stream = require('stream');
var writeRead = require('stream-write-read');

module.exports = KaChing;

function KaChing (cacheDir) {
  var cached = {};
  var providers = {};
  kaChing.clear = clear;
  kaChing.remove = remove;
  return kaChing;

  function kaChing(id, provider) {
    provider = providerFor(id, provider);

    if(typeof provider !== 'function') {
      return empty();
    }
    if(cached[id]) {
      return cached[id].createReadable();
    }
    return makeCachedStream(id, provider);
  }

  function makeCachedStream (id, provider) {
    var cachedStream = writeRead(cachePathFor(id), { delayOpen: true });
    cached[id] = cachedStream;
    whenDirectoryReady(function (err) {
      cachedStream.open();
    });
    provider().pipe(cachedStream);
    return cachedStream;
  }

  function remove (id, callback) {
    fs.unlink(cachePathFor(id), callback);
    delete cached[id];
  }

  function cachePathFor (id) {
    return path.join(cacheDir, id);
  }
  function providerFor (id, provider) {
    return providers[id] = provider || providers[id];
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
