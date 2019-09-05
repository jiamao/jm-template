
const engine = require('../index');

let code = engine.render(`<% for ( var i = 0; i < users.length; i++ ) { %>
    <li><a href="<%=users[i].url%>"><%=users[i].name%></a></li>
  <% } %>`, {
      users: [
          {url:'http://qqq', name: "jiamao"},
          {url:'http://qqq2', name: "jiamao2"}
      ]
  });

  console.log(code);