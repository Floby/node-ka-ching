module.exports = lruOptions;

function lruOptions (options) {
  var max;
  if (options.memoryCache === true) {
    max = 5 * 1024 * 1024; // 5 mo
  } else {
    max = options.memoryCache;
  }
  return {
    max: max
  };
}
