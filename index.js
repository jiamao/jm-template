

(function(){
    var includeReg = /include\s*\(\s*([^\)]+)\s*\)\s*[;]*/;
    var templateWindowCache = '__micro$tpl$templates__';
    var codeArrayName = '__micro$tpl$codes__';

    // 是否为已编 译过的
    function isTemplate(code) {
        return code && code.indexOf(codeArrayName) > -1;
    }

    /**
     * 模板解析
     * @param {String} tpl 模板内容 
     * @returns {String} 编译后的内容
     */
    function decode(tpl){        
        if(!tpl || typeof tpl != 'string') return "";
        if(isTemplate(tpl)) return tpl;
        var code = codeArrayName+".push('" + tpl.replace(/[\r\t\n]/g, " ")
            .split("<%").join("\t")
            .replace(/((^|%>)[^\t]*)'/g, "$1\r")
            .replace(/\t=(.*?)%>/g, "',$1,'")
            .split("\t").join("');")
            .split("%>").join(codeArrayName+".push('")
            .split("\r").join("\\'")
        + "');";
        return code.replace(/"/g, '\\x22').replace(/'/g, '\\x27');
    }

    // 执行编译
    // 需要提供data，会根据data中的变量，生成函数
    // @returns {Object} {
    //    fun:Function 可执行的function fun.apply(this, template.params);
    //    params: [] 执行模板函数时，用来apply的参数数组
    //  } 
    function compile(tpl, data) {
        if(typeof tpl !== 'string') return tpl;
        var code = decode(tpl);
        if(!code) return null;
        
        data = data || {};

        // 在外面套一层带data参数的函数
        // 这里不能再用with
        var funBoxCode = 'return new Function(';
        var params = [];
        if(data) {           
            for(var k in data) {
                if(!data.hasOwnProperty(k)) continue;
                funBoxCode += '"'+ k + '",';
                params.push(data[k]);
            }
        }
        funBoxCode += '"var '+ codeArrayName + '=[];' + code + ';return ' +codeArrayName+ '.join(\'\');");';
        
        var fun = new Function(funBoxCode);
        return {
            fun: fun(),
            params: params
        };
    }

    // 预编译模板，主要是把它压入window变量下
    function precompile(tpl, options) {    
        var id  = options.id || 'default';
        if(typeof id == 'function') id = id(options);
        // 压入window下的缓存中
        var code = "if(!window['"+templateWindowCache+"']){window['"+templateWindowCache+"']={};}";
        code += "window['"+templateWindowCache+"']['"+id+"']=\"" + decode(tpl).replace(/\\x/g, '\\\\x') + '";';
        return code;
    }

    // 根据数据渲染模板
    function renderString(tpl, data) {
        if(!tpl) return "";
        var template = compile(tpl, data);
        if(template) return template.fun.apply(this, template.params);
        return "";
    }

    /**
     * 渲染模板, 这里需要处理include和filters
     * path 模板路径，相对于options的root
     * options {data: 渲染数据， filters:{}渲染用到的filters函数, root：模板存放根路径}
     */
    function render(path, options, callback) {
        options = options||{};
        var res = '';
        getTemplate(path, '', options, function(err, tpl) {
            if(err) {
                throw err;
            }
            try {
                //options.data = options.data||{};
                res = renderString(tpl || '', options.data);
                callback && callback(null, res);
            }
            catch(e) {
                callback && callback(e, '');
            }
        });
        return res;
    }

    // 获取模板内容，如果有parent则它的路径是相对于parent的
    function getTemplate(path, parent, options, callback) {
        path = resolve(path, parent);
        var root = options.root || '';
       
        // 如果在浏览器中执行，则去缓存中取，一般预编译发线上会把它压入
        if(typeof window != 'undefined') {
            var cache = window[templateWindowCache];
            if(cache && cache[path]) {
                resolveTemplate(cache[path] || '', path, options, callback);
            }
            else {
                // 异步去远程拉取
                ajax(join(root, path), function(res) {
                    resolveTemplate(res || '', path, options, callback);
                });
            }
        }
        // 在nodejs下运行，去读文件
        else {
            path = require('path').join(root, path);
             require('fs').readFile(path, 'utf8', function(err, data){
                 if(err) {
                     console.log(err);
                     callback && callback(err);
                     return;
                 }
                 resolveTemplate(data || '', path, options, callback);
             });
        }
    }

    // 解析模板中的特殊函数，include
    function resolveTemplate(content, path, options, callback) {
        content = decode(content); // 解析
        var ms = content.match(includeReg);
        if(ms && ms.length > 1) {
            // 递归获取，直到处理完include
            var p =  ms[1].replace(/['"]/g,'').replace(/\\x22/g, '').replace(/\\x27/g, '');
            getTemplate(p, path, options, function(err, res) {
                res = res||'';
                content = content.replace(ms[0], res);
                callback && callback(null, content);
            });
        }
        else {
            callback && callback(null, content);
        }
    }

    // 解析模板路径
    // 如果以.开头，则是相对路径。例如 ../   ./
    // 其它路径都为绝对key
    function resolve(path, parent) {
        var parents = [];
        if(parent) {
            parents = parent.split('/');
            if(parents.length) parents.splice(parents.length-1, 1); // 去除最后的文件名
        }
        if(path.indexOf('.') === 0) {
            if(parents.length) {
                var ps = path.replace('./', '').split('/');
                for(var i=0;i<ps.length;i++) {
                    if(ps[i] == '../') {
                        if(parents.length) parents.splice(parents.length - 1, 1);// 上移一个目录
                        path = path.replace('../', '');
                    }
                    else {
                        break;
                    }
                }
                return parents.length? join(parents.join('/'), path): path;
            }
            else {
                return path.replace('./', '');
            }
        }
        else {
            return join(parent, path);
        }
    }
    function join(p1, p2) {
        if(!p1) return p2;
        if(!p2) return p1;
        p1 = p1||'';
        p2 = p2||'';
        p1 = p1.replace(/\/$/,'');
        p2 = p2.replace(/^\//, '');
        return p1 + '/' + p2;
    }   
    
    //生成ajax请求
    //time 延时多少毫秒
    function ajax(url, callback, time) {
        var xmlHttp;
        if (window.ActiveXObject) {
            xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");
        }
        else if (window.XMLHttpRequest) {
            xmlHttp = new XMLHttpRequest();
        }
        if(!xmlHttp) {
            callback(null);
            return;
        }
        xmlHttp.onreadystatechange=function(e){
            if(this.readyState == 4) {
                if(this.status == 200) {
                    callback&&callback(this.responseText||this.response);
                }
                else {
                    callback&&callback();
                }
            }
        };
        xmlHttp.open("GET",url,true);
        //缓存中没有,指定了需要TAG处理，则优先返回，并延时处理资源
        if(time) {
            //css延时请求，因为如果缓存中没有的话，会直接生成link标签保证加载顺序
            setTimeout(function(){
                xmlHttp.send(null);
            }, time);
        }
        else {
            xmlHttp.send(null);
        }
        return xmlHttp;
    }

    var MICROTEMPLATING = {
        render: render,
        renderString: renderString,
        precompile: precompile
    };

    if(typeof module != 'undefined') {
        module.exports = MICROTEMPLATING;
    }
    if(typeof window != 'undefined') {
        window.JMTEMPLATE = MICROTEMPLATING;
    }
})();
