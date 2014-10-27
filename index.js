var stream = require('stream');

module.exports = KaChing;

function KaChing () {
  return function () {
    return stream.Readable();
  }
}
