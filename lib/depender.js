var util = require('util');
var EventEmitter = require('events').EventEmitter;
var CacheDepend = require('cache-depend');

module.exports = Depender;

util.inherits(Depender, EventEmitter);

function Depender () {
  if(!(this instanceof Depender)) return new Depender;
  EventEmitter.call(this);
  var self = this;

  var mainWatcher = CacheDepend.others();
  mainWatcher.once('change', this.emit.bind(this, 'invalid'));

  this.depend = function depend(watcher) {
    mainWatcher.add(watcher);
  }

  this.expires = function (date) {
    this.depend(CacheDepend.date(date));
  };
}

