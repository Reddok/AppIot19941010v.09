var ErrorHandler = require('middlewares/errorHandler');

var MessagesController = function(db) {

    if (!(this instanceof MessagesController)) {
        return new MessagesController(db);
    }

    this.registerRoutes = function() {
        var router = Router();
        return router;
    };

    this.index = function* (next) {

        var messages = yield db.get('message', {});
        this.body = {data: messages};

    };

    this.create = function (next) {

    };

    this.remove = function* (next) {

        var id = this.params.id;

        if(!id) {
            throw new ErrorHandler('Http', 'Не вказано ніяких данних для видалення.', 400);
        }

        yield db.remove('message', {});
        this.body = {data: 'Прилад успішно видалений!'};

    };


};

module.exports = MessagesController;