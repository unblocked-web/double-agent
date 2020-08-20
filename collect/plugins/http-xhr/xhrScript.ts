import {DomainType} from "@double-agent/collect/lib/DomainUtils";
import IRequestContext from "@double-agent/collect/interfaces/IRequestContext";

export default function xhrScript(ctx: IRequestContext) {
  return `
<script type="text/javascript">
  const requests = ${JSON.stringify(builtRequests(ctx))};
  requests.forEach(x => {
    if (x.func === 'axios.get') {
      window.pageQueue.push(axios.get(x.url, x.args || {}).catch(console.log));
    } else {
      window.pageQueue.push(fetch(x.url, x.args || {}).catch(console.log));
    }
  });
</script>`;
}

// HELPERS

const headerCaseTest = 'X-HeaDer-sessionId';

function builtRequests(ctx: IRequestContext) {
  const requests: { url: string; func: string; args: object }[] = [];
  for (const domainType of [DomainType.MainDomain, DomainType.SubDomain, DomainType.CrossDomain]) {
    requests.push(
      {
        url: ctx.buildUrl('/axios-nocustom-headers.json', domainType),
        func: 'axios.get',
        args: {
          mode: 'cors',
        },
      },
      {
        url: ctx.buildUrl('/fetch-nocustom-headers.json', domainType),
        func: 'fetch',
        args: {
          mode: 'cors',
        },
      },
      {
        url: ctx.buildUrl('/fetch-post-nocustom-headers.json', domainType),
        func: 'fetch',
        args: {
          mode: 'cors',
          method: 'post',
          body: JSON.stringify({
            [randomText()]: randomText(),
            [randomText()]: randomText(),
            [randomText()]: randomText(),
          }),
        },
      },
      {
        url: ctx.buildUrl('/fetch-custom-headers.json', domainType),
        func: 'fetch',
        args: {
          mode: 'cors',
          headers: {
            [headerCaseTest]: randomText(),
            'x-lower-sessionid': randomText(),
            [randomText()]: '1',
          },
        },
      },
      {
        url: ctx.buildUrl('/axios-custom-headers.json', domainType),
        func: 'axios.get',
        args: {
          mode: 'cors',
          headers: {
            [headerCaseTest]: randomText(),
            'x-lower-sessionid': randomText(),
            [randomText()]: '1',
          },
        },
      },
      {
        url: ctx.buildUrl('/fetch-post-custom-headers.json', domainType),
        func: 'fetch',
        args: {
          method: 'post',
          mode: 'cors',
          headers: {
            [headerCaseTest]: randomText(),
            'x-lower-sessionid': randomText(),
            [randomText()]: '1',
          },
          body: JSON.stringify({
            [randomText()]: randomText(),
            [randomText()]: randomText(),
            [randomText()]: randomText(),
          }),
        },
      },
    );
  }

  return requests;
}

function randomText() {
  return Math.random()
      .toString(36)
      .substring(2);
}

