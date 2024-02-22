QUARCS_stellarium-web-engine
=====================

Features
--------

- Atmosphere simulation.
- Gaia stars database access (more than 1 billion stars).
- HiPS surveys rendering.
- High resolution planet textures.
- Constellations.
- Support for adding layers and shapes in the sky view.
- Landscapes.


Build
----------------------------

You need to make sure you have both emscripten and sconstruct installed.

- Install emsdk:
Reference: [Emscripten Getting Started](https://emscripten.org/docs/getting_started/downloads.html#)

        # Download the source code of emsdk
        git clone https://github.com/emscripten-core/emsdk.git
        
        # Enter emsdk folder and install the latest SDK tools.
        ./emsdk install latest
        
        # Make the "latest" SDK "active" for the current user. (writes .emscripten file)
        ./emsdk activate latest
        
        # Activate PATH and other environment variables in the current terminal
        source ./emsdk_env.sh
        
        # Install version 1.40.1 (too high or too low version may cause trouble in stellarium web compile)
        ./emsdk install 1.40.1
        ./emsdk activate 1.40.1
        
        # Get a tip-of-tree
        ./emsdk install tot
        
        # Again, install version 1.40.1 (too high or too low version may cause trouble in stellarium web compile)
        ./emsdk install 1.40.1
        ./emsdk activate 1.40.1

- Install SCONS:

        wget http://prdownloads.sourceforge.net/scons/scons-2.2.0.tar.gz
        tar zxvf scons-2.2.0.tar.gz
        cd scons-2.2.0
        sudo python setup.py install

- Download and Build Stellarium Web 
        
        # Download the QUARCS_stellarium-web-engine into the folder, eg: ~/workspace/QUARCS_stellarium-web-engine
        
        cd ~/workspace/QUARCS_stellarium-web-engine
        source $PATCH_TO_EMSDK/emsdk_env.sh
        make js


Note 1: If wget fails to download, you can enter the download link on the webpage directly. (VPN should not have this issue)

Note 2: If python setup.py install reports "python not found," change it to python3 setup.py install. If still an issue, install sudo apt-get install python2 and then sudo python2 setup.py install. Alternatively, create a soft link for python: sudo ln -s /usr/bin/python2 /usr/bin/python.

- Install Docker:

        # Install dependencies
        sudo apt-get install curl apt-transport-https ca-certificates software-properties-common
        
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
        sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
        sudo apt update
        apt-cache policy docker-ce
        sudo apt install docker-ce
        
        # Check if Docker can be started
        sudo systemctl status docker

- Install nodejs, npm, etc.:

        $ sudo apt-get remove nodejs
        $ sudo apt-get remove npm
        
        $ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.2/install.sh | bash
        $ chmod +x ~/.nvm/nvm.sh
        $ source ~/.bashrc
        
        $ nvm -v
        0.39.2
        
        $ nvm install 14
        
        $ node -v
        v14.20.1
        $ npm -v
        6.14.17
        
        $ nvm install 16
        
        $ node -v
        v16.18.0
        $ npm -v
        8.19.2
        
        $ nvm install 17
        
        $ node -v
        v17.9.1
        $ npm -v
        8.11.0
        
        $ nvm install 18

- Enter the foder QUARCS_stellarium-web-engine project/apps/web-frontend

        cd ~/workspace/QUARCS_stellarium-web-engine/apps/web-frontend
        sudo su    # Need to enter system permissions first
        make setup    # This step takes a long time
        make dev

- To start the project, run in the apps/web-frontend directory:

        sudo su
        sh kill_run.sh


Contributing
------------

In order for your contribution to Stellarium Web Engine to be accepted, you have to sign the
[Stellarium Web Contributor License Agreement (CLA)](doc/cla/sign-cla.md).
