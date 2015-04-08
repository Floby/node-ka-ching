var proxyquire = require('proxyquire');
var stream = require('stream');
var sink = require('stream-sink');
var blackhole = require('stream-blackhole');
var sinon = require('sinon');
var expect = require('chai').expect;
var path = require('path');
var assert = require('chai').assert;
var KaChingOutputStream = require('../lib/ka-ching-output-stream');
var streamWithContent = require('./utils').streamWithContent;
var BlackholeLRU = require('../lib/blackhole-lru');

var cacheDir = path.join(__dirname, 'cache-test');

describe('A KaChing resource', function () {
  var Resource = require('../lib/resource');
  var options = {
    cacheDir: cacheDir,
    lru: new BlackholeLRU()
  };
  var resource, provider;
  beforeEach(function () {
    provider = sinon.spy(streamWithContent.bind(null, 'Hello World'));
    resource = new Resource('my-id', provider, options);
  });

  afterEach(function (done) {
    resource.clear(done);
  })

  describe('instanciated with no provider', function () {
    it('throws an error', function () {
      expect(function () {
        new Resource('some-other-id');
      }).to.throw(/no provider/i)
    })
  });

  it('is a function', function () {
    expect(resource).to.be.a('function');
  });

  it('returns a readable stream', function (done) {
    var readable = resource();
    expect(readable).to.be.an.instanceof(stream.Readable);
    readable.pipe(blackhole()).on('finish', done);
  });

  it('returns a KaChingOutputStream', function (done) {
    var readable = resource();
    expect(readable).to.be.an.instanceof(KaChingOutputStream);
    readable.pipe(blackhole()).on('finish', done);
  });

  describe('when called', function () {
    it('calls the provider and returns a stream with its contents', function (done) {
      resource().pipe(sink()).on('data', function(contents) {
        assert.equal(provider.callCount, 1, 'provider should have been called once');
        expect(contents).to.equal('Hello World');
        done();
      });
    });

    describe('a second time', function () {
      it('does not call the provider again', function (done) {
        resource().pipe(sink()).on('data', function() {
          resource().pipe(sink()).on('data', function(contents) {
            assert.equal(provider.callCount, 1, 'provider should have been called once');
            expect(contents).to.equal('Hello World');
            done();
          });
        });
      })
    });
  });

});

