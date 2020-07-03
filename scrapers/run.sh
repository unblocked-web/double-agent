if [ -z "$1" ]
then
  echo "Scraper directory not specified"
  echo $USAGE
  exit 0
fi

scraper=$1

docker build -f "Dockerfile-node12-slim" -t "double-agent-scraper-base" .

echo "docker build -f "$scraper/Dockerfile" -t "da-$scraper" ."
docker build -f "$scraper/Dockerfile" -t "da-$scraper" .

dockerHost=$(docker run -it --rm "da-$scraper" getent hosts host.docker.internal | awk '{ print $1 }')
echo "Local docker internal ip is ${dockerHost}"

docker run -it --rm --init --cap-add=SYS_ADMIN \
  --shm-size=1gb \
  --add-host="a0.ulixee-test.org:$dockerHost" \
  --add-host="a1.ulixee-test.org:$dockerHost" \
  --add-host="a1.dlf.org:$dockerHost" \
  --add-host="tls.ulixee-test.org:$dockerHost" \
  "da-$scraper"
