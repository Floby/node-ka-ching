var stream = require('stream');
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
});
