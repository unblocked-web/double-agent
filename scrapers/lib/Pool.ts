import IAssignment from '@double-agent/runner/interfaces/IAssignment';

export default class Pool<T extends ICloseable> {
  private collection: Promise<T>[] = [];

  constructor(readonly count: number, readonly create: () => Promise<T>) {
    this.collection = Array(this.count)
      .fill(0)
      .map(() => this.create());
  }

  async run(cb: (client: T, assignment: IAssignment) => Promise<void>, assignment: IAssignment) {
    const entry = this.collection.shift();
    const client = await entry;
    try {
      await cb(client, assignment);
    } finally {
      this.collection.push(entry);
    }
  }

  async stop() {
    while (this.collection.length) {
      const entry = await this.collection.pop();
      await entry.close();
    }
  }
}

interface ICloseable {
  close(): Promise<any>;
}
