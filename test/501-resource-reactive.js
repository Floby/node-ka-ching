var proxyquire = require('proxyquire');
var stream = require('stream');
var sink = require('stream-sink');
var sinon = require('sinon');
var expect = require('chai').expect;
var path = require('path');
var assert = require('chai').assert;
var CacheDepend = require('cache-depend');
var streamWithContent = require('./utils').streamWithContent;
var Resource = require('../lib/resource');

var cacheDir = path.join(__dirname, 'cache-test');

describe('A KaChing resource', function () {
  var resource, provider, manual;
  var DependerMock;
  afterEach(function (done) {
    resource.clear(done);
  });

  describe('instanciated with `true` as the reactive option', function () {
    var options = {
      cacheDir: cacheDir,
      reactive: true
    };
    beforeEach(function () {
      provider = sinon.spy(function () {
        manual = CacheDepend.manual();
        this.depend(manual);
        return streamWithContent('hello world');
      });
      resource = Resource('my-id', provider, options);
    });

    describe('when a cached resource expires', function () {
      it('automatically calls the provider again', function (done) {
        resource().pipe(sink()).on('data', function() {
          assert(provider.calledOnce, 'provider should have been called once');
          setTimeout(manual.invalidate.bind(manual), 20);
          setTimeout(function () {
            assert(provider.calledTwice, 'provider should have been called again');
            resource().pipe(sink()).on('data', function(data) {
              expect(data).to.equal('hello world');
              assert(provider.calledTwice, 'provider was unnecessarily called')
              done();
            });
          }, 40);
        });
      });
    });
  })
})

