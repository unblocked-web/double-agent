import child_process from 'child_process';
import parseRecord from './lib/parseRecord';
import buildJa3 from './lib/buildJa3';
import { IClientHello } from './lib/parseHelloMessage';
import buildJa3Extended from './lib/buildJa3Extended';

const child = child_process.fork('./lib/server', [], {
  stdio: ['ignore', 'inherit', 'pipe', 'ipc'],
});

let log = '';
child.on('error', err => {
  console.log(err);
});
child.stderr.setEncoding('utf8');
child.stderr.on('data', message => {
  log += message;
  const messages = log.split('\n\n');
  log = messages.pop();
  for (const str of messages) {
    if (process.env.PRINT_RAW) console.log('\n------RAW------\n%s\n\n', str);
    try {
      let message = parseRecord(str);
      if ((message.header.content as any)?.type === 'ClientHello') {
        const ja3 = buildJa3(message.header.content as IClientHello);
        const ja3Extended = buildJa3Extended(ja3, message.header.content as IClientHello);
        child.send({ clienthello: message.header.content, ja3, ja3Extended });
      }
    } catch (err) {
      console.log(err);
    }
  }
});
