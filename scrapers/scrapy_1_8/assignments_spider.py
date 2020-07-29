import scrapy
import json
import os
from scrapy import signals
from collections import namedtuple
import urllib.request

class AssignmentsSpider(scrapy.Spider):
    name = "assignments"
    start_assignments_url = 'http://a0.ulixee-test.org:3000/start?scraper=scrapy_1_8'
    finish_assignments_url = 'http://a0.ulixee-test.org:3000/finish?scraper=scrapy_1_8'
    assignments = []

    custom_settings = {
       'DUPEFILTER_CLASS':'scrapy.dupefilters.BaseDupeFilter'
    }

    @classmethod
    def from_crawler(cls, crawler, *args, **kwargs):
        spider = super(AssignmentsSpider, cls).from_crawler(crawler, *args, **kwargs)
        crawler.signals.connect(spider.spider_idle, signal=signals.spider_idle)
        return spider

    def start_requests(self):
      print('Start requests, loading assignments: ' + self.start_assignments_url)
      dataDir = os.path.dirname(os.path.abspath(__file__)) + '/sessions'
      print(dataDir)
      start_assignments_url = self.start_assignments_url + '&dataDir=' + dataDir
      content = urllib.request.urlopen(start_assignments_url).read()
      data = json.loads(content)
      self.assignments = data['assignments']
      for assignment in data['assignments']:
        url = 'http://a0.ulixee-test.org:3000/start/' + str(assignment['id']) + '?scraper=scrapy_1_8'
        yield scrapy.Request(url=url, callback=self.start_assignment)

    def spider_idle(self):
        print('Spider idle')
        for assignment in self.assignments:
          self.finish_assignment(assignment)
        print('Checking pending assignments')
        contents = urllib.request.urlopen(self.finish_assignments_url).read()
        print (contents)

    def start_assignment(self, response):
        jsonresponse = json.loads(response.text)
        if "assignment" in jsonresponse and jsonresponse["assignment"] is not None:
            assignment = jsonresponse['assignment']
            print('STARTING ASSIGNMENT: ' + str(assignment['id']))
            print(assignment)
            yield scrapy.Request(
                url = assignment['pages'][0]['url'],
                callback = self.extract_page,
                cb_kwargs = assignment,
                meta = { "referrer_policy" : 'no-referrer'},
                headers = {'User-Agent': assignment['useragent'] }
              )

    def extract_page(self, response, **assignment):
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

        url_was_last_page = False
        for page in assignment['pages']:
            print("Check url", page['url'], response.url)
            if url_was_last_page:
                url = page["url"]
                print("Load url", url)
                yield response.follow(
                   url,
                   headers = {'User-Agent': assignment["useragent"]},
                   cb_kwargs = assignment,
                   callback = self.extract_page
                )
            elif page['url'] == response.url:
                if  "clickSelector" in page:
                    css_match = response.css(page["clickSelector"] + "::attr(href)")
                    url =  css_match[0].get() if css_match else page["clickDestinationUrl"]
                    print("Follow click", url)
                    yield response.follow(
                       url,
                       headers = {'User-Agent': assignment["useragent"]},
                       cb_kwargs = assignment,
                       callback = self.extract_page
                    )
                else:
                    url_was_last_page = True

    def finish_assignment(self, assignment):
        print('FINISHING ASSIGNMENT: ' + str(assignment['id']))
        url = 'http://a0.ulixee-test.org:3000/finish/' + str(assignment['id']) + '?scraper=scrapy_1_8'
        urllib.request.urlopen(url).read()

    def no_extract(self, response):
        print('Downloaded file', response.url)
