import { ChildProcess } from 'child_process';

export default class ServerResponse {
  private readonly child: ChildProcess;
  private readonly connectionId: string;

  constructor(child, { connectionId }: { connectionId: string }) {
    this.child = child;
    this.connectionId = connectionId;
  }

  end(body?: string) {
    this.child.send({
      response: {
        connectionId: this.connectionId,
        body,
      },
    });
  }
}
