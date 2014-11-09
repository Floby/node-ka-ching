var fs = require('fs');
var rmR = require('rm-r');
var mkdirp = require('mkdirp');
var mixin = require('merge-descriptors');
var path = require('path');
var blackhole = require('stream-blackhole');
var stream = require('stream');
var EventEmitter = require('events').EventEmitter;
var emit = EventEmitter.prototype.emit;
var writeRead = require('stream-write-read');
var LRU = require('lru-cache');
var BlackHoleLRU = require('./lib/blackhole-lru');
var sink = require('stream-sink');
var Depender = require('./lib/depender');
var hashSum = require('./lib/hashSum')

module.exports = KaChing;

function KaChing (cacheDir, options) {
  options = options || {};
  var useStale = Boolean(options.useStale);
  var cached = {};
  var providers = {};
  var lru = options.memoryCache ? LRU(lruOptions(options)) : BlackHoleLRU();
  kaChing.stale = kaChing;
  if(options.useStale) {
    var staleCache = new KaChing(path.join(cacheDir, 'stale'));
    kaChing.stale = getStale;
  }
  kaChing.clear = clear;
  kaChing.remove = remove;
  kaChing.has = has;
  kaChing.hasReady = hasReady;
  mixin(kaChing, EventEmitter.prototype);

  return kaChing;

  function kaChing(id, provider) {
    provider = providerFor(id, provider);

    if(typeof provider !== 'function') {
      throw new Error('No provider found for resource ' + id);
    }

    var output = stream.PassThrough();
    isCacheAvailable(id, function (available) {
      var source = available ? getCachedStream(id) : makeCachedStream(id, provider)
      source.pipe(output)
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
    whenDirectoryReady(function (err) {
      cachedStream.open();
    });
    cached[id] = cachedStream;
    cachedStream.on('finish', function() {
      cachedStream.ready = true;
      if(options.useStale) cacheStale(id);
    });
    fillMemoryCache(cachedStream, id);
    return provider.call(dependerFor(id)).pipe(cachedStream);
  }

  function fillMemoryCache (cachedStream, id) {
    cachedStream.createReadable().pipe(sink()).on('data', function(data) {
      lru.set(id, new Buffer(data));
    });
  }

  function dependerFor (id) {
    var depender = Depender();
    depender.once('invalid', remove.bind(null, id));
    if(options.maxAge) depender.expires.in(options.maxAge);
    if(options.reactive) {
      depender.once('invalid', function() {
        kaChing(id).pipe(blackhole());
      });
    }
    return depender;
  }

  function isCacheAvailable (id, callback) {
    process.nextTick(callback.bind(null, Boolean(cached[id])));
  }

  function cacheStale(id) {
    staleCache.remove(id, function () {
      staleCache(id, function () {
        return kaChing(id);
      }).pipe(blackhole())
    });
  }

  function getStale (id, provider) {
    if(kaChing.hasReady(id)) {
      return kaChing(id);
    }
    if(staleCache.has(id)) {
      kaChing(id, provider).pipe(blackhole());
      return staleCache(id);
    }
    return kaChing(id, provider);
  }

  function remove (id, callback) {
    callback = callback;
    fs.unlink(cachePathFor(id), callback);
    kaChing.emit('remove', id);
    kaChing.emit('remove:' + id);
    lru.del(id);
    delete cached[id];
  }

  function has (id) {
    return Boolean(cached[id]);
  }

  function hasReady (id) {
    return cached[id] && cached[id].ready;
  }

  function cachePathFor (id) {
    return path.join(cacheDir, hashSum(id));
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

