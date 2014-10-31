[![Build Status][travis-image]][travis-url] [![Coverage][coveralls-image]][coveralls-url]

node-ka-ching
==================

> A caching module for streams

Installation
------------

    npm install --save ka-ching

Usage
-----


##### Basic

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

##### delete a cached resource


```javascript
kaChing.remove('my-cached-resource-id', function (err) {
  // called when the file is removed from disk
})

// this will call the provider again
var uncached = kaChing('my-cached-resource-id');
```

The first subsequent request for this ID will call the provider

##### in-memory caching

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
often. They have however showed some improvement for the 98-99% percentiles
in a HTTP server of roughly 30%.


Test
----

	npm test
    
Tests are written with mocha and coverage is made by istanbul.


Gotchas
-------

* Only works with `text/buffer` streams. If you'd like to cache `objectMode` streams,
you should handle serialisation/deserialisation yourself
* No intelligence whatsoever as to when to invalidate cached data
* Does not play well with concurrent access to the file system
* Cannot recover from file system after restart

These are not necessarily intended and may be handled in the future

Contributing
------------

Anyone is welcome to submit issues and pull requests at [http://github.com/Floby/node-ka-ching](http://github.com/Floby/node-ka-ching)


License
-------

[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2014 Florent Jaby

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


[travis-image]: http://img.shields.io/travis/Floby/node-ka-ching/master.svg?style=flat
[travis-url]: https://travis-ci.org/Floby/node-ka-ching
[coveralls-image]: http://img.shields.io/coveralls/Floby/node-ka-ching/master.svg?style=flat
[coveralls-url]: https://coveralls.io/r/Floby/node-ka-ching


