
const path = require('path');
const fs = require('fs');
const engine = require('../index');

const users =  [
    {url:'http://qqq', name: "jiamao", nickname: 'nick'},
    {url:'http://qqq2', name: "jiamao2"}
];

let code = engine.renderString(`<% for ( var i = 0; i < users.length; i++ ) { %>
    <li><a href="<%=users[i].url%>"><%=users[i].name%></a></li>
  <% } %>`, {
      data: {
        users: users
    }
  });

  console.log(code);

  engine.render('./user.html', {
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
    console.log('file render', err||res);
  });

  var usertpl = fs.readFileSync(path.join(__dirname,'./templates/user.html'), 'utf8');
  var tpl = engine.precompile(usertpl, {
      id: 'user.html'
  });    

  var bannertpl = fs.readFileSync(path.join(__dirname,'./templates/banner.html'), 'utf8');
  tpl += engine.precompile(bannertpl, {
    id: 'banner.html'
  });

  var tplpath = path.join(__dirname,'./templates/user.js');
  fs.writeFileSync(tplpath, tpl);