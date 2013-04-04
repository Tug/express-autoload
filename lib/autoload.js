
module.exports = function(app, model, directory) {
    var fs = require("fs"),
        path = require("path"),
        files = [];
    
    try {
      files = fs.readdirSync(directory);
    } catch(err) {}

    var names = files.map(function(f) {
        return path.basename(f).replace(/.js$/,'');
    });
    
    var objects = {};
    names.forEach(function(name) {
        objects[name] = require(path.join(directory, name))(app, model);
    });
    
    return objects;
};
