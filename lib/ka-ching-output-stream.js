var util = require('util');
var PassThrough = require('stream').PassThrough;

module.exports = KaChingOutputStream;

util.inherits(KaChingOutputStream, PassThrough);
function KaChingOutputStream (options) {
  PassThrough.call(this, options);
}
