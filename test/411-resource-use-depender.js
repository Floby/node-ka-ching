'use strict';
var domain = require('domain');

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

describe('A KaChing resource', function () {
  var options = {
    cacheDir: cacheDir
  }
  var depender;
  var DependerMock;
  var resource, provider, manual;
  beforeEach(function () {
    DependerMock = sinon.spy(function () {
      depender = new Depender();
      return depender;
    });
    var Resource = proxyquire('../lib/resource', {
      './depender': DependerMock
    })
    manual = CacheDepend.manual();
    provider = sinon.spy(function () {
      if (this instanceof Depender) this.depend(manual);
      return streamWithContent('hello');
    });
    resource = Resource('my-id', provider, options);
  });

  afterEach(function (done) {
    depender = null;
    resource.clear(done);
  })

  describe('with a provider', function () {
    it('calls it with a Depender as `this`', function (done) {
      resource().pipe(sink()).on('data', function(data) {
        assert(DependerMock.called, 'Depender mock should be constructed');
        assert(provider.calledOn(depender), 'provider should have been called on depender');
        done();
      });
    });

    describe('when the depender becomes invalid', function () {
      it('removes the resource', function (done) {
        resource().pipe(sink()).on('data', function(data) {
          resource.on('remove', done.bind(null, null));
          manual.invalidate();
        });
      });

      it('relays the event on the stream itself', function (done) {
        var onInvalid = sinon.spy();
        resource().on('invalid', onInvalid).pipe(sink()).on('data', function() {
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

describe('A KaChing resource', function () {
  var options = {
    cacheDir: cacheDir,
    maxAge: 60 * 1000
  };
  var depender;
  var DependerMock;
  var resource, provider, manual;
  beforeEach(function () {
    depender = new Depender();
    DependerMock = sinon.spy(function () {
      return depender;
    });
    var Resource = proxyquire('../lib/resource', {
      './depender': DependerMock
    })
    provider = sinon.spy(function () {
      return streamWithContent('hello');
    });
    resource = Resource('my-id', provider, options);
  });

  afterEach(function (done) {
    depender = null;
    resource.clear(done);
  })


  describe('with the maxAge option', function () {
    it('should setup the depender for any new resource', function (done) {
      sinon.stub(depender.expires, 'in').returns(null);
      resource().pipe(sink()).on('data', function(data) {
        assert(depender.expires.in.calledWith(60*1000), 'expires.in should have been called');
        done();
      });
    })
  })
});

