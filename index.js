

(function(){
    var includeReg = /include\s*\(\s*([^\)]+)\s*\)\s*[;]*/;
    var spaceReg = /(^\s*)|(\s*$)/g;    // 去除前后空格
    var posReg = /((^|%>)[^\t]*)'/g;    // 替换单引号
    var annoRe = /<!--[\s\S]*?-->|(?:\/\*[\s\S]*?\*\/)*/g; // 去除注释
    var filterReg = /\s+\|\s+/;// filter 分隔
    var scriptTagReg = /(\<script\s+[^\>]*type="\s*text\/(template|x-template|html)\s*"[^\>]*\>)([\w\W]*?)\<\/script\>/g; // script标签配匹
    var templateWindowCache = '__micro$tpl$templates__';
    var codeArrayName = '__micro$tpl$codes__';
    var filtersName = '__micro$tpl$filters__';

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
        // 去除单引号, 需要递归去除所有单引号
        // 官方引擎 这里是有bug的
        function replacePos(source) {
            if(!source) return source;
            if(posReg.test(source)) {
                source = source.replace(posReg, "$1\r");
                return replacePos(source);
            }
            return source;
        }

        // 替换script type="text/html"  / text/template  text/x-template
        function replaceTemplateTag(tpl) {
            return tpl.replace(scriptTagReg, function(input, tag, type, code) {
                var s = code.replace(/\</g, '\\x3c').replace(/\>/g, '\\x3e');
                return input.replace(code, s);
            });
        }

        // 处理filter函数
        function replaceFilters(tpl) {
            // 如果有filters，则处理
            if(tpl && filterReg.test(tpl)) {
                var filters = tpl.split(filterReg);
                for(var i=0;i<filters.length;i++) {
                    if(i===0) {
                        tpl = filters[i].replace(spaceReg, '');
                    }
                    else {
                        // filters名
                        var fn = filters[i].replace(spaceReg, '');
                        if(!fn) continue;
                        // 如果已经有()。则直接插入第一个变量
                        if(fn.indexOf('(') > -1) {
                            tpl = filtersName + '.' + fn.replace('(', '(' + tpl + ',');
                        }
                        else {
                            tpl = filtersName + '.' + fn + '('+tpl+')';
                        }
                    }
                }
            }
            return tpl;
        }

        var code = replaceTemplateTag(tpl)
            .replace(/\\/g, '\\\\\\\\') // \需要被转义，不然会出乱\\\\\\\\
            .replace(/\n/g, '\\\\n')    // 保留换行
            .replace(/[\r\t]/g, " ")
            .split("<%").join("\t");

        code = replacePos(code).replace(/((^|%>)[^\t]*)'/g, "$1\r")
            .replace(/\t=(.*?)%>/g, function(i, f) {
                // 如果有filters，则处理
                f = replaceFilters(f);
                return "',"+f+",'";
            })
            .split("\t").join("');")
            .split("%>").join(codeArrayName+".push('")
            .split("\r").join("\\'");
        code = codeArrayName+".push('" + code + "');"
        return code.replace(/"/g, '\\x22').replace(/'/g, '\\x27');
    }

    // 执行编译
    // 需要提供data，会根据data中的变量，生成函数
    // filters {object} {add:function} 数据处理函数
    // @returns {Object} {
    //    fun:Function 可执行的function fun.apply(this, template.params);
    //    params: [] 执行模板函数时，用来apply的参数数组
    //  } 
    function compile(tpl, data, filters) {
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

        // 默认会添加一个filters的参数
        if(!filters) filters = {};
        funBoxCode += '"'+filtersName+'",';
        params.push(filters);

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
        code += "window['"+templateWindowCache+"']['"+id+"']=\"" + 
                tpl.replace(annoRe, '') // 注释
                .replace(/\\/g, '\\\\')
                //.replace(/\n/g, '\\n')    // 保留换行
                .replace(/\>\s+\</g, '><')
                .replace(/[\r\t\n]/g, " ")
                .replace(/"/g, '\\x22').trim() + '";';
        return code;
    }

    // 根据数据渲染模板
    function renderString(tpl, options, callback) {
        if(!tpl) return "";
        options = options || {};
        var result = tpl;
        var template = compile(tpl, options.data || {}, options.filters);
        if(template) result = template.fun.apply(this, template.params);

        callback && callback(result);

        return result;
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
                res = renderString(tpl || '', options);
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
        // 读取模板内容
        readTemplate(path, options, function(err, content) {
            if(err) {
                callback && callback(err, content);
            }
            else {
                // 如果有模板预处理函数，则需要先调用
                if(typeof options.preResolveTemplate == 'function') {
                    options.preResolveTemplate(content, path, options, function(err, content) {
                        if(err) {
                            console.error(err);
                        }
                        resolveTemplate(content, path, options, callback);
                    });
                }
                else {
                    resolveTemplate(content, path, options, callback);
                }
            }
        });
    }

    // 读取模板文件或缓存内容
    function readTemplate(path, options, callback) {
        var root = options.root || '';
        // 如果在浏览器中执行，则去缓存中取，一般预编译发线上会把它压入
        if(typeof window != 'undefined') {
            var cache = window[templateWindowCache];
            if(cache && cache[path]) {
                callback && callback(null, cache[path] || '');
            }
            else {
                // 异步去远程拉取
                ajax(join(root, path), function(res) {
                    callback && callback(null, res || '');
                });
            }
        }
        // 在nodejs下运行，去读文件
        else {
            path = require('path').resolve(root, path);
            require('fs').readFile(path, 'utf8', function(err, data){
                callback && callback(err, data || '');
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
                if(err) {
                    console.error(err);
                }
                res = res||'';
                content = content.replace(ms[0], res);
                resolveTemplate(content, path, options, callback);
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
            return path;
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
    function ajax(url, callback) {
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
        xmlHttp.send(null);
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
