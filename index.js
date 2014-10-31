var fs = require('fs');
var rmR = require('rm-r');
var mkdirp = require('mkdirp');
var mixin = require('merge-descriptors');
var path = require('path');
var noop = require('node-noop');
var stream = require('stream');
var EventEmitter = require('events').EventEmitter;
var emit = EventEmitter.prototype.emit;
var writeRead = require('stream-write-read');
var LRU = require('lru-cache');
var BlackHoleLRU = require('./lib/blackhole-lru');
var sink = require('stream-sink');
var Depender = require('./lib/depender');

module.exports = KaChing;

function KaChing (cacheDir, options) {
  options = options || {};
  var cached = {};
  var providers = {};
  var lru = options.memoryCache ? LRU(lruOptions(options)) : BlackHoleLRU()
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
    var depender = Depender();
    depender.once('invalid', remove.bind(null, id));
    whenDirectoryReady(function (err) {
      cachedStream.open();
    });
    fillMemoryCache(cachedStream, id);
    return provider.call(depender).pipe(cachedStream);
  }

  function fillMemoryCache (cachedStream, id) {
    cachedStream.createReadable().pipe(sink()).on('data', function(data) {
      lru.set(id, data);
    });
  }

  function isCacheAvailable (id, callback) {
    process.nextTick(callback.bind(null, Boolean(cached[id])));
  }

  function remove (id, callback) {
    callback = callback || noop;
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

function lruOptions (options) {
  var max;
  if (options.memoryCache === true) {
    max = 5 * 1024 * 1024 // 5 mo
  }
  else {
    max = options.memoryCache;
  }
  return {
    max: max,
    length: function (n) { return n.length }
  }
}

