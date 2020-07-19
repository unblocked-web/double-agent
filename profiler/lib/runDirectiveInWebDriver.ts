import { By, Key, until, WebDriver, WebElement } from 'selenium-webdriver';
import IDirective from '@double-agent/runner/interfaces/IDirective';
import IDirectivePage from '@double-agent/runner/interfaces/IDirectivePage';

export default async function runDirectiveInWebDriver(
  driver: WebDriver,
  directive: IDirective,
  browserName: string,
  browserVersion: string,
) {
  const needsEnterKey = browserName == 'Safari' && browserVersion === '13.0';

  let prev: IDirectivePage;
  for (const page of directive.pages) {
    let currentUrl = await driver.getCurrentUrl();
    if (prev && prev.clickSelector && currentUrl !== page.url) {
      // edge 18 takes forever to test codecs.. so need to wait a long time for page to load
      await driver.wait(until.urlIs(page.url), 120e3);
      currentUrl = await driver.getCurrentUrl();
    }

    if (page.url !== currentUrl) {
      console.log('Load page %s (was %s)', page.url, currentUrl);
      await driver.get(page.url);
    }

    if (page.waitForElementSelector) {
      console.log('Wait for element %s on %s', page.waitForElementSelector, page.url);
      await waitForElement(driver, page.waitForElementSelector);
    } else {
      console.log('Wait for body on %s', page.url);
      await waitForElement(driver, 'body');
    }

    if (page.clickSelector) {
      console.log('Click element %s on %s', page.clickSelector, page.url);
      const elem = await waitForElement(driver, page.clickSelector);
      await driver.wait(until.elementIsVisible(elem));

      await clickElement(elem, driver, needsEnterKey);
    }
    prev = page;
  }
}

async function waitForElement(driver: WebDriver, cssSelector: string) {
  // try {
  return driver.wait(until.elementLocated(By.css(cssSelector)));
  // } catch(error) {
  //   console.log(`waitForElement Error: ${cssSelector}... `, error);
  //   await new Promise(r => setTimeout(r, 5000));
  // }
}

async function clickElement(elem: WebElement, driver: WebDriver, needsEnterKey: boolean) {
  if (needsEnterKey) {
    // safari 13.0 has a known bug where clicks don't work that's making this necessary
    await driver
      .actions()
      .mouseMove(elem)
      .click(elem)
      .perform();
    try {
      await elem.click();
    } catch (error) {
      console.log('Error: could not click')
    }
    try {
      await elem.sendKeys(Key.RETURN);
    } catch (error) {
      console.log('Error: could not sendKeys')
    }
  } else {
    await elem.click();
  }
}

export async function createNewWindow(driver: WebDriver) {
  console.log('Opening new window');
  await driver.executeScript('window.open()');
  await driver.close();
  const handles = await driver.getAllWindowHandles();
  await driver.switchTo().window(handles.pop());
}
