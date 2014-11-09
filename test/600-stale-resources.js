var stream = require('stream');
var sink = require('stream-sink');
var sinon = require('sinon');
var expect = require('chai').expect;
var path = require('path');
var assert = require('chai').assert;
var streamWithContent = require('./utils').streamWithContent;
var KaChing = require('..');

var cacheDir = path.join(__dirname, 'cache-test');

describe('A KaChing instance', function () {
  describe('instanciated with the useStale option', function () {
    var kaChing;
    beforeEach(function () {
      kaChing = KaChing(cacheDir, { useStale: true });
    });

    afterEach(function (done) {
      kaChing.clear(function (err) {
        if(/ENOENT/.test(err)) return done();
        done(err);
      })
    })

    describe('.stale()', function () {
      it('calls the provider and streams its contents', function (done) {
        var provider = sinon.spy(streamWithContent.bind(null, 'Hello World'));

        kaChing.stale('bidule', provider).pipe(sink()).on('data', function(contents) {
          assert.equal(provider.callCount, 1, 'provider should have been called once');
          expect(contents).to.equal('Hello World');
          done();
        });
      });
    })
  });
})
