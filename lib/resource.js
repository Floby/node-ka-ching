var noop = require('node-noop');
var EventEmitter = require('events').EventEmitter;
var mixin = require('merge-descriptors');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var extend = require('extend');
var blackhole = require('stream-blackhole');
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
  var cachedStream = null;
  var depender = null;

  resource.remove = remove;
  resource.clear = clear;
  mixin(resource, EventEmitter.prototype);
  return resource;

  function resource () {
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
    return invokeProvider().pipe(cachedStream);
  }
  function getCachedStream () {
    return cachedStream.createReadable();
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
    if (!cachedStream) return onRemoved();
    cachedStream = null;
    depender = null;
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
