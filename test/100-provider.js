var stream = require('stream');
var sink = require('stream-sink');
var sinon = require('sinon');
var expect = require('chai').expect;
var assert = require('chai').assert;
var KaChing = require('..');

describe('A KaChing instance', function () {
  var kaChing;
  beforeEach(function () {
    kaChing = KaChing();
  });

  it('is a function', function () {
    expect(kaChing).to.be.a('function');
  });

  it('returns a readable stream', function () {
    var readable = kaChing('bidule');
    expect(readable).to.be.an.instanceof(stream.Readable);
  });

  describe('when called with no provider', function () {
    it('returns an empty readable stream', function (done) {
      var readable = kaChing('bidule');
      readable.pipe(sink()).on('data', function(contents) {
        expect(contents).to.equal('');
        done();
      });
    })
  });

  describe('when called with a provider', function () {
    it('calls the provider', function (done) {
      var provider = sinon.spy(function () {
        return streamWithContent('Hello World');
      });

      kaChing('chose', provider).pipe(sink()).on('data', function(contents) {
        assert.equal(provider.callCount, 1, 'provider should have been called once');
        expect(contents).to.equal('Hello World');
        done();
      });
    })
  });

});


function streamWithContent (content) {
  var result = stream.PassThrough();
  process.nextTick(function () {
    result.end(content);
  });
  return result;
}
