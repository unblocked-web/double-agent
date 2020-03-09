import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';

const headerCaseTest = 'X-HeaDer-sessionid';
export { headerCaseTest };

export default function buildTestXhrs(ctx: IRequestContext) {
  const sessionid = ctx.session.id;
  const domains = ctx.domains.listeningDomains;
  const fullSubdomain = domains.subdomain.host;
  const fullExternal = domains.external.host;
  const fullMainSite = domains.main.host;
  return [
    { func: 'ws', url: `${fullMainSite}?sessionid=${sessionid}` },
    { func: 'ws', url: `${fullSubdomain}?sessionid=${sessionid}` },
    { func: 'ws', url: `${fullExternal}?sessionid=${sessionid}` },
    {
      func: 'axios.get',
      url: `axios-noheaders.json`,
      args: {
        params: {
          sessionid: sessionid,
        },
      },
    },
    { func: 'fetch', url: `fetch-noheaders.json?sessionid=${sessionid}` },
    {
      func: 'fetch',
      url: `fetch-post-noheaders.json?sessionid=${sessionid}`,
      args: {
        method: 'post',
        body: JSON.stringify({
          sessionid: sessionid,
          [randomText()]: randomText(),
          [randomText()]: randomText(),
          [randomText()]: randomText(),
        }),
      },
    },
    {
      func: 'fetch',
      url: 'fetch-headers.json?sessionid=' + sessionid,
      args: {
        headers: {
          [headerCaseTest]: randomText(),
          'x-lower-sessionid': randomText(),
          [randomText()]: '1',
        },
      },
    },
    {
      func: 'axios.get',
      url: 'axios-headers.json',
      args: {
        params: {
          sessionid: sessionid,
        },
        headers: {
          [headerCaseTest]: randomText(),
          'x-lower-sessionid': randomText(),
          [randomText()]: '1',
        },
      },
    },
    {
      func: 'fetch',
      url: `fetch-post-headers.json?sessionid=${sessionid}`,
      args: {
        method: 'post',
        headers: {
          [headerCaseTest]: randomText(),
          'x-lower-sessionid': randomText(),
          [randomText()]: '1',
        },
        body: JSON.stringify({ sessionid: sessionid }),
      },
    },
    {
      func: 'fetch',
      url: `//${fullSubdomain}/fetch-noheaders?sessionid=${sessionid}`,
      args: {
        mode: 'cors',
      },
    },
    {
      func: 'fetch',
      url: `//${fullSubdomain}/fetch-post-noheaders.json?sessionid=${sessionid}`,
      args: {
        method: 'post',
        mode: 'cors',
        body: JSON.stringify({ sessionid: sessionid }),
      },
    },
    {
      func: 'fetch',
      url: `//${fullSubdomain}/fetch-headers?sessionid=${sessionid}`,
      args: {
        headers: {
          [headerCaseTest]: randomText(),
          'x-lower-sessionid': randomText(),
          [randomText()]: '1',
          accept: 'application/json',
        },
        mode: 'cors',
      },
    },
    {
      func: 'fetch',
      url: `//${fullSubdomain}/fetch-post-headers.json?sessionid=${sessionid}`,
      args: {
        method: 'post',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          [headerCaseTest]: randomText(),
          'x-lower-sessionid': randomText(),
          [randomText()]: '1',
        },
        body: JSON.stringify({ sessionid: sessionid }),
      },
    },

    {
      func: 'fetch',
      url: `//${fullExternal}/fetch-noheaders?sessionid=${sessionid}`,
      args: {
        mode: 'cors',
      },
    },
    {
      func: 'fetch',
      url: `//${fullExternal}/fetch-post-noheaders.json`,
      args: {
        method: 'post',
        mode: 'cors',
        body: JSON.stringify({ sessionid: sessionid }),
      },
    },
    {
      func: 'fetch',
      url: `//${fullExternal}/fetch-headers?sessionid=${sessionid}`,
      args: {
        headers: {
          [headerCaseTest]: randomText(),
          'x-lower-sessionid': randomText(),
          [randomText()]: '1',
          accept: 'application/json',
        },
        mode: 'cors',
      },
    },
    {
      func: 'fetch',
      url: `//${fullExternal}/fetch-post-headers.json?sessionid=${sessionid}`,
      args: {
        method: 'post',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          [headerCaseTest]: randomText(),
          'x-lower-sessionid': randomText(),
          [randomText()]: '1',
        },
        body: JSON.stringify({ sessionid: sessionid }),
      },
    },
  ];
}

function randomText() {
  return Math.random()
    .toString(36)
    .substring(2);
}
