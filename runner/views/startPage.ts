import IRequestContext from '../interfaces/IRequestContext';

export default function(ctx: IRequestContext) {
  return `
<html>
<head>
    <link rel="icon" 
      type="image/png" 
      href="${ctx.trackUrl('favicon.ico')}">
    <script>
        window.pageQueue = [];
    </script>
    ${(ctx.extraHead || []).join('\n')}
</head>
<body onload="pageLoaded()">
<div style="margin: 0 auto">
<h1>Start Page</h1>
<a id="goto-run-page" href="${ctx.trackUrl('run')}" style="display: none">start</a>
<hr/> 
</div>
${(ctx.extraScripts || []).join('\n')}
<script>
function pageLoaded(){
  Promise.all(window.pageQueue)
      .then(() => fetch('${ctx.trackUrl('/page-loaded?page=start')}'))
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
