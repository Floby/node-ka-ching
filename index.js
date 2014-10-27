var stream = require('stream');

module.exports = KaChing;

function KaChing () {
  return kaChing;

  function kaChing() {
    return empty();
  }
}



function empty () {
  var empty = stream.PassThrough()
  empty.end();
  return empty;
}
