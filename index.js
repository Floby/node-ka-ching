var mkdirp = require('mkdirp');
var path = require('path');
var stream = require('stream');
var writeRead = require('stream-write-read');

module.exports = KaChing;

function KaChing (cacheDir) {
  var cached = {};
  return kaChing;

  function kaChing(id, provider) {
    if(typeof provider !== 'function') {
      return empty();
    }
    if(cached[id]) {
      return cached[id].createReadable();
    }
    var cachePath = path.join(cacheDir, id);
    withDirectory(function () {
      cached[id].open();
    });
    return cached[id] = provider().pipe(writeRead(cachePath, {delayOpen: true}))
  }


  function withDirectory (callback) {
    mkdirp(cacheDir, callback);
  }
}





function empty () {
  var empty = stream.PassThrough()
  empty.end();
  return empty;
}
