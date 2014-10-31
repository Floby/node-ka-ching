var util = require('util');
var EventEmitter = require('events').EventEmitter;
var CacheDepend = require('cache-depend');

module.exports = Depender;

util.inherits(Depender, EventEmitter);

function Depender () {
  if(!(this instanceof Depender)) return new Depender;
  EventEmitter.call(this);

  var mainWatcher = CacheDepend.others();
  this.depend = function depend(watcher) {
    mainWatcher.add(watcher);
  }

  mainWatcher.once('change', this.emit.bind(this, 'invalid'));
}

