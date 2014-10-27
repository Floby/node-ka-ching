var expect = require('chai').expect;

describe('the module', function () {
  it('is requirable', function () {
    var KaChing = require('..');
  });
  it('is a function', function () {
    var KaChing = require('..');
    expect(KaChing).to.be.a('function');
  });
})
