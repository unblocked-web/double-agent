import IRequestContext from '../interfaces/IRequestContext';
import getBotScoring from '../lib/getBotScoring';
import { diffArrays, diffWords } from 'diff';

export default function(ctx: IRequestContext) {
  const domains = ctx.domains.listeningDomains;
  const sessionid = ctx.session.id;
  const { remoteAddress, useragent } = ctx.requestDetails;
  const [botScore] = getBotScoring(ctx);

  return `
<html>
<head>
    <link rel="icon" 
      type="image/png" 
      href="favicon.ico?sessionid=${sessionid}">
      
    <link rel="stylesheet" type="text/css" href="${
      domains.main.href
    }main.css?sessionid=${sessionid}" type="text/css"/>
    <script>
        window.pageQueue = [];
    </script>
    ${(ctx.extraHead || []).join('\n')}
</head>
<body onload="pageLoaded()">
<h1>Results</h1>
<p><b>Bot Score: </b> ${botScore}</p>
<p><b>Plugins Run</b> ${ctx.session.pluginsRun.join(', ')}</p>
<p><b>Identifiers</b></p>
<pre>${ctx.session.identifiers.map(x => `${x.name}  =  ${x.id}`).join('\n')}</pre>
<hr/>
<p><b>Not Loaded</b><br/>
${ctx.session.assetsNotLoaded
  .map(
    x =>
      `${x.secureDomain ? 'Secure ' : ''}${x.hostDomain} ${x.resourceType} (from ${x.originType})`,
  )
  .join('<br>')}</pre>
</p>
<p><b>Bot Findings</b></p>
<table style="width:100%; margin: 20px 0;">
<thead><tr>
<th style="width: 2%">#</th>
<th style="width: 3%">% Bot</th>
<th style="width: 15%">Resource</th>
<th style="width: 25%">Check</th>
<th style="width: 55%;white-space: pre-wrap">Result</th>
</tr>
</thead>
<tbody>
${ctx.session.flaggedChecks
  .map(x => {
    return `<tr>
<td>${x.requestIdx}</td>
<td>${x.pctBot}</td>
<td>${x.secureDomain ? 'Secure ' : ''}${x.hostDomain} ${x.resourceType} (from ${x.originType})</td>
<td>${x.layer} / ${x.category} / ${x.checkName}</td>
<td>
${x.expected !== undefined ? diffToHtml(x.category, x.expected, x.value) : x.value}
</td>
</tr>`;
  })
  .join('')}
</tbody>
</table>


<p><b>Sessions</b></p>
<pre>${JSON.stringify(ctx.session.requests, null, 2)}</pre>
<hr/>

${(ctx.extraScripts || []).join('\n')}
<script>
  function pageLoaded(){
    return Promise.all(window.pageQueue)
      .then(() => fetch('/page-loaded?page=results&sessionid=${sessionid}'))
      .then(() => {
        document.body.classList.add('ready');
      }).catch(err => {
        console.log(err);
      });
  }
</script>
</body>
</html>`;
}
function diffToHtml(
  category: string,
  expected: string | number | boolean,
  value: string | number | boolean,
) {
  let diff: string[];
  if (category.includes('Cookie')) {
    diff = diffArrays(String(expected).split(','), String(value).split(',')).map(function(part) {
      const color = part.added ? 'green' : part.removed ? 'red' : 'grey';
      return part.value.map(x => `<span style="color:${color}">${x}</span>`).join('');
    });
  } else {
    diff = diffWords(String(expected), String(value)).map(function(part) {
      const color = part.added ? 'green' : part.removed ? 'red' : 'grey';
      return `<span style="color:${color}">${part.value}</span>`;
    });
  }
  return `<h5>Value</h5>
<p>${value}</p>
<h5>Diff</h5>
<p>${diff.join('')}</p>
`;
}
