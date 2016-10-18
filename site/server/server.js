var koa = require('koa'),
    http = require('http'),
    router = require('./routes/index'),
    logger = require('koa-logger'),
    parser = require('koa-bodyparser'),
    render = require('koa-ejs'),
    ErrorsFactory = require('../libs/errorHandler'),
    ErrorHandler = require('../libs/sendError'),
    xhr = require('koa-request-xhr'),
    db = require('../db/app'),
    events = require('events'),
    cluster = require('cluster'),
    app, server;


app = koa();
app.events = new events.EventEmitter();

app.use(parser());
app.use(logger());
app.use(xhr());

app.events.on('process:start', function() {
    process.send({type: 'event', name: 'process:start'})
});

app.events.on('process:stop', function() {
    process.send({type: 'event', name: 'process:stop'})
});

render(app, {
    root: __dirname + '/public',
    layout: false,
    viewExt: 'ejs',
    cache: false,
    debug: true
});

app.use(function* (next) {
    try{
        yield next;
    }catch(err) {
        console.log('Server Error:', err, 'isHttp?', err instanceof ErrorsFactory.constructors.HttpError);
        if(err instanceof ErrorsFactory.constructors.HttpError) {
            this.status = err.status;
            this.body = {type: 'HttpError', message: 'Error: ' + err.message, data: err.data}
        } else {
            setTimeout(function(){
                console.error('Failsafe shutdown.');
                process.exit(1);
            }, 5000);
            if(cluster.worker) cluster.worker.disconnect();
            /*server.close();*/
            try{
                this.status = 500;
                this.body = {type: 'ServerError', message: 'Internal server error. Try again later'};
                ErrorHandler.handleError(ErrorsFactory('Server', err.message));
            }catch(err) {
                console.log('Unable to send error, because ', err);
            }
        }

    }
});

router(app);

module.exports = app.callback();
