var fs = require('fs'),
    request = require('request');

module.exports = {

    write: function(path, name, message, cb) {
        var filepath, filename, remote = isHttp(path);
        if(!path || typeof path !== 'string') path = '';
        if(path[0] === '/') path = path.substr(1);

        filepath = remote? 'uploadedLogs/' : path;
        filepath = 'logs/' + filepath;
        makeValidPath(filepath);
        if(filepath[filepath.length - 1] !== '/' && name[0] !== '/') filepath += '/'; /*Нормалізуємо шлях для уникнення помилки*/
        name = name.split(' ').join('_') + '.txt';
        filename = filepath + name;
        console.log('filename', filename);
        fs.writeFile(filename, message, function(err) {
            if(err) console.log('При збереженні файлу в файловій системі сталась наступна помилка: ', err);
            if(remote) sendToRemote(name, filename, path);
            if(cb) cb();
        });

        return filename;

    }

};

function isHttp(path) {
    return path.substr( 0, 7 ) === "http://" || path.substr( 0, 8 ) === "https://" || path.substr( 0, 6 ) === "ftp://"
}

function makeValidPath(path) {
    if(path[path.length - 1] === '/') path = path.substr(0, path.length - 1);
    var str = '';
    path = path.split('/');
    path.forEach(function(piece) {
        str += piece + '\\';
        try{
            var stat = fs.statSync(str);
        }catch(err) {
            if(err.errno === -4058){
                fs.mkdirSync(str);
            } else{
                console.log('При перевірці шляху сталась непередбачувана помилка: ', err);
                return false;
            }
        }
    })
}

function sendToRemote(name, source, dest) {
    var r, form;
    r = request.post(dest, function(err) {
        if(err) console.log('При посиланні файлу логів на віддалений сервер сталась наступна помилка: ' + err);
    });
    form = r.form();
    form.append(name, fs.createReadStream(source), {filename: name + '.txt'});

}