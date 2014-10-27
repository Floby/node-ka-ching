var expect = require('chai').expect;

describe('the module', function () {
  it('is requirable', function () {
    var KaChing = require('..');
  });
  it('should be a function', function () {
    var KaChing = require('..');
    expect(KaChing).to.be.a('function');
  });
})
