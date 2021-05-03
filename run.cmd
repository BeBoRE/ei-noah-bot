docker stop ei-noah
docker rm ei-noah
docker build -t ei-noah .
docker run --name ei-noah --env-file ./.docker.env ei-noah
PAUSE
