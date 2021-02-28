docker stop ei-noah
docker rm ei-noah
docker build . --tag ei-noah
docker run --name ei-noah --env-file ./.env -v ./ormconfig.json:/usr/src/app/ormconfig.json ei-noah
PAUSE
