var proxyquire = require('proxyquire');
var stream = require('stream');
var sink = require('stream-sink');
var sinon = require('sinon');
var path = require('path');
var expect = require('chai').expect;
var assert = require('chai').assert;
var streamWithContent = require('./utils').streamWithContent;
var Resource = require('../lib/resource');

var cacheDir = path.join(__dirname, 'cache-test');

describe('A KaChing resource', function () {
  describe('instanciated with a LRU cache', function () {
    var resource;
    var cache;
    var lru;

    beforeEach(function () {
      cache = {};
      lru = {
        get: sinon.spy(function (k) { return cache[k] }),
        set: sinon.spy(function (k, v) { cache[k] = v }),
        has: sinon.spy(function (k) { return cache.hasOwnProperty(k) }),
        del: sinon.spy(function (k) { delete cache[k] })
      };
      provider = sinon.spy(function () {
        return streamWithContent('hello world');
      });
      resource = Resource('my-id', provider, {
        cacheDir: cacheDir,
        lru: lru,
      });
    });

    afterEach(function (done) {
      resource.clear(done);
    });

    it('uses the LRU cache for resources', function (done) {
      resource().pipe(sink()).on('data', function() {
        // wait for the cache to fill in
        setTimeout(function () {
          assert(lru.set.calledOnce, 'lru.set should have been called');
          resource().pipe(sink()).on('data', function(data) {
            assert.equal(data, 'hello world', 'Data should be the same');
            assert(lru.has.calledWith('my-id'), 'lru.has should have been called');
            assert(lru.get.calledWith('my-id'), 'lru.get should have been called');
            expect(cache['my-id'].toString()).to.equal('hello world');
            done();
          });
        }, 5);
      });
    })

    it('deletes data from its cache when remove() is called', function (done) {
      resource().pipe(sink()).on('data', function() {
        // wait for the cache to fill in
        setTimeout(function () {
          assert(lru.set.calledOnce, 'lru.set should have been called');
          resource.remove(function (err) {
            if(err) return done(err);
            assert(lru.del.calledWith('my-id'), 'lru.del should have been called');
            done();
          })
        }, 5);
      });
    });
  })
});

