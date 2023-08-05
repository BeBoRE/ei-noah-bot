docker build -t ei-noah .
docker stop ei-noah
docker rm ei-noah
docker run --name ei-noah --env-file ./.env ei-noah
