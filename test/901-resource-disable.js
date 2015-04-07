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
var Resource = require('../lib/resource');

var cacheDir = path.join(__dirname, 'cache-test');

describe('A KaChing resource', function () {
  var resource, provider;
  afterEach(function (done) {
    resource.clear(done);
  })

  describe('instanciated with `true` as the disable option', function () {
    var options = {
      cacheDir: cacheDir,
      disable: true
    }
    beforeEach(function () {
      var count = 0;
      provider = sinon.spy(function () {
        return streamWithContent('Hello World ' + (count++));
      });
      resource = Resource('my-id', provider, options);
    });

    it('never uses a cached resource', function (done) {
      trycatch(function () {
        resource().pipe(sink()).on('data', function(contents) {
          expect(contents).to.equal('Hello World 0');
          assert.equal(1, provider.callCount, 'provider calls');
          resource().pipe(sink()).on('data', function(contents) {
            expect(contents).to.equal('Hello World 1');
            assert.equal(2, provider.callCount, 'provider calls');
            resource.remove(function (err) {
              if(err) return done(err);
              resource().pipe(sink()).on('data', function(contents) {
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


