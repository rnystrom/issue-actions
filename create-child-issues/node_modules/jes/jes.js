var path = require('path');
var fs = require('fs');

var jes = module.exports = {
    cache : true,
    caches : {}
};

jes.compile = function (tpl, options) {
    var file = options.jes_file;
    var splits = tpl.match(/<%[-*|=*]*|%>/g);

    //no need to parse
    if(splits == null){
        return tpl;
    }

    //parse template
    var lines  = [];
    lines.push("var s = [];with(options){");
    for(var i = 0; i < splits.length; i++){
        var line = '';
        var split     = splits[i];
        var splitNext = null;
        if(i < splits.length - 1){
            splitNext = splits[i+1]
        }
        var idx = tpl.indexOf(split);
        var idxNext = idx;
        if(splitNext != null){
            idxNext = tpl.indexOf(splitNext);
        } 
        line = JSON.stringify(tpl.slice(0, idx));
        lines.push("s.push("+line+");");

        if(split == "<%"){
            line = tpl.slice(idx + split.length, idxNext);
            if(line.indexOf('include') != -1){
                jes.renderFile(path.dirname(file)+"/"+line.trim().slice(8), options, function(err, data){
                    if(err){
                        lines.push("s.push("+JSON.stringify(err.toString())+");");
                    }else{
                        lines.push("s.push("+JSON.stringify(data)+");");   
                    }
                });
            }else{
                lines.push(line);
            }
        }else if(split == "<%-"){
            line = tpl.slice(idx + split.length, idxNext);
            lines.push("s.push(("+line+"));");
        }else if(split == "<%="){
            line = tpl.slice(idx + split.length, idxNext);
            lines.push("s.push(escape(("+line+")));");
        }

        i++;
        tpl = tpl.slice(idxNext+splitNext.length, tpl.length);
    }
    line = JSON.stringify(tpl);
    lines.push("s.push("+line+");");
    lines.push("return s.join('');}"); 
    return new Function('options, escape', lines.join(''));
}

jes.render = function(str, options){
    var obj = jes.compile(str, options);
    
    var file = options.jes_file;
    //cache
    if(file){
        jes.caches[file] = obj;
    }

    if(typeof obj == 'string'){
        return obj;
    }else{
        return obj(options, jes.escape);
    }
}

jes.renderFile = function(file, options, cb){
    options.jes_file = file;
    try{
        //check cache
        if(jes.cache && jes.caches[file]){
            var obj = jes.caches[file];
            if(obj){
                if(typeof obj == 'string'){
                    cb(null, obj);
                }else{
                    cb(null, obj(options, jes.escape));
                }
            }
        }else{
            var str = fs.readFileSync(file, 'utf8');

            cb(null, jes.render(str, options));
        }
    }catch(e){ cb(e); }
}

jes.escape = function(str){
    return str.replace(/&(?!\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
