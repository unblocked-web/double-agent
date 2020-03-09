import { ChildProcess, fork } from 'child_process';
import ITlsResult from '../interfaces/ITlsResult';
import { IClientHello } from './parseHelloMessage';
import parseTlsRecordFromStderr from './parseTlsRecordFromStderr';
import buildJa3 from './buildJa3';
import buildJa3Extended from './buildJa3Extended';
import IClientHelloMessage from '../interfaces/IClientHelloMessage';

export default class ForkedServerRunner {
  private child: ChildProcess;
  private log: string;
  public port: number;

  public stop() {
    this.child.kill();
  }

  public async start(
    port,
    onTlsResult: (message: ITlsResult) => void,
    redirectAfterLoadHref?: string,
  ) {
    this.port = Number(port ?? 443);
    const env: any = {
      ...process.env,
      PORT: String(this.port),
    };
    if (redirectAfterLoadHref) {
      env.REDIRECT_HREF = redirectAfterLoadHref;
    }

    this.child = fork(__dirname + '/childServer', [], {
      stdio: ['ignore', 'inherit', 'pipe', 'ipc'],
      env,
    });

    this.child.on('error', err => {
      console.log('Error from tls child process', err);
    });

    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', this.onStderr.bind(this));

    let serverStarted: () => void;
    const promise = new Promise(resolve => {
      serverStarted = resolve;
    });
    this.child.on('message', (message: ITlsResult) => {
      if ((message as any).serverStarted) {
        return serverStarted();
      }
      onTlsResult(message);
    });

    await promise;
  }

  private onStderr(message: string) {
    this.log += message;
    const messages = this.log.split('\n\n');
    this.log = messages.pop();
    for (const str of messages) {
      if (process.env.PRINT_RAW) console.log('\n------RAW------\n%s\n\n', str);
      try {
        let message = parseTlsRecordFromStderr(str);
        if ((message.header.content as any)?.type === 'ClientHello') {
          const clienthello = message.header.content as IClientHello;
          const ja3Details = buildJa3(clienthello);
          const ja3Extended = buildJa3Extended(ja3Details, clienthello);
          this.child.send({
            clienthello,
            ja3Details,
            ja3Extended,
          } as IClientHelloMessage);
        }
      } catch (err) {
        console.log(err);
      }
    }
  }
}
