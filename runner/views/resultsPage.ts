import IRequestContext from '../interfaces/IRequestContext';
import getBotScoring from '../lib/getBotScoring';
import { diffArrays, diffWords } from 'diff';
import JSON from 'json5';
import IFlaggedCheck from '../interfaces/IFlaggedCheck';

const showResultsUI = process.env.SHOW_RESULTS_UI ?? false;
export default function(ctx: IRequestContext, includeRequestBodies = false) {
  const [botScore] = getBotScoring(ctx);

  return `
<html>
<head>
    <link rel="icon" 
      type="image/png" 
      href="${ctx.trackUrl('favicon.ico')}">
      
    <link rel="stylesheet" type="text/css" href="${ctx.trackUrl('result.css')}" type="text/css"/>
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
<pre>${ctx.session.identifiers.map(x => `${x.bucket}  =  ${x.id}`).join('\n')}</pre>
<hr/>
<p><b>Not Loaded</b><br/>
${ctx.session.assetsNotLoaded
  .map(
    x =>
      `${x.secureDomain ? 'Secure ' : ''}${x.hostDomain} ${x.resourceType} (from ${x.originType}) ${
        x.pathname
      }`,
  )
  .join('<br>')}</pre>
</p>

<hr/>
<p><b>Bot Findings</b></p>
<table style="box-sizing: border-box; margin:10px 50px 10px 10px">
<thead><tr>
<th style="width: 2%">#</th>
<th style="width: 3%">% Bot</th>
<th style="width: 15%">Resource</th>
<th style="width: 25%">Check</th>
<th style="width: 55%;white-space: pre-wrap">Result</th>
</tr>
</thead>
<tbody>
${
  showResultsUI
    ? ctx.session.flaggedChecks
        .map(x => {
          return `<tr>
<td>${x.requestIdx}</td>
<td>${x.pctBot}</td>
<td>${x.secureDomain ? 'Secure ' : ''}${x.hostDomain} ${x.resourceType} (from ${x.originType})</td>
<td>${x.layer} / ${x.category} / ${x.checkName}</td>
<td>
${x.expected !== undefined ? diffToHtml(x) : x.value}
</td>
</tr>`;
        })
        .join('')
    : ''
}
</tbody>
</table>

<p><b>Sessions</b></p>

<table style="box-sizing: border-box; margin:10px 50px 10px 10px">
<thead><tr>
<th style="width: 2%">#</th>
<th style="width: 10%">Resource</th>
<th style="width: 18%">URLs</th>
<th style="width: 20%">Headers</th>
<th style="width: 20%">Cookies</th>
<th style="width: 30%">Body</th>
</tr>
</thead>
<tbody>
${ctx.session.requests
  .map((x, i) => {
    return `<tr>
<td>${i}</td>
<td>${x.secureDomain ? 'Secure ' : ''}${x.hostDomain} ${x.resourceType} (from ${x.originType})</td>
<td>
Method: ${x.method}<br/>
Url: ${x.url}<br/><br/>
Referer: ${x.referer}<br/><br/>
Origin: ${x.origin}
</td>
<td><pre>${x.headers.join('\n')}</pre></td>
<td><pre style="white-space: pre">${Object.keys(x.cookies ?? {}).join('\n')}</pre></pre>
</td>
<td>
<pre>${
      includeRequestBodies && Object.keys(x.bodyJson).length
        ? JSON.stringify(x.bodyJson, null, 2)
        : ''
    }</pre>
</td>
</tr>`;
  })
  .join('')}
</tbody>
</table>

${(ctx.extraScripts || []).join('\n')}
<script>
  function pageLoaded(){
    document.body.onload = undefined;
    return Promise.all(window.pageQueue)
      .then(() => window.afterQueueComplete ? window.afterQueueComplete() : null)
      .then(() => fetch('${ctx.trackUrl('/page-loaded?page=results')}'))
      .then(() => {
        document.body.classList.add('ready');
      }).catch(err => {
        console.log(err.stack);
      });
  }

</script>
</body>
</html>`;
}

function diffToHtml(check: IFlaggedCheck) {
  const { category, expected, value } = check;
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
<h5>Diff from Expected</h5>
<p>${diff.join('')}</p>
`;
}
