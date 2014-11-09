var proxyquire = require('proxyquire');
var stream = require('stream');
var sink = require('stream-sink');
var sinon = require('sinon');
var expect = require('chai').expect;
var path = require('path');
var assert = require('chai').assert;
var streamWithContent = require('./utils').streamWithContent;

var cacheDir = path.join(__dirname, 'cache-test');

describe('A KaChing instance', function () {
  var KaChing = proxyquire('..', {
    'lru-cache': {}
  });
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

  it('is a function', function () {
    expect(kaChing).to.be.a('function');
  });

  it('returns a readable stream', function () {
    var readable = kaChing('bidule', streamWithContent.bind(null, 'Hello World'));
    expect(readable).to.be.an.instanceof(stream.Readable);
  });

  describe('when called with no provider', function () {
    it('throws an error', function () {
      expect(function () {
        var readable = kaChing('bidule');
      }).to.throw(/no provider/i)
    })
  });

  describe('when called with a provider', function () {
    it('calls the provider and returns a stream with its contents', function (done) {
      var provider = sinon.spy(function () {
        return streamWithContent('Hello World');
      });

      kaChing('bidule', provider).pipe(sink()).on('data', function(contents) {
        assert.equal(provider.callCount, 1, 'provider should have been called once');
        expect(contents).to.equal('Hello World');
        done();
      });
    });

    describe('a second time', function () {
      it('does not call the provider again', function (done) {
        var provider = sinon.spy(function () {
          return streamWithContent('Hello World');
        });

        kaChing('chose', provider).pipe(sink()).on('data', function() {
          kaChing('chose', provider).pipe(sink()).on('data', function(contents) {
            assert.equal(provider.callCount, 1, 'provider should have been called once');
            expect(contents).to.equal('Hello World');
            done();
          });
        });
      })
    });
  });

});
