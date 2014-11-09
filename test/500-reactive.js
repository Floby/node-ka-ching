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

  describe('instanciated with `true` as the reactive option', function () {
    beforeEach(function () {
      kaChing = KaChing(cacheDir, { reactive: true });
    });

    describe('when a cached resource expires', function () {
      it('automatically calls the provider again', function (done) {
        var manual;
        var provider = sinon.spy(function () {
          manual = CacheDepend.manual();
          this.depend(manual);
          return streamWithContent('O HAI');
        });
        kaChing('reactive', provider).pipe(sink()).on('data', function() {
          assert(provider.calledOnce, 'provider should have been called once');
          setTimeout(manual.invalidate.bind(manual), 20);
          setTimeout(function () {
            assert(provider.calledTwice, 'provider should have been called again');
            kaChing('reactive').pipe(sink()).on('data', function(data) {
              expect(data).to.equal('O HAI');
              assert(provider.calledTwice, 'provider was unnecessarily called')
              done();
            });
          }, 40);
        });
      });
    });
  })
})
