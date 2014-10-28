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
      throw new Error('No provider found for resource ' + id);
    }

    var output = stream.PassThrough();
    isCacheAvailable(id, function (available) {
      (available ? getCachedStream(id) : makeCachedStream(id, provider))
        .pipe(output)
    });

    return output;
  }

  function getCachedStream (id) {
    return cached[id].createReadable();
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

  function isCacheAvailable (id, callback) {
    callback(Boolean(cached[id]));
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
