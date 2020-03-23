import scrapy
import json
from scrapy import signals
from collections import namedtuple
import urllib.request

class DirectivesSpider(scrapy.Spider):
    name = "directives"
    start_urls = ['http://a0.ulixee-test.org:3000/?scraper=scrapy_1_8']
    end_urls = ['http://a0.ulixee-test.org:3000/results?scraper=scrapy_1_8']

    custom_settings = {
       'DUPEFILTER_CLASS':'scrapy.dupefilters.BaseDupeFilter'
    }


    @classmethod
    def from_crawler(cls, crawler, *args, **kwargs):
        spider = super(DirectivesSpider, cls).from_crawler(crawler, *args, **kwargs)
        crawler.signals.connect(spider.spider_idle, signal=signals.spider_idle)
        return spider


    def spider_idle(self):
        print('Spider idle, getting results')
        contents = urllib.request.urlopen(self.end_urls[0]).read()
        print (contents)


    def parse(self, response):
        jsonresponse = json.loads(response.text)
        if "directive" in jsonresponse and jsonresponse["directive"] is not None:
            directive = jsonresponse['directive']
            print(directive)
            yield scrapy.Request(
                url = directive['pages'][0]['url'],
                callback = self.extract_page,
                cb_kwargs = directive,
                meta = { "referrer_policy" : 'no-referrer'},
                headers = {'User-Agent': directive['useragent'] }
              )

    def extract_page(self, response, **directive):
        for link in response.css('script'):
            if "src" in link.attrib:
                print("Following script", link.attrib['src'])
                yield response.follow(link.attrib['src'], self.no_extract)
        for link in response.css('link[rel="stylesheet"]'):
            if "href" in link.attrib:
                print("Following style", link.attrib['href'])
                yield response.follow(link.attrib['href'], self.no_extract)
        for link in response.css('img'):
            if "src" in link.attrib:
                print("Following img", link.attrib['src'])
                yield response.follow(link.attrib['src'], self.no_extract)

        still_on_pages = False
        url_was_last_page = False
        for page in directive['pages']:
            print("Check url", page['url'], response.url)
            if url_was_last_page:
                url = page["url"]
                still_on_pages = True
                print("Load url", url)
                yield response.follow(
                   url,
                   headers = {'User-Agent': directive["useragent"]},
                   cb_kwargs = directive,
                   callback = self.extract_page
                )
            elif page['url'] == response.url:
                if  "clickSelector" in page:
                    css_match = response.css(page["clickSelector"] + "::attr(href)")
                    url =  css_match[0].get() if css_match else page["clickDestinationUrl"]
                    print("Follow click", url)
                    still_on_pages = True
                    yield response.follow(
                       url,
                       headers = {'User-Agent': directive["useragent"]},
                       cb_kwargs = directive,
                       callback = self.extract_page
                    )
                else:
                    url_was_last_page = True


        if not still_on_pages:
            yield from self.next_directive(response)

    def next_directive(self, response):
        print("Next Directive")
        yield scrapy.Request(self.start_urls[0], self.parse)

    def no_extract(self, response):
        print('Downloaded file', response.url)
