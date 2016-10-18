
var Emitter = require('events'),
    util = require('util'),
    config = require('./config');


function App() {

        Emitter.call(this);

        var Db = require('./db/app'),
            Server = require('./server/app'),
            Process = require('./process/app');

        this.db = new Db();
        this.server = new Server();
        this.process = new Process();
}

util.inherits(App, Emitter);

App.prototype.constructor = App;
App.prototype.start = function() {

    var self = this;
    console.log('go start');

    this.firstTime = true;
    this.db.start();
    this.server.start();



    /*Db events*/

    this.db.on('open', function() {
        console.log('Database opened');
        config.set('db:state', true);
    });

    this.db.on('close', function() {
        config.set('db:state', false);
        self.stopProcess();
    });

    this.db.on('report:created', function(report) {
         self.server.emit('report', report);
    });

    /*End Db events*/

    /*Process events*/

   this.process.on('started', function() {
      console.log('Process init');
   });

    this.process.on('report:create', function(data) {
        self.db.emit('report:create', data);
    });

    this.process.on('device:change:state', function(state, id) {
        console.log('Device state changed');
       self.db.emit('device:change:state', state, id);
    });

    /*End process events*/

    /*Server Events*/

    this.server.on('process:start', this.startProcess.bind(this));

    this.server.on('process:stop',  self.stopProcess.bind(this));

    /*End server events*/

    console.log('App started');

};

App.prototype.writeReview = function() {
    var self = this;

    if(this.firstTime) {
        this.firstTime = false;
        this.db.getDevices(['alive', 'stick']).then(function(items) {
            var alive = items.filter(function(item){ return item.state === 'alive'}),
                stick = items.filter(function(item){ return item.state === 'stick'});

            self.process.emit('review:start', alive);
            self.process.emit('review:ping', stick);
        });
    } else {
        this.db.getDevices(['alive']).then(function(items) {
            self.process.emit('review:start', items);
        });
    }

};

App.prototype.stopProcess = function() {
    console.log('stop process');
    this.process.stop();
    clearInterval(this._interval);
    config.set('process:state', false);
    config.save(function() {
        config.load();
    });
};

App.prototype.startProcess = function() {
    var self = this;
    if(config.get('process:state')) return 'Process started already';
    config.set('process:state', true);
    config.save(function(err) {
        if (err) console.log('Error', err);
        config.load();
        self.process.start();
        self.writeReview();
        self._interval = setInterval(self.writeReview.bind(self), config.get("process:request:interval"));
    });
};

module.exports = App;




