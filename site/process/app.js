var Controller = require('./controller'),
    util = require('util'),
    ErrorFactory = require('../libs/errorHandler'),
    ErrorHandler = require('../libs/sendError'),
    config = require('../config');

function ControlProcess() {

    Controller.call(this);

    this.items = [];
    this.restored = [];

}

util.inherits(ControlProcess, Controller);

ControlProcess.prototype.start = function() {
    var self = this;

    this.on('review:start', this.review.bind(this));

    this.on('review:ping', function(items) {
        items.forEach(function(item) {
            self.ping(item, 0);
        });
    });

    this.on('review:error', function(err, deviceId) {
        err = ErrorFactory('Process', err.message, deviceId);
        ErrorHandler.handleError(err);
    });

    console.log('about to emiting event');
    this.emit('started');

};

ControlProcess.prototype.stop = function() {

    this.removeAllListeners('review:start');
    this.removeAllListeners('review:ping');

};


module.exports = ControlProcess;
