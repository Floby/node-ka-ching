'use strict';
var proxyquire = require('proxyquire');
var stream = require('stream');
var sink = require('stream-sink');
var sinon = require('sinon');
var expect = require('chai').expect;
var path = require('path');
var assert = require('chai').assert;
var Depender = require('../lib/depender');

var cacheDir = path.join(__dirname, 'cache-test');

describe('A KaChing instance', function () {
  var depender;
  var DependerMock;
  var kaChing;
  beforeEach(function () {
    DependerMock = sinon.spy(function () {
      depender = new Depender();
      return depender;
    });
    var KaChing = proxyquire('..', {
      './lib/depender': DependerMock
    })
    kaChing = KaChing(cacheDir);
  });

  afterEach(function (done) {
    kaChing.clear(function (err) {
      if(/ENOENT/.test(err)) return done();
      done(err);
    })
  })

  describe('when calling the provider', function () {
    it('calls it with a Depender as `this`', function (done) {
      var provider = sinon.spy(function () {
        return streamWithContent("Hey!!!");
      })
      kaChing('hello', provider).pipe(sink()).on('data', function(data) {
        assert(DependerMock.called, 'Depender mock should be constructed');
        assert(provider.calledOn(depender), 'provider should have been called on depender');
        done();
      });
    });
  }); 

});



function streamWithContent (content) {
  var result = stream.PassThrough();
  process.nextTick(function () {
    result.end(content);
  });
  return result;
}
