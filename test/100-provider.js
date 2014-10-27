var stream = require('stream');
var sink = require('stream-sink');
var expect = require('chai').expect;
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

});
