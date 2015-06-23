var extend = require('extend');
var rmR = require('rm-r');
var mixin = require('merge-descriptors');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var sink = require('stream-sink');
var blackhole = require('stream-blackhole');
var LRU = require('lru-cache');
var KaChingOutputStream = require('./lib/ka-ching-output-stream');
var BlackHoleLRU = require('./lib/blackhole-lru');
var lruOptions = require('./lib/lru-options');

var Resource = require('./lib/resource');

module.exports = KaChing;

function KaChing (cacheDir, options) {
  options = options || {};
  var resources = {};

  var lru = options.memoryCache ? new LRU(lruOptions(options)) : new BlackHoleLRU();
  kaChing.stale = options.useStale ? getStale : kaChing;
  if(options.useStale) {
    var staleCache = new KaChing(path.join(cacheDir, 'stale'));
  }
  kaChing.clear = clear;
  kaChing.doc = getDoc;
  kaChing.remove = remove;
  kaChing.has = function (id) { return resources[id] && resources[id].hasCache() }
  kaChing.hasReady = function (id) { return resources[id] && resources[id].hasCacheReady(); };
  mixin(kaChing, EventEmitter.prototype);

  return kaChing;

  function kaChing(id, provider) {
    var resource = resourceFor(id, provider);
    if (options.useStale && !resource.hasCacheReady()) {
      resource.once('ready', function () {
        cacheStale(id);
      })
    }
    return resource(provider);
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
      var output = new KaChingOutputStream();
      provider(function (err, doc) {
        output.end(JSON.stringify(doc));
      });
      return output;
    }).pipe(sink()).on('data', function(data) {
      callback(null, JSON.parse(data));
    });
  }

  function remove (id, callback) {
    if (!resources[id]) return process.nextTick(callback);
    kaChing.emit('remove', id);
    return resourceFor(id).remove(callback);
  }

  function resourceFor (id, provider) {
    if (resources[id]) return resources[id];
    var resourceOptions = extend({
      cacheDir: cacheDir,
      lru: lru
    }, options);
    resources[id] = new Resource(id, provider, resourceOptions);
    return resources[id];
  }

  function clear (callback) {
    rmR(cacheDir).node(callback);
  }
}
