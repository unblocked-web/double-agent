import IRequestContext from '../interfaces/IRequestContext';
import HostDomain from '../interfaces/HostDomain';

export default function(ctx: IRequestContext) {
  const sessionid = ctx.session.id;
  const { remoteAddress, useragent } = ctx.requestDetails;
  return `
<html>
<head>
    <link rel="icon" 
      type="image/png" 
      href="${ctx.trackUrl('favicon.ico')}">
      
    <link rel="stylesheet" type="text/css" href="${ctx.trackUrl(
      'main.css',
      HostDomain.Main,
    )}" type="text/css"/>
    <link rel="stylesheet" type="text/css" href="${ctx.trackUrl(
      'main.css',
      HostDomain.Sub,
    )}" type="text/css"/>
    <link rel="stylesheet" type="text/css" href="${ctx.trackUrl(
      'main.css',
      HostDomain.External,
    )}" type="text/css"/>
    
    <script src="${ctx.trackUrl(
      'main.js',
      HostDomain.Main,
    )}" type="application/javascript"></script>
    <script src="${ctx.trackUrl('main.js', HostDomain.Sub)}" type="application/javascript"></script>
    <script src="${ctx.trackUrl(
      'main.js',
      HostDomain.External,
    )}" type="application/javascript"></script>
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
    <script>
        window.pageQueue = [];
    </script>
    ${(ctx.extraHead || []).join('\n')}
</head>
<body onload="pageLoaded()">
<h1>Run</h1>
<p><b>Address:</b> <span id="addresses">${remoteAddress}</span></p>
<p><b>User Agent: </b> ${useragent}</p>
<hr/>
<a href="${ctx.trackUrl('results')}" id="goto-results-page" style="display:none">Next >></a>
<br/><br/>
<img src="${ctx.trackUrl('icon-wildcard.svg', HostDomain.Main)}" width="5" />
<img src="${ctx.trackUrl('icon-wildcard.svg', HostDomain.Sub)}" width="5" />
<img src="${ctx.trackUrl('icon-wildcard.svg', HostDomain.External)}" width="5" />
Ulixee.org

<script>
  function ws(wsUrl) {
    return new Promise(resolve => {
      const ws = new WebSocket(wsUrl);
      ws.onerror = function(err) {
        console.log('WebSocket error', err);
        resolve();
      };
      ws.onopen = function() {
        const message = JSON.stringify({ host: location.host, sessionid: '${sessionid}'});
        ws.send(message, {
          compress:true, binary:false, fin: false, mask: true
        }, function(){});
        resolve();
      };
      ws.onmessage = console.log;
    });
  }
  window.pageQueue.push(
    ws('${ctx.trackUrl('', HostDomain.Main, 'ws')}'), 
    ws('${ctx.trackUrl('', HostDomain.Sub, 'ws')}'),
    ws('${ctx.trackUrl('', HostDomain.External, 'ws')}')
  );
</script>
  
${(ctx.extraScripts || []).join('\n')}
<script>
  function pageLoaded(){
    return Promise.all(window.pageQueue)
      .then(() => fetch('${ctx.trackUrl('/page-loaded?page=run')}'))
      .then(() => {
        document.getElementById('goto-results-page').classList.add('ready');
        document.getElementById('goto-results-page').style.display = 'block';
      });
  }
</script>
</body>
</html>`;
}
