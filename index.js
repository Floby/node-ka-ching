var stream = require('stream');

module.exports = KaChing;

function KaChing () {
  return kaChing;

  function kaChing(id, provider) {
    if(typeof provider !== 'function') {
      return empty()
    }
    return provider();
  }
}



function empty () {
  var empty = stream.PassThrough()
  empty.end();
  return empty;
}
