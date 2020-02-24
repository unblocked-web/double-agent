export default interface IDirective {
  module?: string;
  browserGrouping: string;
  isOsTest: boolean;
  useragent: string;
  url: string;
  clickItemSelector?: string;
  clickDestinationUrl?: string; // if an item needed to be clicked, this is an alternate way to follow
  requiredFinalUrl?: string; // if a final url needs to be called for the test, run it here
  requiredFinalClickSelector?: string;
  waitForElementSelector?: string;
}
