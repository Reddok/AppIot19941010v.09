var ErrorHandler = require('../../libs/errorHandler'),
    Router = require('koa-router');

var DeviceController = function(db) {
    var PropertyControllerClass = require('./properties'),
        propertyController = new PropertyControllerClass(db);


    if (!(this instanceof DeviceController)) {
        return new DeviceController(db);
    }


    this.registerRoutes = function() {
        var router = Router();

        router.get('/', this.index);
        router.get('/alive', function*() {

            var devices = yield db.getDevices(['alive']);
            this.body = {data: devices};

        });
        router.get('/stick', function*() {

            var devices = yield db.getDevices(['stick']);
            this.body = {data: devices};

        });
        router.post('/', this.create);
        router.get('/:id', this.show);
        router.put('/:id', this.update);
        router.del('/:id', this.remove);
        router.del('/', this.drop);

        return router;
    };

    this.index = function* (next) {
        var devices = yield db.get('device', {}),
            length = devices.length,
            i;

        if(this.query.count) {
            for(i = 0; i < length; i++) {
                devices[i].propertiesCount = yield db.count('property', {relId: devices[i]._id});
            }
        }

        this.body = devices;

    };

    this.create = function* (next) {console.log(this.request.body);
        var body = this.request.body, deviceId;
        body.created = new Date();
        deviceId = yield db.create('device', {data: body});
        this.body = {_id: deviceId};
    };

    this.show = function* (next) {
        var id = this.params.id,
            device;

        device = yield db.get('device', {_id: id});

        if(device.length) {
            this.body = device[0];
        } else {
            throw ErrorHandler('Http', 'Not Found', 404);
        }


    };

    this.update = function* (next) {
        console.log('putBody',this.request.body);
        var id = this.params.id,
            data = this.request.body;

        if(!id) {
            throw ErrorHandler('Http', 'Не вказаний id для обновлення.', 400);
        }

        yield db.update('device', {_id: id}, {data: data});

        this.body = {data: 'Прилад успішно обновлений!'}

    };

    this.remove = function* (next) {

        var id = this.params.id;

        if(!id) {
            throw new ErrorHandler('Не вказано ніяких данних для створення.', null, 400);
        }

        yield db.remove('device', {_id: id});
        yield propertyController.removeAll(null, id);

        this.body = {data: 'Прилад успішно видалений!'};

    };

    this.drop = function* (next) {

        yield db.drop('device');
        this.body = {data: "OK"};

    }


};

module.exports = DeviceController;