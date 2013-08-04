
module.exports = function(app, model, directories) {
    var fs          = require("fs")
      , path        = require("path")
      , util        = require("./util")
      , directories = (typeof directories === "string") ? [ directories ] : (directories || []);

    var files = util.flattenArray(directories.map(function(dir) {
        return fs.readdirSync(dir).map(function(filename){
            return path.join(dir, filename);
        });
    }));
    
    var objects = {};

    files.forEach(function(f) {
        var name = path.basename(f).replace(/.js$/,'');
        objects[name] = require(f)(app, model);
    });
    
    return objects;
};
