FROM python:3

# Set the working directory to /usr/src/app.
WORKDIR /usr/src/app

# Copy the file from the local host to the filesystem of the container at the working directory.
COPY /scrapy_1_8 .

# Install Scrapy specified in requirements.txt.
RUN pip3 install --no-cache-dir -r requirements.txt

CMD scrapy runspider assignments_spider.py
