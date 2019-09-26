
# 微模板引擎

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]


基于 `Micro-Templating` [https://johnresig.com/blog/javascript-micro-templating/](https://johnresig.com/blog/javascript-micro-templating/)开发的，可以node下运行，并支持预编译到浏览器中运行。

可以用来做同构模板引擎。

## Install

```bash
$ npm i jm-template --save
```

## Usage

```js
const template = require('jm-template');

const users =  [
    {url:'http://qqq', name: "jiamao"},
    {url:'http://qqq2', name: "jiamao2"}
];
// 字符串模板解析
let code = template.renderString(`<% for ( var i = 0; i < users.length; i++ ) { %>
    <li><a href="<%=users[i].url%>"><%=users[i].name%></a></li>
  <% } %>`, 
{
    data: {
            users: users
        },
    filters: {}
  });

```

#### 文件模板解析
```js
template.render('./user.html', {
    data: {
        users: users
    },
    filters: {}, // 支持filter
    root: path.resolve(__dirname, 'templates') // 模板所在路径，如果在浏览器中。这里可以是url
  }, function(err, res) {
    console.log(res);
  });
```

#### 带子模板文件
支持 `include` 函数来加载子模板。
```html
<!-- user.html -->
<div class="cell-box border-spacing js-top-banner">
    <% include("./banner.html") %>
</div>
```
```html
<!-- banner.html -->
<% for ( var i = 0; i < users.length; i++ ) { %>
    <li><a href="<%=users[i].url%>"><%=users[i].name%></a></li>
<% } %>
```

#### 预编译
如果有子模板文件，在开发环境下，会自动ajax请求异步渲染。 当我们部署到生产环境，自然不希望增加请求，这时就可以用预编译功能，它可以把模板压入同一js文件中。

> 如果你使用`gulp`，可以用它的插件：[gulp-jmtemplate](https://github.com/jiamao/gulp-jmtemplate)
```js
// 预编译
  var usertpl = fs.readFileSync(path.join(__dirname,'./templates/user.html'), 'utf8');
  var tpl = template.precompile(usertpl, {
      id: 'user.html' // 这里可以 是function 返回一个字符串做为id即可
  });    

  var bannertpl = fs.readFileSync(path.join(__dirname,'./templates/banner.html'), 'utf8');
  tpl += template.precompile(bannertpl, {
      // 可以动态处理id
    id: function(opt) {
        console.log(opt.path);// 会带回路径
        return 'banner.html';
    }
  });
// 浏览器只需要引用这个user.js即可
  var tplpath = path.join(__dirname,'./templates/user.js');
  fs.writeFileSync(tplpath, tpl);
```

#### filters
支持模板在对一些数据进行二次处理函数。
> 写法： 
> 1. 用|分隔，且前后要有空隔  
> 2. 可以写成函数形式，调用时引擎当前值放入第一个参数，例如： `name | change(2)`， 最终调用会是`change(name, 2)`      
```html
<!-- user.html -->
<% for ( var i = 0; i < users.length; i++ ) { %>
    <li><a href="<%=users[i].url%>"><%=users[i].nickname || users[i].name | add | change(8)%></a></li>
  <% } %>
```
```js
template.render('./user.html', {
    data: {
        users: users
    },
    filters: {
        add: function(s) {
            return 'ding ' + s;
        },
        change: function(s, l) {
            if(l) return s.substr(0, l);
            return s;
        }
    },
    root: path.resolve(__dirname, 'templates'),
     // 模板解析前的预处理   可选
    preResolveTemplate: function(content, path, options, callback) {
        callback && callback(null, content);
    }
  }, function(err, res) {
    console.log('file render', res);
  });
```
> 注： filter函数之间请用 | ，前后带空隔。

### 示例

[https://jiamao.github.io/jm-template/test/index.html](https://jiamao.github.io/jm-template/test/index.html)

```html
<!doctype html>
<html>
	<head>
		<title>micro templating</title>
		<meta content="text/html; charset=UTF-8" http-equiv="content-type" />
		<meta name="viewport" content="width=device-width,initial-scale=1">
        <script src="../index.js"></script>
        <!--这里是预编译好的模板，如果不引用则会异步去拉取模板-->
        <!--<script src="templates/user.js"></script>-->
	</head>
	<body>
		<div id="root"></div>
        <script>
            window.JMTEMPLATE.render('user.html', {
                root: 'templates',
                data: {
                    users: [
                        {url:'http://qqq.com', name: "jiamao"},
                        {url:'http://qqq2.com', name: "jiamao2"}
                    ]
                },
                filters: {
                    add: function(s) {
                        return 'ding ' + s;
                    },
                    change: function(s, l) {
                        if(l) return s.substr(0, l);
                        return s;
                    }
                },
            }, function(err, res) {
                document.getElementById('root').innerHTML = res;
            });
        </script>
	</body>
</html>

```

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/jm-template.svg?style=flat-square
[npm-url]: https://npmjs.org/package/jm-template
[download-image]: https://img.shields.io/npm/dm/jm-template.svg?style=flat-square
[download-url]: https://npmjs.org/package/jm-template
