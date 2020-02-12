const headerCaseTest = 'X-HeaDer-Key';
export { headerCaseTest };

export default function buildTestXhrs(key: string, fullSameSite: string, fullCrossSite: string) {
  return [
    { func: 'ws', url: 'host' },
    { func: 'ws', url: `${fullSameSite}?hkey=${key}` },
    { func: 'ws', url: `${fullCrossSite}?hkey=${key}` },
    {
      func: 'axios.get',
      url: `axios-noheaders.json`,
      args: {
        params: {
          hkey: key,
        },
      },
    },
    { func: 'fetch', url: `fetch-noheaders.json?hkey=${key}` },
    {
      func: 'fetch',
      url: `fetch-post-noheaders.json?hkey=${key}`,
      args: {
        method: 'post',
        body: JSON.stringify({
          hkey: key,
          [randomText()]: randomText(),
          [randomText()]: randomText(),
          [randomText()]: randomText(),
        }),
      },
    },
    {
      func: 'fetch',
      url: 'fetch-headers.json?hkey=' + key,
      args: {
        headers: {
          [headerCaseTest]: randomText(),
          'x-lower-key': randomText(),
          [randomText()]: '1',
        },
      },
    },
    {
      func: 'axios.get',
      url: 'axios-headers.json',
      args: {
        params: {
          hkey: key,
        },
        headers: {
          [headerCaseTest]: randomText(),
          'x-lower-key': randomText(),
          [randomText()]: '1',
        },
      },
    },
    {
      func: 'fetch',
      url: 'fetch-post-headers.json',
      args: {
        method: 'post',
        headers: {
          [headerCaseTest]: randomText(),
          'x-lower-key': randomText(),
          [randomText()]: '1',
        },
        body: JSON.stringify({ hkey: key }),
      },
    },
    {
      func: 'fetch',
      url: `//${fullSameSite}/fetch-noheaders?hkey=${key}`,
      args: {
        mode: 'cors',
      },
    },
    {
      func: 'fetch',
      url: `//${fullSameSite}/fetch-post-noheaders.json`,
      args: {
        method: 'post',
        mode: 'cors',
        body: JSON.stringify({ hkey: key }),
      },
    },
    {
      func: 'fetch',
      url: `//${fullSameSite}/fetch-headers?hkey=${key}`,
      args: {
        headers: {
          [headerCaseTest]: randomText(),
          'x-lower-key': randomText(),
          [randomText()]: '1',
          accept: 'application/json',
        },
        mode: 'cors',
      },
    },
    {
      func: 'fetch',
      url: `//${fullSameSite}/fetch-post-headers.json`,
      args: {
        method: 'post',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          [headerCaseTest]: randomText(),
          'x-lower-key': randomText(),
          [randomText()]: '1',
        },
        body: JSON.stringify({ hkey: key }),
      },
    },

    {
      func: 'fetch',
      url: `//${fullCrossSite}/fetch-noheaders?hkey=${key}`,
      args: {
        mode: 'cors',
      },
    },
    {
      func: 'fetch',
      url: `//${fullCrossSite}/fetch-post-noheaders.json`,
      args: {
        method: 'post',
        mode: 'cors',
        body: JSON.stringify({ hkey: key }),
      },
    },
    {
      func: 'fetch',
      url: `//${fullCrossSite}/fetch-headers?hkey=${key}`,
      args: {
        headers: {
          [headerCaseTest]: randomText(),
          'x-lower-key': randomText(),
          [randomText()]: '1',
          accept: 'application/json',
        },
        mode: 'cors',
      },
    },
    {
      func: 'fetch',
      url: `//${fullCrossSite}/fetch-post-headers.json`,
      args: {
        method: 'post',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          [headerCaseTest]: randomText(),
          'x-lower-key': randomText(),
          [randomText()]: '1',
        },
        body: JSON.stringify({ hkey: key }),
      },
    },
  ];
}

function randomText() {
  return Math.random()
    .toString(36)
    .substring(2);
}
