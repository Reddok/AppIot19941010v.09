var router = require('koa-router')(),
    staticFile = require('koa-send');


    router.get('/', function* () {
        yield this.render('index');
    });

    router.get('/public/*', function*() { yield staticFile(this, 'server/' + this.path);});

    router.get('/statistics/*', function*() { yield staticFile(this, this.path);});

    router.use(function* () {
        console.log('Not Found');
        this.status = 404;
        this.body = 'Plain error';
    });

     module.exports = router;