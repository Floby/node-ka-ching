var proxyquire = require('proxyquire');
var stream = require('stream');
var sink = require('stream-sink');
var sinon = require('sinon');
var path = require('path');
var expect = require('chai').expect;
var assert = require('chai').assert;

var cacheDir = path.join(__dirname, 'cache-test');

describe('A KaChing instance', function () {
  describe('given the memoryCache option', function () {
    var kaChing;
    var cache;
    var LRU;
    var lru;

    beforeEach(function () {
      var lengthfn;
      cache = {};
      lru = {
        get: sinon.spy(function (k) { return cache[k] }),
        set: sinon.spy(function (k, v) { lengthfn(v) ; cache[k] = v }),
        has: sinon.spy(function (k) { return cache.hasOwnProperty(k) }),
        del: sinon.spy(function (k) { delete cache[k] })
      };
      var LRU = function (options) {
        lengthfn = options.length;
        return lru;
      };
      var KaChing = proxyquire('..', {
        'lru-cache': LRU
      });
      kaChing = KaChing(cacheDir, {
        memoryCache: true
      });
    });

    afterEach(function (done) {
      kaChing.clear(function (err) {
        if(/ENOENT/.test(err)) return done();
        done(err);
      });
    });

    it('uses an LRU cache for resources', function (done) {
      var provider = streamWithContent.bind(null, 'Hello World');
      kaChing('test', provider).pipe(sink()).on('data', function() {
        // wait for the cache to fill in
        setTimeout(function () {
          assert(lru.set.calledOnce, 'lru.set should have been called');
          kaChing('test').pipe(sink()).on('data', function(data) {
            assert.equal(data, 'Hello World', 'Data should be the same');
            assert(lru.has.calledWith('test'), 'lru.has should have been called');
            assert(lru.get.calledWith('test'), 'lru.get should have been called');
            expect(cache.test).to.equal('Hello World');
            done();
          });
        }, 5);
      });
    })

    it('deletes data from its cache when remove() is called', function (done) {
      var provider = streamWithContent.bind(null, 'Hello World');
      kaChing('test', provider).pipe(sink()).on('data', function() {
        // wait for the cache to fill in
        setTimeout(function () {
          assert(lru.set.calledOnce, 'lru.set should have been called');
          kaChing.remove('test', function (err) {
            if(err) return done(err);
            assert(lru.del.calledWith('test'), 'lru.del should have been called');
            done();
          })
        }, 5);
      });
    });
  })

  describe('if the memoryCache option is a boolean', function () {
    it('uses a default `max` value for its lru-cache', function () {
      var LRU = sinon.spy(function (options) {
        expect(options.max).to.equal(5 * 1024 * 1024);
        return {};
      })
      var KaChing = proxyquire('..', {
        'lru-cache': LRU
      });
      var kaChing = KaChing(cacheDir, {memoryCache: true});
      assert(LRU.called, 'LRU should have been constructed');
    });
  });

  describe('if the memoryCache option is a number', function () {
    it('uses this value for its lru-cache', function () {
      var LRU = sinon.spy(function (options) {
        expect(options.max).to.equal(8);
        return {};
      })
      var KaChing = proxyquire('..', {
        'lru-cache': LRU
      });
      var kaChing = KaChing(cacheDir, {memoryCache: 8});
      assert(LRU.called, 'LRU should have been constructed');
    });
  });
});


function streamWithContent (content) {
  var result = stream.PassThrough();
  process.nextTick(function () {
    result.end(content);
  });
  return result;
}
