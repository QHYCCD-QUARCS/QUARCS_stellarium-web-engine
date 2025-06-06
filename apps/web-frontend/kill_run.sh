# This tools is to kill the server , recompile the vue and c codes and restart the stellarium web server

# Kill process on port 8080
lsof -i:8080
pid=$(sudo lsof -i:8080 | awk '{ if (NR!=1) { print $2 } }')
if [ ! -z "$pid" ]; then
    kill -9 $pid
fi

# Kill process on port 9090
lsof -i:9090
pid=$(sudo lsof -i:9090 | awk '{ if (NR!=1) { print $2 } }')
if [ ! -z "$pid" ]; then
    kill -9 $pid
fi

sed -i '/VUE_APP_VERSION/d' .env
echo "VUE_APP_VERSION=$(date +%Y%m%d)" >> .env
make update-engine
make build
make start-all