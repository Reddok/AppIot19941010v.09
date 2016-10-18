var router = require('koa-router')(),
    db = require('../../db/app')(),
    staticFile = require('koa-send'),
    config = require('../../config'),
    translations = require('../../libs/languages');


module.exports = function (app) {

    var userHandler = require('../controllers/user')(db),
        userRouter = userHandler.registerRoutes(),
        devicesRouter = require('../controllers/devices')(db).registerRoutes(),
        reportsRouter = require('../controllers/reports')(db).registerRoutes(),
        propertiesRouter = require('../controllers/properties')(db).registerRoutes(),
        statsRouter = require('../controllers/stats')(db).registerRoutes(),
        configRouter = require('../controllers/config')(app).registerRoutes(),
        langRouter = require('../controllers/languages')().registerRoutes(),
        processRouter = require('../controllers/process')(app).registerRoutes();

    router.use(userHandler.initialCreate);

    router.get('/', function *() {

        var lang = config.get('language:current'),
            options = {
                acceptedLanguages: config.get('language:accepted'),
                currentLanguage: lang,
                translation: translations[lang]
            };

        yield this.render('index', {configuration: options});
    });

    router.use(userRouter.routes(), userRouter.allowedMethods());

    router.use('/languages', langRouter.routes(), langRouter.allowedMethods());

    router.use('/config', userHandler.verify, configRouter.routes(), configRouter.allowedMethods());

    router.use('/process', userHandler.verify, processRouter.routes(), processRouter.allowedMethods());

    router.use('/devices', userHandler.verify, devicesRouter.routes(), devicesRouter.allowedMethods());

    router.use('/properties', userHandler.verify, propertiesRouter.routes(), propertiesRouter.allowedMethods());

    router.use('/reports', userHandler.verify, reportsRouter.routes(), reportsRouter.allowedMethods());

    router.use('/stats', userHandler.verify, statsRouter.routes(), statsRouter.allowedMethods());

    router.get('/public/*', function*() { yield staticFile(this, 'server/' + this.path);});

    router.get('/logs/statistics/*', function*() { yield staticFile(this, this.path);});

    app.use(router.routes()).use(router.allowedMethods());


    app.use(function* () {
        console.log('Not Found');
        this.status = 404;
        this.body = 'Not Found';
    });

}