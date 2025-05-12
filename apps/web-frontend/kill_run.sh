# This tools is to kill the server , recompile the vue and c codes and restart the stellarium web server

lsof -i:8080
pid=$(sudo lsof -i:8080 | awk '{ if (NR!=1) { print $2 } }')
sed -i '/VUE_APP_VERSION/d' .env
echo "VUE_APP_VERSION=$(date +%Y%m%d)" >> .env
kill -9 $pid
make update-engine
make build
make start