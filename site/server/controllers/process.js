var config = require('../../config'),
    Router = require('koa-router');

var ProcessController = function(app) {

    if (!(this instanceof ProcessController)) {
        return new ProcessController(app);
    }

    this.registerRoutes = function() {
        var router = Router();

        router.get('/', this.index);
        router.post('/', this.changeProcess);

        return router;
    };

    this.index = function* () {
        yield config.load();
        console.log('get state', config.get('process:state'));
        this.body = {
            state: config.get('process:state')
        };
    };


    this.changeProcess = function* () {

        var state = this.request.body.state;
        console.log('state', state);

        if(state) {
            app.events.emit('process:start');
            this.body = {data: 'Перевірка почалась'};
        } else {
            app.events.emit('process:stop');
            this.body = {data: 'Перевірку припинено'};
        }

        this.body = {data: 'Конфігурація додатку обновлена'};
    };

};
module.exports = ProcessController;