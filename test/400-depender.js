var expect = require('chai').expect;
var assert = require('chai').assert;

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
