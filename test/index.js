
const path = require('path');
const fs = require('fs');
const engine = require('../index');

const users =  [
    {url:'http://qqq', name: "jiamao"},
    {url:'http://qqq2', name: "jiamao2"}
];

let code = engine.renderString(`<% for ( var i = 0; i < users.length; i++ ) { %>
    <li><a href="<%=users[i].url%>"><%=users[i].name%></a></li>
  <% } %>`, {
      users: users
  });

  console.log(code);

  engine.render('./user.html', {
    data: {
        users: users
    },
    root: path.resolve(__dirname, 'templates')
  }, function(err, res) {
    console.log('file render', res);
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