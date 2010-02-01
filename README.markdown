# Scrollable

This provides a means to have a more native app "feel" to scrolling in Mobile Safari as well as having fixed position elements on screen. I (rather quickly) extracted this functionality from working on a [jQuery API browser](http://idocs.brandonaaron.net/) for Mobile Safari. Some of it is a bit messy, like the test.html.

## Usage

Just point to a particular element on the page that you want scrollable. If it's scrollHeight is greater than it's offsetHeight, then it will become scrollable.

    var scrollable = new Scrollable(document.getElementById('scrollable'));

You can test it in Safari but desktop/mouse support is half-baked.


### In Action

You can find it being used here: [http://idocs.brandonaaron.net/](http://idocs.brandonaaron.net/)

You can also take a look at the test.html to see it in action... but fair warning it is a bit messy.


## License

This work is Copyright 2010 [Brandon Aaron](http://brandonaaron.net/) and licensed under the MIT license (LICENSE.txt).