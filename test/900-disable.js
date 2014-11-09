var trycatch = require('trycatch');
var proxyquire = require('proxyquire');
var stream = require('stream');
var sink = require('stream-sink');
var sinon = require('sinon');
var expect = require('chai').expect;
var path = require('path');
var assert = require('chai').assert;
var CacheDepend = require('cache-depend');
var streamWithContent = require('./utils').streamWithContent;
var KaChing = require('..');

var cacheDir = path.join(__dirname, 'cache-test');

describe('A KaChing instance', function () {
  var kaChing;
  afterEach(function (done) {
    kaChing.clear(function (err) {
      if(/ENOENT/.test(err)) return done();
      done(err);
    })
  })

  describe('instanciated with `true` as the disable option', function () {
    beforeEach(function () {
      kaChing = KaChing(cacheDir, { disable: true });
    });

    it('never uses a cached resource', function (done) {
      trycatch(function () {
      var count = 0;
      var provider = sinon.spy(function () {
        return streamWithContent('Hello World ' + (count++));
      })
      kaChing('my-resource', provider).pipe(sink()).on('data', function(contents) {
        expect(contents).to.equal('Hello World 0');
        assert.equal(1, provider.callCount, 'provider calls');
        kaChing('my-resource', provider).pipe(sink()).on('data', function(contents) {
          expect(contents).to.equal('Hello World 1');
          assert.equal(2, provider.callCount, 'provider calls');
          kaChing.remove('my-resource', function (err) {
            if(err) return done(err);
            kaChing('my-resource').pipe(sink()).on('data', function(contents) {
              expect(contents).to.equal('Hello World 2');
              assert.equal(3, provider.callCount, 'provider calls');
              done();
            });
          })
        });
      });
      }, done)
    })
  })
})

