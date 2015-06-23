var stream = require('stream');
var sink = require('stream-sink');
var sinon = require('sinon');
var expect = require('chai').expect;
var path = require('path');
var assert = require('chai').assert;
var streamWithContent = require('./utils').streamWithContent;
var proxyquire = require('proxyquire').noPreserveCache()
require('chai').use(require('sinon-chai'));

var cacheDir = path.join(__dirname, 'cache-test');

describe('A KaChing instance', function () {
  var resources;
  var KaChing = proxyquire('..', {
    './lib/resource': function (id, provider) {
      resources[id] = sinon.spy(function (provider) {
        if (provider) resources[id].provider = provider;
        return streamWithContent('hello world')
      });
      resources[id].hasCacheReady = Boolean.bind(null, true)
      resources[id].provider = provider;
      return resources[id]
    }
  });
  var kaChing;
  beforeEach(function () {
    resources = {};
    kaChing = KaChing(cacheDir, { useStale: true });
  });

  afterEach(function (done) {
    kaChing.clear(function (err) {
      if(/ENOENT/.test(err)) return done();
      done(err);
    })
  })

  describe('when called for a given resource', function () {
    var provider1 = streamWithContent.bind(null, 'o hai');
    beforeEach(function () {
      kaChing('my-resource', provider1);
    });
    it('constructs and calls a resource', function () {
      expect(resources).to.have.property('my-resource');
      expect(resources['my-resource'].provider).to.equal(provider1)
      expect(resources['my-resource']).to.have.been.calledOnce;
    });

    describe('when called again with no provider', function () {
      beforeEach(function () {
        kaChing('my-resource');
      });
      it('calls the same resource again', function () {
        expect(resources['my-resource']).to.have.been.calledTwice;
        expect(resources['my-resource'].provider).to.equal(provider1);
      })
    });
    describe('when called again with a new provider', function () {
      var provider2 = streamWithContent.bind(null, 'o hai');
      beforeEach(function () {
        kaChing('my-resource', provider2);
      })
      it('calls the resource with that provider', function () {
        expect(resources['my-resource']).to.have.been.calledTwice;
        expect(resources['my-resource'].provider).to.equal(provider2);
      })
    })
  })
})

