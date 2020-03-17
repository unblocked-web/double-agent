export default interface IDirectivePage {
  url: string;
  clickSelector?: string;
  clickDestinationUrl?: string; // if click loads a url, this is what it will be
  waitForElementSelector?: string; // if user should wait for something to appear
}
