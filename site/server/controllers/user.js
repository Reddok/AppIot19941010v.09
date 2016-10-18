var config = require('../../config'),
    Router = require('koa-router'),
    crypto = require('crypto'),
    sms = require('../../libs/phone'),
    speakeasy = require('speakeasy'),
    ErrorHandler = require('../../libs/errorHandler'),
    Validator = require('../../libs/validator'),
    jwt = require('jsonwebtoken');

var UserController = function(db) {

    var self = this,
        validator = new Validator({
            username: {
                isLength: {
                    options: {min: 4}
                }
            },
            countryCode: {
                isNumeric: true
            },
            phone: {
                isNumeric: true
            },
            password: {
                required: false,
                isLength: {options: {min: 4}}
            }
        }),
        validPassword = new Validator({
            password: {
                isLength: {options: {min: 4}}
            }
        });

    if (!(this instanceof UserController)) {
        return new UserController(db);
    }

    this.registerRoutes = function() {
        var router = Router();

        router.get('/auth', this.verify, function* () { this.body = "OK"});
        router.post('/login/forgot', this.forgot);
        router.put('/verifyCode', this.verifyCode);
        router.get('/user', this.index);
        router.put('/user', this.update);
        router.put('/user/password', this.updatePassword);
        router.post('/login', this.login);

        return router;
    };

    this.index = function* () {
        var user = yield db.get('user');
        user = user[0];    /*Хоча у нас юзер всього один, але ця команда повертає массив, тому вибираємо єдиний перший елемент*/
        this.body = {username: user.username, email: user.email, phone: user.phone, countryCode: user.countryCode};
    };

    this.login = function* () {

        var data = this.request.body,
            user = yield db.get('user', {username: data.username}),
            token;

        user = user[0];
        if(!user) throw ErrorHandler('http', 'Not Found', 404);
        if(!checkPassword(data.password, user.salt, user.hashedPassword)) throw ErrorHandler('http', 'Invalid password', 403);

        token = jwt.sign({username: data.username}, config.get('user:secret'), {
            expiresIn: '24h' // expires in 24 hours
        });

        this.body = token;

    };

    this.initialCreate = function* (next) {

        var usersCount = yield db.count('user');

        if(!usersCount) {
            var userData = {username: 'admin', email: 'iotservice262@gmail.com', salt: Math.random() + '', phone: '0660172345', countryCode: '38'};
            userData.hashedPassword = encryptPassword('admin', userData.salt);
            yield db.create('user', {data: userData});
        }

        yield next;

    };


    this.update = function* () {

        var data = this.request.body,
            user = yield db.get('user', {}),
            errors, serialized, code;

        user = user[0];

        errors = validator.validate(data).errors;
        if(errors) throw ErrorHandler('Http', 'Validation error!', 422, {errors: errors});
        user.phone = data.phone || user.phone;
        if(data.password) data.hashedPassword = encryptPassword(data.password, user.salt);

        serialized = JSON.stringify(data);
        code = yield sendCode(user);
        yield db.update('user', {_id: user._id}, {data: {newData: serialized, code: code}});

        this.body = {};
    };

    this.updatePassword = function* (next) {
        var password = this.request.body.password,
            user = yield db.get('user', {}),
            errors = validPassword.validate({password: password}).errors,
            hashedPassword, code, serialized;

        user = user[0];
        if(errors) throw ErrorHandler('Http', 'Validation error!', 422, {errors: errors});
        hashedPassword = encryptPassword(password, user.salt);

        code = yield sendCode(user);
        serialized = JSON.stringify({hashedPassword: hashedPassword});
        yield db.update('user', {_id: user._id}, {data: {code: code, newData: serialized}});

        this.body = {};
    };

    this.verify = function* (next) {
        var token = this.request.headers['authorization'];
        if (token) {
            var decoded = yield new Promise(function (res, rej) {
                jwt.verify(token, config.get('user:secret'), function (err, decoded) {
                    if (err) rej(ErrorHandler('http', "Don't passed verification.", 401));
                    res(decoded);
                });
            });
            yield next;
        } else {
            throw ErrorHandler('http', "We don't know you. Please login.", 401);
        }
    };

    this.forgot = function* () {
        var username = this.request.body.username,
            user = yield db.get('user', {username: username});
        user = user[0];
        if(!user) throw ErrorHandler('http', "Not Found.", 404);
        this.body = {id: user._id};
    };

    this.verifyCode = function* (next) {
        var code = this.request.body.code,
            id = this.request.body.id,
            users = yield db.get('user', {_id: id}), data;

        var user = users[0];

        if(!user.code) throw ErrorHandler('http', "You need call phone code and verify it!", 404);
        if(!code || user.code !== code) throw ErrorHandler('http', "Invalid code!", 422);

        data = JSON.parse(user.newData);
        data.code = '';
        data.newData = '';
        console.log('Перед обноыелнням', data);

        yield db.update('user', {_id: id}, {data: data});

        this.body = 'OK';
    };


    /*Допоміжні функції*/

    function encryptPassword(password, salt) {
        return crypto.createHmac('sha1', salt).update(password).digest('hex');
    }

    function checkPassword(password, salt, hashedPassword) {
        return encryptPassword(password, salt) === hashedPassword;
    }

    function buildMessage(code) {
        return 'Your verification code in IOT service: ' + code;
    }

    function sendCode(user) {
        var phone = '+' + user.countryCode + user.phone,
            id = user._id,
            code = speakeasy.totp({
            secret: config.get('user:secret')
        });

        return sms.sendSMS(phone, buildMessage(code)).then(
            function() {
                setTimeout(function() {
                    db.update('user', {_id: id}, {code: ''});
                }, 5 * 60 * 1000);
                return code;
            },
            function(err) {
                throw ErrorHandler('Server', 'Error happens when send code to phone: ' + err.message);
            }
        );
    }



};


module.exports = UserController;