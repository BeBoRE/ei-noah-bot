docker stop ei-noah
docker rm ei-noah
docker build -t ei-noah .
docker run --name ei-noah --env-file ./.env ei-noah
PAUSE
