var EventEmitter = require('events').EventEmitter;
var mixin = require('merge-descriptors');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var extend = require('extend');
var writeRead = require('stream-write-read');
var hashSum = require('./hashSum');
var KaChingOutputStream = require('./ka-ching-output-stream');

module.exports = Resource;

function Resource (id, provider, options) {
  if(typeof provider !== 'function') {
    throw new Error('No provider found for resource ' + id);
  }

  options = extend({}, options);
  var cacheDir = options.cacheDir;
  var cachePath = path.join(cacheDir, hashSum(id));
  var cachedStream = null;

  resource.remove = remove;
  resource.clear = clear;
  mixin(resource, EventEmitter.prototype);
  return resource;

  function resource () {
    var resultStream = new KaChingOutputStream();
    isCacheAvailable(function (available) {
      var source = available ? getCachedStream() : makeCachedStream();
      source.pipe(resultStream);
    });
    resource.once('remove', resultStream.emit.bind(resultStream, 'remove'));
    return resultStream;
  }

  function makeCachedStream () {
    cachedStream = writeRead(cachePath, { delayOpen: true });
    whenCacheDirectoryReady(cachedStream.open);
    return provider.call().pipe(cachedStream);
  }
  function getCachedStream () {
    return cachedStream.createReadable();
  }

  function isCacheAvailable (callback) {
    process.nextTick(callback.bind(null, Boolean(cachedStream)));
  }

  function remove (onRemoved) {
    cachedStream = null;
    resource.emit('remove', id);
    process.nextTick(onRemoved);
  }

  function clear (onCleared) {
    if (!cachedStream) return onCleared();
    else fs.unlink(cachePath, onCleared);
  }

  function whenCacheDirectoryReady (onDirectoryReady) {
    mkdirp(cacheDir, onDirectoryReady);
  }
}