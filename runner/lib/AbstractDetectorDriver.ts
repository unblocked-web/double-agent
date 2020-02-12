import IDetectionDriver from './IDetectionDriver';
import IDirective from './IDirective';
import IDetectionResult from './IDetectionResult';

export default abstract class AbstractDetectorDriver implements IDetectionDriver {
  protected get waitingForResult() {
    if (!this.activeDirective) return false;
    return this.results.some(x => x.directive === this.activeDirective) === false;
  }

  protected activeDirective?: IDirective;

  private results: IDetectionResult[] = [];

  public getResults() {
    return this.results;
  }

  public async nextDirective() {
    if (this.activeDirective && this.waitingForResult) {
      this.recordFailure('Directive not called');
    }
    this.activeDirective = this.directives.shift();
    if (!this.activeDirective) {
      await this.stop();
    }
    return this.activeDirective;
  }

  protected recordResult(
    success: boolean,
    result: Omit<IDetectionResult, 'directive' | 'success'>,
  ) {
    console.log(
      `Result ${success ? 'passed' : result.omitted ? 'omitted' : 'failed'} for test '${
        result.name
      }': ${this.activeDirective.browser} ${this.activeDirective.browserMajorVersion ?? ''} on ${
        this.activeDirective.os
      } ${this.activeDirective.osVersion ?? ''} => ${result.reason}`,
    );
    this.results.push({
      success,
      directive: this.activeDirective,
      ...result,
    });
  }

  protected abstract recordFailure(message: string, useragent?: string);
  protected abstract directives: IDirective[];
  protected abstract async stop();

  public etcHostEntries: string[] = [];
  public abstract start(getPort: () => number): Promise<void>;
}
