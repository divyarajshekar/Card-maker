(function(window, document, cardmaker, undefined) {
    "use strict";

    /**
     * The InvalidateEvent contains information about a Drawable object that has been invalidated.
     *
     * @author Chris Harris <c.haris@hotmail.com>
     * @version 1.0.0
     * @since 1.1.0
     */
    function InvalidateEvent(type, target) {
        /**
         * A reference to this object.
         *
         * @typedef {InvalidateEvent}
         * @private
         */
        var self = this;

        /**
         * The Drawable that is invalid.
         *
         * @typedef {cardmaker.Drawable}
         * @public
         */
        self.target = null;

        /**
         * Initialize the InvalidateEvent.
         *
         * @param {String} type - the event type.
         * @param {cardmaker.Drawable} target - the Drawable that has been invalidated.
         * @private
         */
        function init(type, target) {
            // call parent constructor.
            cardmaker.Event.call(self, type);

            self.target = target;
        }
        init(type, target);
    }

    // inherit from cardmaker.Event.
    InvalidateEvent.prototype = Object.create(cardmaker.Event.prototype);
    InvalidateEvent.prototype.constructor = InvalidateEvent;

    /**
     * The Drawable class represents "something that can be drawn" onto a {@link cardmaker.Canvas} object.
     *
     * @author Chris Harris <c.harris@hotmail.com>
     * @version 1.0.0
     * @since 1.0.0
     */
    function Drawable() {
        /**
         * A reference to this object.
         *
         * @typedef {Drawable}
         * @private
         */
        var self = this;

        /**
         * The boundaries of this drawable.
         *
         * @typedef {cardmaker.Bounds}
         * @private
         */
        self.bounds = new cardmaker.Bounds();

        /**
         * A drawable object that contains this drawable.
         *
         * @typedef {cardmaker.Drawable}
         * @private
         */
        self.parent = null;

        /**
         * A transformation matrix.
         *
         * @typedef {cardmaker.Matrix}
         * @private
         */
        self.matrix = null;

        /**
         * A lock that prevents the drawable from being invalidated while drawing.
         *
         * @typedef {cardmaker.Lock}
         * @private
         */
        self.lock = new cardmaker.Lock();

        /**
         * A flag that determines whether this drawable should be redrawn.
         *
         * @type {Boolean}
         * @private
         */
        self.valid = false;

        /**
         * Initialize the Drawable.
         *
         * @private
         */
        function init() {
            // call parent constructor.
            cardmaker.MVCObject.call(self);

            self.matrix = new cardmaker.Matrix();
            self.matrix.addChangeListener(self.onPropertyChange.bind(self));
        }
        init();
    }

    // inherit from cardmaker.MVCObject.
    Drawable.prototype = Object.create(cardmaker.MVCObject.prototype);
    Drawable.prototype.constructor = Drawable;

    /**
     * Draw this {@link cardmaker.Drawable} onto the specified {@link cardmaker.Canvas}.
     *
     * The draw method ensures that the {@link cardmaker.Drawable#invalidate()} method is locked
     * for the duration of the draw operation and this allows the properties of a drawable to be
     * changed from the {@link cardmaker.onDraw(canvas}} method.
     *
     * @param {cardmaker.Canvas} canvas - the canvas on which to draw.
     * @see {@link cardmaker.Drawable#onDraw(canvas)
     * @private
     */
    Drawable.prototype.draw = function(canvas) {
        if (this.lock.tryLock()) {
            this.onDraw(canvas);
            this.lock.unlock();
        }

        this.valid = true;
    }

    /**
     * Draw this {@link cardmaker.Drawable} onto the specified {@link cardmaker.Canvas}.
     *
     * Don't call this method directly, instead call the {@link cardmaker.Drawable#invalidate()} method
     * and allow the canvas to compute if other objects should be invalidated and redrawn.
     *
     * @param {cardmaker.Canvas} canvas - the canvas on which to draw.
     * @public
     * @abstract
     */
    Drawable.prototype.onDraw = function(canvas) {
        throw new Error('This method must be implemented by a subclass.');
    }

    /**
     * Invalidate this {@link cardmaker.Drawable} and redraw it at some point in the future.
     *
     * @see {@link cardmaker.Drawable#draw(canvas)}
     * @public
     */
    Drawable.prototype.invalidate = function() {
        this.valid = false;
        this.dispatch('invalidate', new InvalidateEvent('invalidate', this));
    }

    /**
     * Determines whether this drawable needs to be redrawn.
     *
     * @return {Boolean} true if the drawable is valid and does not need to be redraw, otherwise false.
     */
    Drawable.prototype.isValid = function() {
        return this.valid;
    }

    /**
     * Set the parent of this drawable.
     *
     * @param {cardmaker.DrawableContainer|null} parent - the parent of this drawable, or null to remove the current parent.
     * @throws {TypeError} if the specified argument is not a {@link cardmaker.DrawableContainer} or null literal.
     * @public
     */
    Drawable.prototype.setParent = function(parent) {
        if (!(parent instanceof cardmaker.DrawableContainer) && parent !== null ) {
            throw new TypeError('Drawable expects parent to be a cardmaker.DrawableContainer object');
        }

        this.parent = parent;
    }

    /**
     * Returns if present the parent this drawable.
     *
     * @return {cardmaker.DrawableContainer|null} the parent of this drawable, or null if this drawable has no parent.
     * @public
     */
    Drawable.prototype.getParent = function() {
        return this.parent;
    }

    /**
     * Returns a {@link cardmaker.Bounds} object containing the global boundaries.
     *
     * @return {@cardmaker.Bounds} the global boundaries.
     */
    Drawable.prototype.getBounds = function() {
        var bounds = this.getLocalBounds();
        var point  = this.localToGlobal(cardmaker.Point.createFromBounds(bounds));

        bounds.setMinX(point.getX());
        bounds.setMinY(point.getY());

        return bounds;
    }

    /**
     * Returns a {@link cardmaker.Bounds} object containing the local boundaries.
     *
     * The boundaries returned by this method may be same as the {@link cardmaker.Drawable#getBounds()} method
     * if this node has no parent and instead has been added directly to the canvas.
     *
     * @return {cardmaker.Bounds} the local boundaries.
     */
    Drawable.prototype.getLocalBounds = function() {
        var bounds = new cardmaker.Bounds();
        if (this.bounds instanceof cardmaker.Bounds) {
            bounds.setMinX(this.getX());
            bounds.setMinY(this.getY());
            bounds.setWidth(this.getWidth());
            bounds.setHeight(this.getHeight());
        }

        return bounds;
    }

    /**
     * Set the x coordinate of this drawable which will be relative to the parent location.
     *
     * @param {Number} x - the x coordinates of the drawable.
     * @public
     */
    Drawable.prototype.setX= function(x) {
        this.bounds.setMinX(x);
    }

    /**
     * Returns the x coordinate of this drawable which is relative to the parent location.
     *
     * @return {Number} the x coordinates of the drawable.
     * @public
     */
    Drawable.prototype.getX = function() {
        return this.bounds.getMinX();
    }

    /**
     * Set the y coordinate of this drawable which will be relative to the parent location.
     *
     * @param {Number} y - the y coordinates of the drawable.
     * @public
     */
    Drawable.prototype.setY = function(y) {
        this.bounds.setMinY(y);
    }

    /**
     * Returns the y coordinate of this drawable which is relative to the parent location.
     *
     * @return {Number} the y coordinates of the drawable.
     * @public
     */
    Drawable.prototype.getY = function() {
        return this.bounds.getMinY();
    }

    /**
     * Set the width of this drawable in pixels.
     *
     * @param {Number} width - the width of the drawable.
     */
    Drawable.prototype.setWidth = function(width) {
        this.bounds.setWidth(width);
    }

    /**
     * Returns the width of this drawable in pixels.
     *
     * @return {Number} the width of the drawable.
     */
    Drawable.prototype.getWidth = function() {
        return this.bounds.getWidth();
    }

    /**
     * Set the height of this drawable in pixels.
     *
     * @param {Number} height - the height of the drawable.
     */
    Drawable.prototype.setHeight = function(height) {
        this.bounds.setHeight(height);
    }

    /**
     * Returns the height of this drawable in pixels.
     *
     * @return {Number} the height of the drawable.
     */
    Drawable.prototype.getHeight = function() {
        return this.bounds.getHeight();
    }

    /**
     * Converts the point object from the drawable (local) coordinates to the canvas (global) coordinates.
     *
     * @param {cardmaker.Point} point - the local coordinates to convert.
     * @return {cardmaker.Point} a Point object containing the global coordinates.
     * @public
     */
    Drawable.prototype.localToGlobal = function(point) {
        var parent = this.getParent();
        while (parent instanceof cardmaker.Drawable) {
            point  = point.add(parent.bounds.getMinX(), parent.bounds.getMinY());
            parent = parent.getParent();
        }

        return point;
    }

    /**
     * Converts the point object from the canvas (global) coordinates to the drawable (local) coordinates.
     *
     * @param {cardmaker.Point} point - the global coordinates to convert.
     * @return {cardmaker.Point} a Point object containing the local coordinates.
     * @public
     */
    Drawable.prototype.globalToLocal = function(point) {
        var parent = this.getParent();
        while (parent instanceof cardmaker.Drawable) {
            point  = point.subtract(parent.bounds.getMinX(), parent.bounds.getMinY());
            parent = parent.getParent();
        }

        return point;
    }

    /**
     * Invalidate the drawable when it's properties change.
     *
     * @param {cardmaker.Event} event - an Event object containing details about this event.
     * @see {@link cardmaker.Drawable#invalidate()}
     * @see {@link cardmaker.Lock}
     * @public
     */
    Drawable.prototype.onPropertyChange = function(event) {
        if (!this.lock.isLocked()) {
            this.invalidate();
        }
    }

    // add Drawable to namespace.
    cardmaker.Drawable = Drawable;
    // add InvalidateEvent to namespace.
    cardmaker.InvalidateEvent = InvalidateEvent;

})(this, this.document, this.cardmaker = this.cardmaker || {});
