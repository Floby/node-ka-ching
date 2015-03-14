[![Build Status][travis-image]][travis-url] [![Coverage][coveralls-image]][coveralls-url]

node-ka-ching
==================

> A caching module for streams

Installation
------------

    npm install --save ka-ching

Usage
-----


#### Basic

Pipe the result of a request to `google.com` and cache it to `my-cached-resource`.
When the cache is already populated, the given provider is not called and the cached
resource is piped instead.

```javascript
var kaChing = require('ka-ching')('/path/to/cache/dir');
var request = require('request');

kaChing('my-cached-resource-id', function () {
  return request('http://google.com/');
}).pipe(destination);

```

#### Delete a cached resource


```javascript
kaChing.remove('my-cached-resource-id', function (err) {
  // called when the file is removed from disk
})

// this will call the provider again
var uncached = kaChing('my-cached-resource-id');
```

The first subsequent request for this ID will call the provider

#### Stale resources

When instanciated with the `useStale` option, then it is possible
to get stale resources (when available) with the `stale()` method.

```javascript
var kaChing = new KaChing('/my/dir', { useStale: true });

kaChing.stale('cached-resource', provider);
kaChing.remove('cached-resource');
kaChing.stale('cached-resource'); // calls the provider but gives you the cached version
```

Note that `stale()` has the exact same signature as the `kaChing()` function and
does exactly the same thing if `useStale` is not set.

This is useful when using invalidation as shown below. If your resource
becomes invalid but you still want to reply rapidly, you can use a stale
version of it.


#### Bypass

You can bypass all caching by instanciating `KaChing` with the `disable` option 

```javascript
var kaChing = new KaChing('/my/dir', { disable: true });

kaChing('my-id', function () {
  return myReadbleStream();
}) ///> always call the provider
```

Invalidation
------------

The `provider` function is called in the context of an object allowing
the user to specify on which factors the current resource should be
invalidated.

A no longer valid resource is `remove()`'d from the cache.

#### Expiration Date

`expires(date)`: you can call this method to specify a date at which the resource
is to be invalidated.
If you provide a string, then a new `Date` object will be constructed from it.

```javascript
kaChing('my-resource', function () {
  var result = getReadableStreamSomehow();
  this.expires('2015-01-01T00:00');
  return result;
});
```

#### Expiration Delay

`expires.in(ms)`: invalidate this resource in `ms` milliseconds.

```javascript
kaChing('my-resource', function () {
  var result = getReadableStreamSomehow();
  this.expires.in(5 * 60 * 1000);
  return result;
});
```

#### Any other expiration rule

`depend(emitter)` : makes the cached resource depend on this. `emitter` is an object
which emits a `'change'` event when the resource should be cleared and has a `invalid`
boolean flag.

Would you be surprised if I told you that [cache-depend][cache-depend-url] provides
exactly this type of objects?

Other invalidation mechanisms may be provided in the future


In-memory caching
-----------------

You can provide a `memoryCache` option to the `KaChing` constructor.
It will in turn also use an `lru-cache` for cached resources.

```javascript
var kaChing = require('ka-ching')('/path/to/cache/dir', {
  memoryCache: true
});
var request = require('request');

kaChing('my-cached-resource-id', function () {
  return request('http://google.com/');
}).pipe(destination);

```

When `memoryCache` is a number instead of a boolean, then its value is used
as the maximum size (in bytes) for the underlying `lru-cache`.

My personal (and unpublished) benchmarks have shown that this is seldom useful
as your OS is probably already doing it with the files that kaChing reads most
often. They have however shown an improvement of roughly 30% for the 98-99% percentiles of
requests in a HTTP server.


Test
----

	npm test
    
Tests are written with mocha and coverage is made by istanbul.


Gotchas
-------

* Only works with `text/buffer` streams. If you'd like to cache `objectMode` streams,
you should handle serialisation/deserialisation yourself
* Does not play well with concurrent access to the file system
* Cannot recover from file system after restart

These are not necessarily intended and may be handled in the future

Contributing
------------

Anyone is welcome to submit issues and pull requests at [http://github.com/Floby/node-ka-ching](http://github.com/Floby/node-ka-ching)


License
-------

[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2015 Florent Jaby

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


[travis-image]: http://img.shields.io/travis/Floby/node-ka-ching/master.svg?style=flat
[travis-url]: https://travis-ci.org/Floby/node-ka-ching
[coveralls-image]: http://img.shields.io/coveralls/Floby/node-ka-ching/master.svg?style=flat
[coveralls-url]: https://coveralls.io/r/Floby/node-ka-ching
[cache-depend-url]: https://github.com/Floby/node-cache-depend

