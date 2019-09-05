"use strict";
// Simple JavaScript Templating
// John Resig - https://johnresig.com/ - MIT Licensed
(function(){
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
    function precompile(tpl){        
        if(!tpl || typeof tpl != 'string') return "";
        if(isTemplate(tpl)) return tpl;
        var code = "var "+codeArrayName+"=[];"+
                codeArrayName+".push('" + tpl.replace(/[\r\t\n]/g, " ")
            .split("<%").join("\t")
            .replace(/((^|%>)[^\t]*)'/g, "$1\r")
            .replace(/\t=(.*?)%>/g, "',$1,'")
            .split("\t").join("');")
            .split("%>").join(codeArrayName+".push('")
            .split("\r").join("\\'")
        + "');return "+codeArrayName+".join('');";
        return code;
    }

    // 执行编译
    // 需要提供data，会根据data中的变量，生成函数
    // @returns {Object} {
    //    fun:Function 可执行的function fun.apply(this, template.params);
    //    params: [] 执行模板函数时，用来apply的参数数组
    //  } 
    function compile(tpl, data) {
        if(typeof tpl !== 'string') return tpl;
        var code = precompile(tpl);
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
        funBoxCode += '"' + code.replace(/"/g, '\\x22') + '");';
        
        var fun = new Function(funBoxCode);
        return {
            fun: fun(),
            params: params
        };
    }

    // 根据数据渲染模板
    function render(tpl, data) {
        if(!tpl) return "";
        var template = compile(tpl, data);
        if(template) return template.fun.apply(this, template.params);
        return "";
    }

    module.exports = {
        precompile,
        compile,
        render
    }
})();
