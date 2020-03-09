import IRequestContext from '../interfaces/IRequestContext';

export default function(ctx: IRequestContext) {
  const domains = ctx.domains.listeningDomains;
  const sessionid = ctx.session.id;
  const { remoteAddress, useragent } = ctx.requestDetails;
  return `
<html>
<head>
    <link rel="icon" 
      type="image/png" 
      href="favicon.ico?sessionid=${sessionid}">
      
    <link rel="stylesheet" type="text/css" href="${
      domains.main.href
    }main.css?sessionid=${sessionid}" type="text/css"/>
    <link rel="stylesheet" type="text/css" href="${
      domains.subdomain.href
    }main.css?sessionid=${sessionid}" type="text/css"/>
    <link rel="stylesheet" type="text/css" href="${
      domains.external.href
    }main.css?sessionid=${sessionid}" type="text/css"/>
    
    <script src="${
      domains.main.href
    }main.js?sessionid=${sessionid}" type="application/javascript"></script>
    <script src="${
      domains.subdomain.href
    }main.js?sessionid=${sessionid}" type="application/javascript"></script>
    <script src="${
      domains.external.href
    }main.js?sessionid=${sessionid}" type="application/javascript"></script>
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
<a href="/results?sessionid=${sessionid}" id="goto-results-page" style="display:none">Next >></a>
<br/><br/>
<img src="${domains.main.href}icon-wildcard.svg?sessionid=${sessionid}" width="5" />
<img src="${domains.subdomain.href}icon-wildcard.svg?sessionid=${sessionid}" width="5" />
<img src="${domains.external.href}icon-wildcard.svg?sessionid=${sessionid}" width="5" />
Ulixee.org

<script>
  function ws(domain) {
    return new Promise(resolve => {
      const ws = new WebSocket('ws${domains.isSSL ? 's' : ''}://' + domain);
      ws.onerror = function(err) {
        console.log('WebSocket error', err);
        resolve();
      };
      ws.onopen = function() {
        ws.send('sent from ' + location.host + ' with sessionid ${sessionid}', {
          compress:true, binary:false, fin: false, mask: true
        }, function(){});
        resolve();
      };
      ws.onmessage = console.log;
    });
  }
</script>
  
${(ctx.extraScripts || []).join('\n')}
<script>
  function pageLoaded(){
    return Promise.all(window.pageQueue)
      .then(() => fetch('/page-loaded?page=run&sessionid=${sessionid}'))
      .then(() => {
        document.getElementById('goto-results-page').classList.add('ready');
        document.getElementById('goto-results-page').style.display = 'block';
      });
  }
</script>
</body>
</html>`;
}
