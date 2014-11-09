var stream = require('stream');

exports.streamWithContent = streamWithContent;

function streamWithContent (content) {
  var result = stream.PassThrough();
  process.nextTick(function () {
    result.end(content);
  });
  return result;
}
