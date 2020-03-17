import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import HostDomain from '@double-agent/runner/interfaces/HostDomain';

const headerCaseTest = 'X-HeaDer-sessionid';
export { headerCaseTest };

export default function buildTestXhrs(ctx: IRequestContext) {
  const posts: { func: string; pathname: string; hostDomain: HostDomain; args: object }[] = [];
  for (const hostDomain of [HostDomain.Main, HostDomain.Sub, HostDomain.External]) {
    posts.push(
      {
        hostDomain,
        func: 'axios.get',
        pathname: 'axios-nocustomheaders.json',
        args: {
          mode: 'cors',
        },
      },
      {
        hostDomain,
        func: 'fetch',
        pathname: `fetch-nocustomheaders.json`,
        args: {
          mode: 'cors',
        },
      },
      {
        hostDomain,
        func: 'fetch',
        pathname: `fetch-post-nocustomheaders.json`,
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
        hostDomain,
        func: 'fetch',
        pathname: `fetch-headers.json`,
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
        hostDomain,
        func: 'axios.get',
        pathname: `axios-headers.json`,
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
        hostDomain,
        func: 'fetch',
        pathname: `fetch-post-headers.json`,
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
  return posts;
}

function randomText() {
  return Math.random()
    .toString(36)
    .substring(2);
}
