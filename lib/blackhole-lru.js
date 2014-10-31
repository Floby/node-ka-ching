module.exports = BlackHoleLRU;
function BlackHoleLRU () {
  if(!(this instanceof BlackHoleLRU)) return new BlackHoleLRU();

  this.has = function () { return false };
  this.set = function () {};
  this.del = function () {};
}

