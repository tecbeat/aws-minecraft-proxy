#!/usr/bin/env sh
TARGET=/etc/systemd/system/minecraft-proxy.service
CUR_PATH=`pwd`
NODE=$(realpath $(which node))
USER=`whoami`

# install dependencies
echo "Installing dependencies"
npm install

# install .service
echo ""
echo "Installing service to $TARGET"
sudo cp ./minecraft-proxy.service $TARGET
echo "Setting <path-goes-here> to $CUR_PATH"
sudo sed -i "s@<path-goes-here>@$CUR_PATH@g" $TARGET
echo "Setting <path-to-node> to $NODE"
sudo sed -i "s@<path-to-node>@$NODE@g" $TARGET
echo "Setting <user-goes-here> to $USER"
sudo sed -i "s@<user-goes-here>@$USER@g" $TARGET
echo "Setting <group-goes-here> to $USER"
sudo sed -i "s@<group-goes-here>@$USER@g" $TARGET

echo ""
echo "Reloading systemd"
sudo systemctl daemon-reload
echo "Starting minecraft-proxy"
sudo systemctl start minecraft-proxy
echo "Enabling minecraft-proxy so it starts on reboot"
sudo systemctl enable minecraft-proxy

echo ""
echo -e "\e[32mDone\e[0m"
echo -e "Update the configuration in package.json and then run\n  \e[36msudo systemctl restart minecraft-proxy\e[0m"
