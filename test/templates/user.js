if(!window['__micro$tpl$templates__']){window['__micro$tpl$templates__']={};}window['__micro$tpl$templates__']['user.html']="<div class=\x22cell-box border-spacing js-top-banner\x22><% include(\x22./banner.html\x22) %></div>";if(!window['__micro$tpl$templates__']){window['__micro$tpl$templates__']={};}window['__micro$tpl$templates__']['banner.html']="<% for ( var i = 0; i < users.length; i++ ) { %><li><a href=\x22<%=users[i].url%>\x22><%=users[i].nickname || users[i].name | add | change(8)%></a></li><% } %>";