current_dir=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

cd "${current_dir}/curl"
yarn install

cd ../lib
yarn install

cd ../node_12
yarn install

cd ../puppeteer_2_0
yarn install

cd ../puppeteer_2_0_incognito
yarn install

cd ../puppeteer_2_1
yarn install

cd ../puppeteer_2_1_chrome
yarn install

cd ../puppeteer_2_1_chrome_stealth
yarn install

cd ../scrapy_1_8
yarn install

cd ../secretagent
yarn install
