var expect = require('chai').expect;
var KaChing = require('..');

describe('A KaChing instance', function () {
  it('is a function', function () {
    var instance = KaChing();
    expect(instance).to.be.a('function');
  });
});
