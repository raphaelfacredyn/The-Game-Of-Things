# The Game of Things
The beginnings of an io game made with socket.io and matter.js. You can try it [here](http://www.rfsite.tk:8080/).


### Running

* Simply clone the repository, preferably the master branch as it is the most likely to work:
    ```bash
    git clone https://github.com/raphy1234/The-Game-Of-Things.git
    ```


* Enter the cloned repository:
    ```bash
    cd The-Game-Of-Things
    ```


* Get all the dependencies:
    ```bash
    npm install
    ```


* In public/login.js there is a line that looks like this:
    ```javascript
    socket = io.connect('raphael-macbook.local:8080')
    ```
    Change it to:
    ```javascript
    socket = io.connect('your-local-ip:8080')
    ```


* Run the server:
    ```bash
    node server.js
    ```


* Now simply go to http://localhost:8080/ or http://127.0.0.1:8080/ or http://your-local-ip:8080/ and enjoy. The last option can be sent to other computers on the same network so that they can play with you
    >Note: this server is in no way secure so please do not run it on a public ip as it will most likely be hacked as well as the computer it is running on 
