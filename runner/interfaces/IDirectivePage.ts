export default interface IDirectivePage {
  url: string;
  clickSelector?: string;
  waitForElementSelector?: string; // if user should wait for something to appear
}
