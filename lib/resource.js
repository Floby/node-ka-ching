var noop = require('node-noop');
var EventEmitter = require('events').EventEmitter;
var mixin = require('merge-descriptors');
var fs = require('fs');
var path = require('path');
var sink = require('stream-sink');
var mkdirp = require('mkdirp');
var extend = require('extend');
var blackhole = require('stream-blackhole');
var BlackholeLRU = require('./blackhole-lru');
var writeRead = require('stream-write-read');
var hashSum = require('./hashSum');
var Depender = require('./depender');
var KaChingOutputStream = require('./ka-ching-output-stream');

module.exports = Resource;

function Resource (id, provider, options) {
  if(typeof provider !== 'function') {
    throw new Error('No provider found for resource ' + id);
  }

  options = extend({}, options);
  var cacheDir = options.cacheDir;
  var cachePath = path.join(cacheDir, hashSum(id));
  var maxAge = options.maxAge;
  var reactive = options.reactive;
  var disabled = options.disable;
  var lru = options.lru || new BlackholeLRU();
  var cachedStream = null;
  var depender = null;
  var ready = false;

  resource.remove = remove;
  resource.clear = clear;
  resource.hasCache = hasCache;
  resource.hasCacheReady = hasCacheReady;
  mixin(resource, EventEmitter.prototype);
  return resource;

  function resource (newProvider) {
    var resultStream = new KaChingOutputStream();
    if (disabled) return invokeProvider().pipe(resultStream);

    isCacheAvailable(function (available) {
      var source = available ? getCachedStream() : makeCachedStream();
      source.pipe(resultStream);
    });
    resource.once('remove', resultStream.emit.bind(resultStream, 'remove'));
    getDepender().once('invalid', resultStream.emit.bind(resultStream, 'invalid'));
    return resultStream;
  }

  function makeCachedStream () {
    cachedStream = writeRead(cachePath, { delayOpen: true });
    whenCacheDirectoryReady(cachedStream.open);
    fillMemoryCache(cachedStream);
    cachedStream.on('finish', function () {
      ready = true;
      resource.emit('ready');
    });
    invokeProvider().pipe(cachedStream);
    return cachedStream;
  }

  function getCachedStream () {
    if (lru.has(id)) {
      var result = new KaChingOutputStream();
      result.end(lru.get(id));
      return result;
    }
    return cachedStream.createReadable();
  }

  function fillMemoryCache (cachedStream) {
    cachedStream.createReadable().pipe(sink()).on('data', function(data) {
      lru.set(id, new Buffer(data));
    });
  }

  function isCacheAvailable (callback) {
    process.nextTick(callback.bind(null, Boolean(cachedStream)));
  }

  function hasCache () {
    return Boolean(cachedStream);
  }
  function hasCacheReady () {
    return Boolean(cachedStream) && ready;
  }

  function invokeProvider () {
    var depender = getDepender();
    depender.once('invalid', function () {
      remove(function () {
        if (reactive) {
          resource().pipe(blackhole());
        }
      });
    })
    return provider.call(depender);
  }

  function getDepender () {
    if (depender) return depender;
    depender = new Depender();
    if (maxAge) depender.expires.in(maxAge);
    return depender;
  }

  function remove (onRemoved) {
    onRemoved = onRemoved || noop;
    if (!cachedStream) return process.nextTick(onRemoved());
    cachedStream = null;
    depender = null;
    ready = false;
    lru.del(id);
    resource.emit('remove', id);
    fs.unlink(cachePath, onRemoved);
  }

  function clear (onCleared) {
    if (!cachedStream) return onCleared();
    else fs.unlink(cachePath, onCleared);
  }

  function whenCacheDirectoryReady (onDirectoryReady) {
    mkdirp(cacheDir, onDirectoryReady);
  }
}
