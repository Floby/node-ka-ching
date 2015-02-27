var fs = require('fs');
var rmR = require('rm-r');
var mkdirp = require('mkdirp');
var mixin = require('merge-descriptors');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var emit = EventEmitter.prototype.emit;
var stream = require('stream');
var sink = require('stream-sink');
var blackhole = require('stream-blackhole');
var writeRead = require('stream-write-read');
var LRU = require('lru-cache');
var BlackHoleLRU = require('./lib/blackhole-lru');
var lruOptions = require('./lib/lru-options');
var Depender = require('./lib/depender');
var hashSum = require('./lib/hashSum');

module.exports = KaChing;

function KaChing (cacheDir, options) {
  options = options || {};
  var disabled = options.disable;
  var cached = {};
  var providers = {};
  var lru = options.memoryCache ? LRU(lruOptions(options)) : BlackHoleLRU();
  kaChing.stale = options.useStale ? getStale : kaChing;
  if(options.useStale) {
    var staleCache = new KaChing(path.join(cacheDir, 'stale'));
  }
  kaChing.clear = clear;
  kaChing.doc = getDoc;
  kaChing.remove = remove;
  kaChing.has = function (id) { return Boolean(cached[id]) }
  kaChing.hasReady = function (id) { return cached[id] && cached[id].ready }
  mixin(kaChing, EventEmitter.prototype);

  return kaChing;

  function kaChing(id, provider) {
    provider = providerFor(id, provider);

    if(typeof provider !== 'function') {
      throw new Error('No provider found for resource ' + id);
    }
    if(disabled) return provider.call(dependerFor(id));

    var resultStream = stream.PassThrough();
    isCacheAvailable(id, function (available) {
      var source = available ? getCachedStream(id) : makeCachedStream(id, provider);
      source.pipe(resultStream);
    });

    kaChing.once('remove:'+id, emit.bind(resultStream, 'remove'));

    return resultStream;
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
    whenCacheDirectoryReady(cachedStream.open);
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
    var depender = new Depender();
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

  function getStale (id, provider) {
    if(!kaChing.hasReady(id) && staleCache.has(id)) {
      kaChing(id, provider).pipe(blackhole());
      return staleCache(id);
    }
    return kaChing(id, provider);
  }

  function cacheStale(id) {
    staleCache.remove(id, function () {
      staleCache(id, function () {
        return kaChing(id);
      }).pipe(blackhole());
    });
  }

  function getDoc (id, provider, callback) {
    kaChing(id, function () {
      var output = stream.PassThrough();
      provider(function (err, doc) {
        output.end(JSON.stringify(doc));
      });
      return output;
    }).pipe(sink()).on('data', function(data) {
      callback(null, JSON.parse(data));
    });
  }

  function remove (id, callback) {
    if(disabled) return process.nextTick(callback);
    fs.unlink(cachePathFor(id), callback);
    kaChing.emit('remove', id);
    kaChing.emit('remove:' + id);
    lru.del(id);
    delete cached[id];
  }

  function cachePathFor (id) {
    return path.join(cacheDir, hashSum(id));
  }
  function providerFor (id, provider) {
    providers[id] = provider || providers[id];
    return providers[id];
  }
  function whenCacheDirectoryReady (callback) {
    mkdirp(cacheDir, callback);
  }
  function clear (callback) {
    rmR(cacheDir).node(callback);
  }
}
