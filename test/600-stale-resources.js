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

      describe('called a second time after a remove', function () {
        it('calls the provider but streams the first content', function(done) {
          var count = 0;
          var provider = sinon.spy(function () {
            return streamWithContent('O HAI ' + (++count));
          });

          kaChing.stale('chose', provider).pipe(sink()).on('data', function(contents) {
            assert.equal(provider.callCount, 1, 'provider should have been called once');
            expect(contents).to.equal('O HAI 1');
            kaChing.remove('chose', function (err) {
              if(err) return done(err);
              kaChing.stale('chose', provider).pipe(sink()).on('data', function(contents) {
                assert.equal(provider.callCount, 2, 'provider should have been called twice');
                expect(contents).to.equal('O HAI 1');
                setTimeout(function () {
                  kaChing.stale('chose', provider).pipe(sink()).on('data', function(contents) {
                    assert.equal(provider.callCount, 2, 'provider should not have been called again');
                    expect(contents).to.equal('O HAI 2');
                    done();
                  });
                }, 20);
              });
            });
          });
        })
      })
    })
  });
})
