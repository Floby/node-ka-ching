var stream = require('stream');
var sink = require('stream-sink');
var sinon = require('sinon');
var expect = require('chai').expect;
var path = require('path');
var assert = require('chai').assert;
var streamWithContent = require('./utils').streamWithContent;
var Resource = require('../lib/resource');

var cacheDir = path.join(__dirname, 'cache-test');

describe('A KaChing resource', function () {
  var options = {
    cacheDir : cacheDir
  };
  var resource, provider;
  beforeEach(function () {
    provider = sinon.spy(streamWithContent.bind(null, 'Hello World'));
    resource = new Resource('my-id', provider, options);
  });

  afterEach(function (done) {
    resource.clear(done);
  })

  describe('when given a provider', function () {
    describe('.remove()', function () {
      it('makes the provider called again on next try', function (done) {
        resource().pipe(sink()).on('data', function(data) {
          resource.remove(function (err) {
            if(err) return done(err);
            resource().pipe(sink()).on('data', function(data) {
              assert(provider.calledTwice, 'provider should have been called again');
              assert.equal(data, 'Hello World');
              done();
            })
          })
        });
      });

      it('emits a "remove" event', function (done) {
        var onRemove = sinon.spy();
        resource.on('remove', onRemove);
        resource().pipe(sink()).on('data', function() {
          resource.remove(function (err) {
            if(err) return done(err);
            assert(onRemove.calledOnce, 'onRemove should have been called');
            assert(onRemove.calledWith('my-id'), 'onRemove should have been called with the resource id');
            done();
          });
        });
      });

      it('relays the event on the stream itself', function (done) {
        var onRemove = sinon.spy();
        resource().on('remove', onRemove).pipe(sink()).on('data', function() {
          resource.remove(function (err) {
            if(err) return done(err);
            assert(onRemove.calledOnce, 'onRemove should have been called');
            assert(onRemove.calledWith('my-id'), 'onRemove should have been called with the resource id');
            done();
          });
        });
      })
    });
  })
});

