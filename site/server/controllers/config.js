var config = require('../../config'),
    Router = require('koa-router');

var ReviewController = function(app) {

        if (!(this instanceof ReviewController)) {
            return new ReviewController(app);
        }

        this.registerRoutes = function() {
            var router = Router();

            router.get('/', this.index);
            router.put('/', this.update);

            return router;
        };

        this.index = function* () {

            var data = {},
                timeRange = config.get('process:request:timeRange');
            data.interval = config.get('process:request:interval') / config.get("time:decryptedRanges")[timeRange];
            data.filepath = config.get('logs:filepath');
            data.timeRange = timeRange;
            data.timeout = config.get('process:request:timeout') / 1000;
            data.pingInterval = config.get('process:ping:interval') / 1000;
            data.pingTimeout = config.get('process:ping:timeout') / 1000;
            data.pingTriesToReconnect = config.get('process:ping:triesReconnect');

            console.log('DATA', data);

            this.body = data;
        };


        this.update = function* () {
            console.log('updates');

            var body = this.request.body,
                isRun = config.get('process:state');

            if(isRun) app.events.emit('process:stop');

            config.set('process:request:interval', +body.interval * config.get('time:decryptedRanges')[body.timeRange]);
            config.set('logs:filepath', body.filepath);
            config.set('process:request:timeRange', body.timeRange);
            config.set('process:request:timeout', body.timeout * 1000);
            config.set('process:ping:interval', body.pingInterval * 1000);
            config.set('process:ping:timeout', body.pingTimeout * 1000);
            config.set('process:ping:triesReconnect', body.pingTriesToReconnect);

            config.save(function (err) {
                if (err) console.log(err);
                config.load();
                if(isRun) app.events.emit('process:start');
            });

            this.body = {data: 'Конфігурація додатку обновлена'};
        };

    };
module.exports = ReviewController;