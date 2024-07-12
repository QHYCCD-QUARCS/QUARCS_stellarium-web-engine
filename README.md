# QUARCS_stellarium-web-engine

![example-1 2](https://github.com/QHYCCD-QUARCS/QUARCS_stellarium-web-engine/assets/158538628/1fdb2fc3-7b6b-42fb-ba9e-bc4cf6f613a1)
![example-2 2](https://github.com/QHYCCD-QUARCS/QUARCS_stellarium-web-engine/assets/158538628/7ad24990-f259-4396-bb94-e56f6f94abc3)

## Features

- Planned task table.
- Autofocus function.
- Improve the configuration page of the device.
- State recovery after client disconnection and reconnection.
- Southern polar axis.
- Target search in star maps.
- Obtain status feedback (debug information) from the server.
- Some improvements in interaction logic.

## Build(Linux)

You need to make sure you have both emscripten and sconstruct installed.

### Install emsdk

```shell
# Download the source code of emsdk
git clone https://github.com/emscripten-core/emsdk.git

# Enter emsdk directory
cd emsdk
        
# Enter emsdk folder and install the latest SDK tools.
./emsdk install latest
        
# Make the "latest" SDK "active" for the current user. (writes .emscripten file)
./emsdk activate latest
        
# Activate PATH and other environment variables in the current terminal
source ./emsdk_env.sh
        
# Get a tip-of-tree
./emsdk install tot
        
# Again, install version 1.40.1 (too high or too low version may cause trouble in stellarium web compile)
./emsdk install 1.40.1
./emsdk activate 1.40.1
```

Reference: [Emscripten Getting Started](https://emscripten.org/docs/getting_started/downloads.html#)

### Install SCONS

```shell
sudo apt-get install scons
```

### Download and Build Stellarium Web

```shell
# Download the QUARCS_stellarium-web-engine into the folder, eg: ~/workspace/QUARCS_stellarium-web-engine
git clone https://github.com/AstroAir/QUARCS_stellarium-web-engine.git
cd QUARCS_stellarium-web-engine
source $PATCH_TO_EMSDK/emsdk_env.sh # If you have not switched terminals until now, then this step is not necessary
make js # build stellarium-web-engine.js and stellarium-web-engine.wasm
```

> [!IMPORTANT]
> To install EMSDK in China, it is necessary to use a ladder or other methods to ensure that googleapi.com can be accessed

### Install nodejs, npm

> [!IMPORTANT]
> Actual testing has shown that Node20 may encounter build errors, and it is recommended to use Node12.

```shell
# Delete old packages to avoid any impact on the future
sudo apt-get remove nodejs
sudo apt-get remove npm

# Install the version manager for nvm and nodejs
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.2/install.sh | bash
$ chmod +x ~/.nvm/nvm.sh
$ source ~/.bashrc

# Check if nvm has been successfully installed
nvm -v
nvm install 12
```

### Install Docker

- If you don't want to use Docker, you can also manually build the frontend, as detailed in the following text [手动构建](#build-manually)

```shell
sudo apt-get install curl apt-transport-https ca-certificates software-properties-common
        
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt update
apt-cache policy docker-ce
sudo apt install docker-ce
        
# Check if Docker can be started
sudo systemctl status docker
# If you are using an environment similar to Github Codespaces to build, please run the following alternative command
sudo service docker start
```

#### Build docker files

```shell
cd ~/QUARCS_stellarium-web-engine/apps/web-frontend
sudo su    # Need to enter system permissions first
make setup    # This step takes a long time
make dev
```

#### Start

To start the project, run in the apps/web-frontend directory:

```shell
sudo su
sh kill_run.sh
```

### Build Manually

```shell
cd ~/QUARCS_stellarium-web-engine/apps/web-frontend
yarn # install dependencies
yarn run dev # run a development server

# build
yarn run build
```

## Contributing

In order for your contribution to Stellarium Web Engine to be accepted, you have to sign the
[QUARCS_Stellarium Web Contributor License Agreement (CLA)](doc/cla/sign-cla.md).

Welcome to join the QUARUS Discod discussion group for online discussions (<https://discord.gg/uHTPfJ5uuV>)
