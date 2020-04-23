import IRequestContext from '../interfaces/IRequestContext';
import { URL } from 'url';

export function sendJson(ctx: IRequestContext, data: any) {
  const res = ctx.res;
  if (ctx.req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', ctx.req.headers.origin);
  } else if (ctx.req.headers.referer) {
    res.setHeader('Access-Control-Allow-Origin', new URL(ctx.req.headers.referer).origin);
  }
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  });

  res.end(JSON.stringify(data));
}
