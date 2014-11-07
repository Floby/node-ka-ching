var crypto = require('crypto');

module.exports = function (string) {
  var hash = crypto.createHash('md5');
  hash.update(string);
  return hash.digest('hex');
};
