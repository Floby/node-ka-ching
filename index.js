var fs = require('fs');
var rmR = require('rm-r');
var mkdirp = require('mkdirp');
var mixin = require('merge-descriptors');
var path = require('path');
var stream = require('stream');
var EventEmitter = require('events').EventEmitter;
var emit = EventEmitter.prototype.emit;
var writeRead = require('stream-write-read');
var LRU = require('lru-cache');
var sink = require('stream-sink');


module.exports = KaChing;

function KaChing (cacheDir, options) {
  options = options || {};
  var cached = {};
  var providers = {};
  var lru;
  if(options.memoryCache) {
    lru = LRU({
      max: 1 * 1024 * 1024, // 1 Mo
      maxAge: 2 * 60 * 1000, // 1 minute
      length: function (n) { return n.length }
    });
  }
  else {
    lru = BlackHoleLRU();
  }

  kaChing.clear = clear;
  kaChing.remove = remove;
  mixin(kaChing, EventEmitter.prototype);

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

    kaChing.once('remove:'+id, emit.bind(output, 'remove'));

    return output;
  }

  function getCachedStream (id) {
    if(lru.has(id)) {
      var result = stream.PassThrough();
      result.end(lru.get(id));
      return result;
    }
    return cached[id].createReadable();
  }

  function makeCachedStream (id, provider) {
    var cachedStream = writeRead(cachePathFor(id), { delayOpen: true });
    cached[id] = cachedStream;
    whenDirectoryReady(function (err) {
      cachedStream.open();
    });
    setImmediate(function () {
      cachedStream.createReadable().pipe(sink()).on('data', function(data) {
        lru.set(id, data);
      });
    });
    return provider().pipe(cachedStream);
  }

  function isCacheAvailable (id, callback) {
    process.nextTick(callback.bind(null, Boolean(cached[id])));
  }

  function remove (id, callback) {
    fs.unlink(cachePathFor(id), callback);
    kaChing.emit('remove', id);
    kaChing.emit('remove:' + id);
    lru.del(id);
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

function BlackHoleLRU () {
  if(!(this instanceof BlackHoleLRU)) return new BlackHoleLRU();

  this.has = function () { return false };
  this.set = function () {};
  this.del = function () {};
}
