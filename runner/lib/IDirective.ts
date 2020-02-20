export default interface IDirective {
  module?: string;
  browser: 'Chrome' | 'Firefox' | 'Edge' | string;
  browserMajorVersion?: string;
  os: 'Linux' | 'Mac OS X' | 'Windows' | string;
  osVersion?: string;
  useragent: string;
  url: string;
  clickItemSelector?: string;
  clickDestinationUrl?: string; // if an item needed to be clicked, this is an alternate way to follow
  requiredFinalUrl?: string; // if a final url needs to be called for the test, run it here
  requiredFinalClickSelector?: string;
  waitForElementSelector?: string;
}
