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
    });
  });

  it('has a .doc() method', function () {
    expect(kaChing).to.have.property('doc');
    expect(kaChing.doc).to.be.a('function');
  });

  describe('.doc(provider, callback)', function () {
    var provider, source = {a: 'b', two: 2, hello: 'world'};
    beforeEach(function () {
      provider = sinon.spy(function (cb) {
        cb(null, source);
      });
    })
    it('calls the provider', function(done) {
      kaChing.doc('A', provider, function (err, doc) {
        assert(provider.calledOnce, 'provider not called');
        done();
      });
    });
    it('returns the doc given by the provider', function (done) {
      kaChing.doc('A', provider, function (err, doc) {
        expect(doc).to.deep.equal(source);
        done();
      })
    });
    describe('called a second time', function () {
      beforeEach(function (done) {
        kaChing.doc('A', provider, done);
      });

      it('does not call the provider again', function (done) {
        kaChing.doc('A', provider, function (err, doc) {
          assert.equal(provider.callCount, 1, 'provider called twice');
          done();
        });
      });
      it('returns the doc given by the provider', function (done) {
        kaChing.doc('A', provider, function (err, doc) {
          expect(doc).to.deep.equal(source);
          done();
        })
      });
    });
  });
});
