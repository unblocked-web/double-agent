if [ -z "$1" ]
then
  echo "Dockerfile not specified"
  echo $USAGE
  exit 0
fi

file=$1
name=$(echo "$1" | awk '{print tolower($0)}')

docker build -f "Dockerfile-${file}" -t "${name}" .
echo "docker build -f "Dockerfile-${file}" -t "${name}" ."

dockerHost=$(docker run -it --rm node:12-slim getent hosts host.docker.internal | awk '{ print $1 }')
echo "Local docker internal ip is ${dockerHost}"

docker run --init -it --rm --name dumper --shm-size='3gb' -p=9224:9222 --cap-add=SYS_ADMIN \
  --add-host="a1.ulixee-test.org:${dockerHost}" \
  ${name}
