import IDetectionDriver from './IDetectionDriver';
import IDirective from './IDirective';
import IDetectionResult from './IDetectionResult';
import fs from 'fs';

export default abstract class AbstractDetectorDriver implements IDetectionDriver {
  private _testCategories: string[];
  public get testCategories() {
    if (!this._testCategories) {
      const profileJson = JSON.parse(fs.readFileSync(this.dirname + '/package.json', 'utf8'));
      this._testCategories = profileJson['test-categories'] ?? [];
    }
    return this._testCategories;
  }

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
      this.directiveNotRun('Directive not called');
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
      }': ${this.activeDirective.browserGrouping} => ${result.reason}`,
    );

    if (!this.testCategories.includes(result.category)) {
      console.log(this.testCategories);
      throw new Error('Invalid category provided for test result - ' + result.category);
    }

    this.results.push({
      success,
      directive: this.activeDirective,
      ...result,
    });
  }

  public etcHostEntries: string[] = [];

  protected directiveNotRun(reason: string) {
    for (const category of this.testCategories) {
      this.recordResult(false, {
        omitted: true,
        category,
        reason,
      });
    }
  }

  public abstract start(getPort: () => number): Promise<void>;
  protected abstract directives: IDirective[];
  protected abstract dirname;
  protected abstract async stop();
}
