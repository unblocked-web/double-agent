import { By, Key, until, WebDriver, WebElement } from 'selenium-webdriver';
import IDirective from '@double-agent/runner/interfaces/IDirective';

export default async function runDirectiveInWebDriver(
  driver: WebDriver,
  directive: IDirective,
  browserName: string,
  browserVersion: string,
) {
  const needsEnterKey = browserName == 'Safari' && parseInt(browserVersion, 10) >= 13;

  for (const page of directive.pages) {
    let currentUrl = await driver.getCurrentUrl();
    if (currentUrl && page.url !== currentUrl) {
      try {
        await driver.wait(until.urlIs(page.url), 1e3);
        currentUrl = await driver.getCurrentUrl();
      } catch (err) {}
    }

    if (page.url !== currentUrl) {
      console.log('Load page %s (was %s)', page.url, currentUrl);
      await driver.get(page.url);
    }

    if (page.waitForElementSelector) {
      console.log('Wait for element %s on %s', page.waitForElementSelector, page.url);
      await waitForElement(driver, page.waitForElementSelector);
    } else {
      await waitForElement(driver, 'body');
    }

    if (page.clickSelector) {
      console.log('Click element %s on %s', page.clickSelector, page.url);
      const elem = await waitForElement(driver, page.clickSelector);
      await driver.wait(until.elementIsVisible(elem));

      await clickElement(elem, driver, needsEnterKey);
    }
  }
}

async function waitForElement(driver: WebDriver, cssSelector: string) {
  return driver.wait(until.elementLocated(By.css(cssSelector)));
}

async function clickElement(elem: WebElement, driver: WebDriver, needsEnterKey: boolean) {
  if (needsEnterKey) {
    // safari 13.0 has a known bug where clicks don't work that's making this necessary
    await driver
      .actions()
      .mouseMove(elem)
      .click(elem)
      .perform();
    await elem.click();

    await elem.sendKeys(Key.RETURN);
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
