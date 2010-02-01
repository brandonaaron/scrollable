/*!
 * Copyright 2010, Brandon Aaron (http://brandonaaron.net/)
 * Licensed under the MIT license: LICENSE.txt.
 */
(function() {
    // mouse support is half-baked
    var touchSupport = (typeof Touch == "object"),
        touchstart   = touchSupport ? 'touchstart' : 'mousedown',
        touchmove    = touchSupport ? 'touchmove'  : 'mousemove',
        touchend     = touchSupport ? 'touchend'   : 'mouseup';
        
    /**
     * Simple point/coordinate object with some helper methods
     */
    function Point(x,y) {
        if (!(this instanceof Point)) return new Point(x,y);
    
        if (x instanceof Point) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x;
            this.y = y;
        }
    
        this.constructor = Point;
    }

    Point.prototype = {
        set: function(x,y) {
            this.x = x;
            this.y = y;
            return this;
        },
    
        copy: function(point) {
            this.x = point.x;
            this.y = point.y;
            return this;
        },
    
        subtract: function(point1, point2) {
            if (arguments.length === 1) {
                this.x = this.x - point1.x;
                this.y = this.y - point1.y;
            } else {
                this.x = point1.x - point2.x;
                this.y = point1.y - point2.y;
            }
            return this;
        },
    
        abs: function() {
            this.x = Math.abs(this.x);
            this.y = Math.abs(this.y);
            return this;
        },
    
        keepInBounds: function(minPoint, maxPoint) {
            this.x = Math.min(Math.max(this.x, minPoint.x), maxPoint.x);
            this.y = Math.min(Math.max(this.y, minPoint.y), maxPoint.y);
            return this;
        }
    };

    function Scrollable(target) {
        this.target = target;
    
        this.target.addEventListener(touchstart, this, false);
    
        this.constructor = Scrollable;
    }

    Scrollable.prototype = {
        /**
         * The element that is being scrolled
         */
        target: null,
    
        /**
         * The current scrolled offset as a Point
         */
        current: new Point(0,0),
    
        /**
         * The last scroll offset as a Point during a touchmove event
         */
        last: new Point(0,0),
    
        /**
         * The starting offset as a Point for a touchstart event
         */
        start: new Point(0,0),
    
        /**
         * The stopping offset as a Point for a touchend event
         */
        stop: new Point(0,0),
    
        touchCurrent: new Point(0,0),
        touchLast: new Point(0,0),
    
        /**
         * The starting coordinates as a Point for a touchstart event
         */
        touchStart: new Point(0,0),
    
        /**
         * The stopping coordinate as a Point for a touchstart event
         */
        touchStop: new Point(0,0),
    
        /**
         * The minimum value for the scroll offset as a Point
         */
        min: new Point(0,0),
    
        /**
         * The maximum value for the scroll offset as a Point
         */
        max: new Point(0,0),
    
        /**
         * If the object was actually moved during a touchstart and touchend event
         * Also doubles as the time of the last move operation.
         * Will be set to false if no movement occured, otherwise is set to a timestamp
         */
        moved: false,
    
        set duration(time) {
            this._duration = time;
            this.target.style.webkitTransitionDuration = time + 's';
        },
    
        get duration() {
            return this._duration;
        },
    
        set endPoint(point) {
            this.target.style.webkitTransform = 'translate3d(' + point.x + 'px, ' + point.y + 'px, 0)';
        },
    
        handleEvent: function(event) {
            var type = event.type;
            (type === 'touchmove' || type === 'mousemove') && event.preventDefault();
            this[type].apply(this, arguments);
        },
    
        touchstart: function(event) {
            var touched = touchSupport ? event.touches[0] : event;
        
            this.min.y = -(this.target.scrollHeight - this.target.offsetHeight);
            this.min.x = -(this.target.scrollWidth - this.target.offsetWidth);
        
            this.finishTransition();
        
            // the raw starting coords
            this.touchStart.set(touched.clientX, touched.clientY);
            this.touchCurrent.copy(this.touchStart);
        
            // the adjusted starting coords
            this.start.copy(this.touchStart).subtract(this.current);
        
            this.addDocEvents();
        },
    
        touchmove: function(event) {
            var touched = touchSupport ? event.touches[0] : event;
        
            this.moved = event.timeStamp;
        
            this.touchLast.copy(this.touchCurrent);
            this.touchCurrent.set(touched.clientX, touched.clientY);
        
            this.last.copy(this.current);
            this.current.copy(this.touchCurrent).subtract(this.start);
        
            if (this.min.x === this.max.x) {
                this.current.x = this.min.x;
            }
            if (this.min.y === this.max.y) {
                this.current.y = this.min.y;
            }
        
            if (this.isOutOfBounds(this.current)) this.addResistance();
        
            this.moveTo(this.current);
        },
    
        touchend: function(event) {
            this.removeDocEvents();
            if (this.moved === false) {
                // could still be out of bounds if touched while out of bounds... need to snap back if so
                if (this.isOutOfBounds(this.current)) {
                    this.duration = 0.3;
                    this.moveTo(this.current.keepInBounds(this.min, this.max));
                }
                return;
            }
        
            var pointDiff = new Point(this.current).subtract(this.last),
                timeDiff = event.timeStamp - this.moved,
                touchDistance = new Point(pointDiff).abs(),
                speedY = Math.abs(pointDiff.y) / timeDiff,
                speedX = Math.abs(pointDiff.x) / timeDiff;
        
            this.moved = false;
            // console.log(pointDiff.x + ' ' + touchDistance.x + ' ' + this.current.x + ' ' + this.last.x);
        
            // if we didn't *really* flick, then don't keep on scrolling
            if (touchDistance.y <= 5 && touchDistance.x <= 5) {
                if (this.isOutOfBounds(this.current)) {
                    this.current.keepInBounds(this.min, this.max);
                    this.duration = 0.3;
                    this.moveTo(this.current);
                }
                return;
            }
        
            this.current.y = this.current.y + (pointDiff.y * timeDiff);
            this.current.x = this.current.x + (pointDiff.x * timeDiff);
        
            // limit the distance it can scroll out of bounds so it doesn't fly off the screen
            this.keepOnScreen();

            // base the duration on wether or not the the last coordinate was out of bounds
            if (this.isOutOfBounds(this.last)) {
                this.duration = 0.3;
            } else {
                var adjustedPointDiff = new Point(this.current).subtract(this.last).abs();
                this.duration = speedY > speedX ? 
                                    (adjustedPointDiff.y / (speedY/2)*3)/1000:
                                    (adjustedPointDiff.x / (speedX/2)*3)/1000;
            }
        
            // if we are heading out of bounds, snap back
            if (this.isOutOfBounds(this.current)) {
                var self = this;
                this.target.addEventListener('webkitTransitionEnd', function snap() {
                    self.target.removeEventListener('webkitTransitionEnd', snap, false);
                    self.duration = 0.3;
                    self.moveTo(self.current.keepInBounds(self.min, self.max));
                }, false);
            }
        
            this.moveTo(this.current);
        },
    
        touchcancel: function(event) {
            this.moved = false;
            this.removeDocEvents();
        },
    
        moveTo: function(point) {
            this.endPoint = point;
        },
    
        keepOnScreen: function() {
            var extraYDistance = this.target.offsetHeight/5;
            if (this.current.y > this.max.y+extraYDistance && this.last.y <= this.max.y) {
                this.current.y = this.max.y + extraYDistance;
            } else if (this.current.y < this.min.y-extraYDistance && this.last.y >= this.min.y) {
                this.current.y = this.min.y - extraYDistance;
            } else {
                this.current.y = Math.min(Math.max(this.current.y, this.min.y), this.max.y);
            }
        
            var extraXDistance = this.target.offsetWidth/5;
            if (this.current.x > this.max.x+extraXDistance && this.last.x <= this.max.x) {
                this.current.x = this.max.x + extraXDistance;
            } else if (this.current.x < this.min.x-extraXDistance && this.last.x >= this.min.x) {
                this.current.x = this.min.x - extraXDistance;
            } else {
                this.current.x = Math.min(Math.max(this.current.x, this.min.x), this.max.x);
            }
        },
    
        isOutOfBounds: function(point) {
            return this.isYOutOfBounds(point) || this.isXOutOfBounds(point);
        },
    
        isYOutOfBounds: function(point) {
            return point.y < this.min.y || point.y > this.max.y;
        },
    
        isXOutOfBounds: function(point) {
            return point.x < this.min.x || point.x > this.max.x;
        },
    
        addResistance: function() {
            // this feels icky :(
            if (this.current.y < this.min.y || this.current.y > this.max.y) {
                if (this.current.y > 0) {
                    this.current.y = this.current.y/3;
                } else {
                    var overage = this.min.y - this.current.y;
                    this.current.y = this.current.y + (overage/1.5);
                }
            }
        
            if (this.current.x < this.min.y || this.current.x > this.max.x) {
                if (this.current.x > 0) {
                    this.current.x = this.current.x/3;
                } else {
                    var overage = this.min.x - this.current.x;
                    this.current.x = this.current.x + (overage/1.5);
                }
            }
        },
    
        finishTransition: function() {
            var transform = new WebKitCSSMatrix(window.getComputedStyle(this.target).webkitTransform);
                point = new Point(transform.m41, transform.m42);
        
            if (point.x != this.current.x || point.y != this.current.y) {
                this.duration = 0;
                this.current.copy(point);
                this.moveTo(this.current);
            }
        },
    
        addDocEvents: function() {
            document.addEventListener(touchmove, this, false);
            document.addEventListener(touchend, this, false);
            document.addEventListener('touchcancel', this, false);
        },
    
        removeDocEvents: function() {
            document.removeEventListener(touchmove, this, false);
            document.removeEventListener(touchend, this, false);
            document.removeEventListener('touchcancel', this, false);
        }
    };
    
    Scrollable.prototype.mousedown = Scrollable.prototype.touchstart;
    Scrollable.prototype.mousemove = Scrollable.prototype.touchmove;
    Scrollable.prototype.mouseup = Scrollable.prototype.touchend;
    
    // expose it globally
    this.Scrollable = Scrollable;
}).call(this);