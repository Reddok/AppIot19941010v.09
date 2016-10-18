var validatorParent = require('validator');

function Validator(schema) {
    this.schema = schema;
}

Validator.prototype.validators = validatorParent;
Validator.prototype.messages = {
    isEmail: 'This data has to be email',
    isUrl: 'This data has to be url',
    isUppercase: 'All letters in this data has to be uppercase',
    isLength: 'This data must be min %{min} letters, max %{max} letters',
    required: 'This data is required'
};
Validator.prototype.handlers = {
    isURL: function(string) {
        return 'http://' + string
    }
};
Validator.prototype.validate = function(data) {
    var schema = this.schema,
        value, curValidator, key;

    this._errors = {};
    this._data = data;

    for(key in schema) {
        value = data[key];
        curValidator = schema[key];
        this.runValidation(curValidator, key, value);
    }

    return  {
        data: data,
        errors: Object.keys(this._errors).length? this._errors : null
    };
};

Validator.prototype.runValidation = function(validators, key, value) {
    var self = this,
        required = typeof validators.required === 'undefined'? true : validators.required,
        error;

    console.log('validate' + key, 'value', value, 'required', required);
    if(!required && (typeof value === 'undefined' || !value || !value.trim())) {
        return true;
    } else if(required && (typeof value === 'undefined' || !value || !value.trim())) {
        this.addError(key, value, 'required');
    }

    for(var validator in validators) {
        if(typeof validators[validator] === 'function') {
            error = validators[validator](value, key, self._data);
        } else {
            if(self.validators[validator]) error = !self.validators[validator](value, validators[validator].options);
        }

        if(error) this.addError(key, value, validator, error);

    };

};


Validator.prototype.addError = function(key, value, errorType, message) {

        if(typeof this.handlers[errorType] === 'function') {
            this._data[key] = this.handlers[errorType](value)
        } else {
            if(!this._errors[key]) this._errors[key] = typeof message === 'string'? message : this._createMessage(key, errorType);
        }
};

Validator.prototype._createMessage = function(key, errorType) {

    var message = this.messages[errorType],
        self = this;

    if(!message) return 'validation error';

    message = message.replace(/%{\w+}/g, function(str) {
        var variable = str.slice(2, str.length - 1);
        console.log('variable', variable, 'options', self.schema[key]);
        return self.schema[key].options && self.schema[key].options[variable]? self.schema[key].options[variable] : 'null';
    });

    return message;

};

module.exports = Validator;








/*if(Array.isArray(validator)) {
 var i, length = validator.length;
 for(i = 0; i < length; i++) {
 this.runValidation(validator[i], key, value);
 }
 } else {
 console.log('validates value', value);
 switch(typeof validator){
 case 'string':
 isValid = self.validators[validator]? self.validators[validator](value) : true;
 break;
 case 'function':
 isValid = validator(value, this._data);
 break;
 case 'object':
 isValid = self.validators[validator.validator]? self.validators[validator.validator](value, validator.options) : true;
 break;
 default:
 isValid = true;
 }

 if(!isValid) this.addError(key, value, validator);

 }*/