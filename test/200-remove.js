var stream = require('stream');
var sink = require('stream-sink');
var sinon = require('sinon');
var expect = require('chai').expect;
var path = require('path');
var assert = require('chai').assert;
var KaChing = require('..');

var cacheDir = path.join(__dirname, 'cache-test');

describe('A KaChing instance', function () {
  var kaChing;
  beforeEach(function () {
    kaChing = KaChing(cacheDir);
  });

  afterEach(function (done) {
    kaChing.clear(function (err) {
      if(/ENOENT/.test(err)) return done();
      done(err);
    })
  })

  describe('when given a provider', function () {
    describe('.remove()', function () {
      it('makes the provider called again on next try', function (done) {
        var provider = sinon.spy(function () {
          return streamWithContent('Hello Again');
        });
        kaChing('something', provider).pipe(sink()).on('data', function(data) {
          kaChing.remove('something', function (err) {
            if(err) return done(err);
            kaChing('something').pipe(sink()).on('data', function(data) {
              assert(provider.calledTwice, 'provider should have been called again');
              assert.equal(data, 'Hello Again');
              done();
            })
          })
        });
      });

      it('emits a "remove" event', function (done) {
        var provider = streamWithContent.bind(null, 'Hey Hoy');
        var onRemove = sinon.spy();
        kaChing.on('remove', onRemove);
        kaChing('to-remove', provider).pipe(sink()).on('data', function() {
          kaChing.remove('to-remove', function (err) {
            if(err) return done(err);
            assert(onRemove.calledOnce, 'onRemove should have been called');
            assert(onRemove.calledWith('to-remove'), 'onRemove should have been called with the resource id');
            done();
          });
        });
      });
    });
  })
});


function streamWithContent (content) {
  var result = stream.PassThrough();
  process.nextTick(function () {
    result.end(content);
  });
  return result;
}
