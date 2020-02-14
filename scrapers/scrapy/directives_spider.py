import scrapy
import json
from collections import namedtuple

class DirectivesSpider(scrapy.Spider):
    name = "directives"
    start_urls = ['http://ulixee-test.org:3000/?scraper=scrapy']

    custom_settings = {
       'DUPEFILTER_CLASS':'scrapy.dupefilters.BaseDupeFilter'
    }

    def parse(self, response):
        jsonresponse = json.loads(response.text)
        if "directive" in jsonresponse:
            directive = jsonresponse['directive']
            print(directive)
            yield response.follow(
                directive['url'],
                callback = self.parse_start_page,
                cb_kwargs = directive,
                headers = {'User-Agent': directive['useragent']}
              )

    def parse_start_page(self, response, **directive):
        print("Loaded test", response.request.url)
        if "clickItemSelector" in directive:
            print("Click", directive["clickItemSelector"])
            yield response.follow(
                   response.css(directive["clickItemSelector"] + "::attr(href)")[0].get(),
                   headers = {'User-Agent': directive["useragent"]},
                   cb_kwargs = directive,
                   callback = self.extract_page
                 )
        else:
            yield from self.extract_page(response, directive = directive)


    def extract_page(self, response, **directive):
        if "requiredFinalUrl" in directive:
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

            print("Final", directive["requiredFinalUrl"])
            yield response.follow(
               directive["requiredFinalUrl"],
               headers = {'User-Agent': directive["useragent"]},
               callback = self.next_directive
             )
        else:
           yield from self.next_directive(response)

    def next_directive(self, response):
        print("Next Directive")
        yield scrapy.Request(self.start_urls[0], self.parse)

    def no_extract(self, response):
        print('Downloaded file', response.url)
