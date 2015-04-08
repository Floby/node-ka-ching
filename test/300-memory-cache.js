var proxyquire = require('proxyquire');
var stream = require('stream');
var sink = require('stream-sink');
var sinon = require('sinon');
var path = require('path');
var expect = require('chai').expect;
var assert = require('chai').assert;
var streamWithContent = require('./utils').streamWithContent;

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
});
