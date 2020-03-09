import IRequestContext from '../interfaces/IRequestContext';

export default function(ctx: IRequestContext) {
  const sessionid = ctx.session.id;
  return `
<html>
<head>
    <link rel="icon" 
      type="image/png" 
      href="favicon.ico?sessionid=${sessionid}">
    <script>
        window.pageQueue = [];
    </script>
    ${(ctx.extraHead || []).join('\n')}
</head>
<body onload="pageLoaded()">
<div style="margin: 0 auto">
<h1>Start Page</h1>
<a id="goto-run-page" href="/run?sessionid=${sessionid}" style="display: none">start</a>
<hr/> 
</div>
${(ctx.extraScripts || []).join('\n')}
<script>
function pageLoaded(){
  Promise.all(window.pageQueue)
    .then(function() {
      return fetch('/page-loaded?page=start&sessionid=${sessionid}')
    })
    .then(function() {
      document.getElementById('goto-run-page').classList.add('ready');
      document.getElementById('goto-run-page').style.display = 'block';
    }).catch(function(err) {
      console.log(err);
    })
}
</script>
</body>
</html>`;
}
