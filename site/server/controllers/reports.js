var ErrorHandler = require('../../libs/errorHandler'),
    Router = require('koa-router'),
    config = require('../../config'),
    filesystem = require('fs'),
    commandLine = require('../../libs/commandLine');
var reportController = function(db) {

    var StatsControllerClass = require('./stats'),
        statsController = new StatsControllerClass(db);


    if (!(this instanceof reportController)) {
        return new reportController(db);
    }

    this.registerRoutes = function() {
        var router = Router();

        router.get('/', this.index);
        router.del('/:id', this.remove);
        router.del('/', this.removeAll);

        return router;
    };


    this.index = function* (next) {

        var params = this.request.query,
            options = {},
            length, reports;

        if(!params.infinity) {
            params.page = params.page ? +params.page : 1;
            params.per_page = params.per_page? +params.per_page : 0;

            options.limit = params.per_page;
            options.offset = (params.page - 1) * params.per_page;
        }

        options.order = {by: "date", type: "DESC"};


        reports = yield db.get('report', {}, options);
        length = yield db.count('report');

        this.body = {records: reports, initialLength: length};

    };

    this.remove = function* (next) {
        var id = this.params.id;

        if(!id) {
            throw new ErrorHandler('Http', 'Не вказано ніяких данних для створення.', 400);
        }

        var report = yield db.get('report', {_id: id});
            yield db.remove('report', {_id: id});

        filesystem.unlink(report[0].logLink, function(err) {
            if(err) console.log(err);
        });

        this.body = {data: 'Логи видалені!'};

    };

    this.removeAll = function* (next) {

        yield db.drop('report');

        commandLine('dir', 'ls');
        commandLine('RMDIR /s /q logs\\statistics', 'rm -rf /logs/statistics');

        this.body = {data: 'Логи видалені!'};
    };



    /*this.makeReport = function(res, socket) {
        var data = res.data,
            date = new Date(),
            logPath = res.log;

        db.run("INSERT INTO " + reportTableName + "(date, logLink) VALUES ('" + date.getTime() + "', '" + logPath + "')", [], function(err) {

            if(err) {
                var error = new ErrorHandler(err, true);
                sendError(error, null, socket);
                console.log('При вставці данних звіту сталась наступна помилка: ' + error);
            } else{

                socket.broadcast('report');
                if(data.length) {
                    statsController.create(data);
                }
            }

        });

    };*/

};

module.exports = reportController;