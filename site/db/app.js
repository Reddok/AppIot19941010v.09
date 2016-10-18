var sqlite = require('sqlite3').verbose(),
    path = './db/sqlite.db',
    Controller = require('./controller'),
    controller = new Controller(),
    util = require('util');

function Db() {
    var self = this;

    if (!(this instanceof Db)) {
        return new Db();
    }

    this.database = new sqlite.Database(path, sqlite.OPEN_READWRITE, function(err) {
        if(err) {
            console.log('Error: ', err);
        } else {
            self.emit('open');
        }
    });

    this.start = function() {


        this.on('report:create', this.createReport.bind(this));

        this.on('device:change:state', function(state, id) {
            console.log('device db change state', state, id);
            this.update('device', {_id: id}, {data: {state: state}});
        });

    };

    Controller.call(this);

}

util.inherits(Db, Controller);


module.exports = Db;