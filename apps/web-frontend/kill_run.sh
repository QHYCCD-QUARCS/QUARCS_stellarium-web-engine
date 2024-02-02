# This tools is to kill the server , recompile the vue and c codes and restart the stellarium web server

lsof -i:8080
pid=$(sudo lsof -i:8080 | awk '{ if (NR!=1) { print $2 } }')
kill -9 $pid
make update-engine
make build
make start