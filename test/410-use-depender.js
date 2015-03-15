'use strict';
var proxyquire = require('proxyquire');
var stream = require('stream');
var sink = require('stream-sink');
var sinon = require('sinon');
var expect = require('chai').expect;
var path = require('path');
var assert = require('chai').assert;
var Depender = require('../lib/depender');
var streamWithContent = require('./utils').streamWithContent;
var CacheDepend = require('cache-depend');

var cacheDir = path.join(__dirname, 'cache-test');

describe('A KaChing instance', function () {
  var depender;
  var DependerMock;
  var kaChing;
  beforeEach(function () {
    DependerMock = sinon.spy(function () {
      depender = new Depender();
      return depender;
    });
    var KaChing = proxyquire('..', {
      './lib/depender': DependerMock
    })
    kaChing = KaChing(cacheDir);
  });

  afterEach(function (done) {
    depender = null;
    kaChing.clear(function (err) {
      if(/ENOENT/.test(err)) return done();
      done(err);
    })
  })

  describe('when calling the provider', function () {
    it('calls it with a Depender as `this`', function (done) {
      var provider = sinon.spy(function () {
        return streamWithContent("Hey!!!");
      })
      kaChing('hello', provider).pipe(sink()).on('data', function(data) {
        assert(DependerMock.called, 'Depender mock should be constructed');
        assert(provider.calledOn(depender), 'provider should have been called on depender');
        done();
      });
    });

    describe('when the depender becomes invalid', function () {
      it('removes the resource', function (done) {
        var manual = CacheDepend.manual();
        var provider = function () {
          this.depend(manual);
          return streamWithContent('hello');
        }
        kaChing('chose', provider).pipe(sink()).on('data', function(data) {
          kaChing.on('remove:chose', function () {
            done();
          });
          manual.invalidate();
        });
      });

      it('relays the event on the stream itself', function (done) {
        var manual = CacheDepend.manual();
        var provider = function () {
          this.depend(manual);
          return streamWithContent('O HAI');
        };
        var onInvalid = sinon.spy();
        kaChing('aaa', provider).on('invalid', onInvalid).pipe(sink()).on('data', function() {
          manual.invalidate();
          process.nextTick(function () {
            assert.equal(onInvalid.callCount, 1, '"invalid" event not emitted');
            done();
          });
        });
      });
    })
  }); 

});

describe('A KaChing instance', function () {
  var depender;
  var DependerMock;
  var kaChing;
  beforeEach(function () {
    DependerMock = function () {
      return depender;
    };
    var KaChing = proxyquire('..', {
      './lib/depender': DependerMock
    })
    kaChing = KaChing(cacheDir, { maxAge: 60 * 1000 });
  });

  afterEach(function (done) {
    depender = null;
    kaChing.clear(function (err) {
      if(/ENOENT/.test(err)) return done();
      done(err);
    })
  })

  describe('with the maxAge option', function () {
    it('should setup the depender for any new resource', function (done) {
      depender = new Depender();
      sinon.stub(depender.expires, 'in').returns(null);
      var provider = streamWithContent.bind(null, 'Hello world!');
      kaChing('hello', provider).pipe(sink()).on('data', function(data) {
        assert(depender.expires.in.calledWith(60*1000), 'expires.in should have been called');
        done();
      });
    })
  })
});
