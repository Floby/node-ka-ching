var expect = require('chai').expect;
var assert = require('chai').assert;
var sinon = require('sinon');
var CacheDepend = require('cache-depend');
var EventEmitter = require('events').EventEmitter;

var Depender = require('../lib/depender');

describe('Depender', function () {
  it('is a function', function () {
    expect(Depender).to.be.a('function');
  });
  it('is a constructor', function () {
    var depender = new Depender();
    expect(depender).to.be.an.instanceof(Depender);
  });
  it('is a constructor without new', function () {
    var depender = Depender();
    expect(depender).to.be.an.instanceof(Depender);
  });
});

describe('a Depender instance', function () {
  describe('.depend(watcher)', function () {
    it('becomes invalid when the watcher emits "change"', function(done) {
      var depender = new Depender();
      var watcher = CacheDepend.manual();
      depender.depend(watcher);
      setTimeout(function () {
        depender.once('invalid', function() {
          done();
        });

        setTimeout(watcher.invalidate.bind(watcher), 5);
      }, 5);
    });
  });

  describe('.expires(date)', function () {
    var onDate, emitter;
    beforeEach(function () {
      emitter = new EventEmitter();
      onDate = sinon.stub(CacheDepend, 'date').returns(emitter);
    });
    afterEach(function () {
      onDate.restore();
    })
    it('uses a cache-depend Date instance', function (done) {
      var depender = new Depender();
      var date = new Date();
      depender.expires(date);
      assert(onDate.calledWith(date), 'CacheDepend.date should have been called');
      depender.on('invalid', function() {
        done();
      });

      setTimeout(function() {
        emitter.emit('change', {});
      }, 5)
    });
  });
});
