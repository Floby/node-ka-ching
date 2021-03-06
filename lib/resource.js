var stream = require('stream');
var noop = require('node-noop');
var ReadWriteLock = require('rwlock');
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
  var lock = new ReadWriteLock();
  var cachedStream = null;
  var depender = null;
  var ready = false;

  resource.remove = remove;
  resource.clear = clear;
  resource.hasCache = function () { return Boolean(cachedStream) };
  resource.hasCacheReady = function () { return Boolean(cachedStream) && ready };
  mixin(resource, EventEmitter.prototype);
  return resource;

  function resource (newProvider) {
    provider = newProvider || provider;
    var resultStream = new KaChingOutputStream();
    if (disabled) return invokeProvider().pipe(resultStream);

    isCacheAvailable(function (available) {
      var source = available ? getCachedStream() : makeCachedStream();
      source.pipe(resultStream);
    });
    getDepender().once('invalid', resultStream.emit.bind(resultStream, 'invalid'));
    resource.once('remove', resultStream.emit.bind(resultStream, 'remove'));
    return resultStream;
  }

  function makeCachedStream () {
    var output = stream.PassThrough();
    lock.writeLock(function (release) {
      cachedStream = writeRead(cachePath, { delayOpen: true });
      whenCacheDirectoryReady(cachedStream.open);
      fillMemoryCache(cachedStream);
      cachedStream.on('finish', function () {
        ready = true;
        resource.emit('ready');
        release();
      });
      invokeProvider().pipe(cachedStream).pipe(output);
    })
    return output;
  }

  function getCachedStream () {
    if (lru.has(id)) {
      var result = new KaChingOutputStream();
      result.end(lru.get(id));
      return result;
    }
    var output = stream.PassThrough();
    lock.readLock(function (release) {
      cachedStream
        .createReadable()
        .pipe(output)
        .on('finish', release)
    })
    return output;
  }

  function fillMemoryCache (cachedStream) {
    cachedStream.createReadable().pipe(sink()).on('data', function(data) {
      lru.set(id, new Buffer(data));
    });
  }

  function isCacheAvailable (callback) {
    process.nextTick(callback.bind(null, Boolean(cachedStream)));
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
    if (!cachedStream) return process.nextTick(onRemoved);
    lock.writeLock(function (release) {
      cachedStream = null;
      depender = null;
      ready = false;
      lru.del(id);
      fs.unlink(cachePath, function () {
        resource.emit('remove', id);
        release();
        onRemoved();
      });
    })
  }

  function clear (onCleared) {
    if (!cachedStream) return onCleared();
    else fs.unlink(cachePath, onCleared);
  }

  function whenCacheDirectoryReady (onDirectoryReady) {
    mkdirp(cacheDir, onDirectoryReady);
  }
}
