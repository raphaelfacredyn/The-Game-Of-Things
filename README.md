# The Game of Things
===================
The beginnings of an io game made with socket.io and matter.js.


### Running

* Simply clone the repository, preferably the master branch as it is the most likely to work:
    ```bash
    git clone https://github.com/raphy1234/The-Game-Of-Things.git
    ```


* Get all the dependencies:
    ```bash
    npm install
    ```


* In [public/login.js](public/login.js) there is a line that looks like this:
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
    >Note, this server is in no way secure so please so do not run it on a public ip as it will most likely be hacked

### Game play

* ##### Movement
    
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Your are constantly moving, you can decide which direction you are going by moving the mouse around your player which is always in the center.

* ##### Fighting
    
    * ###### Ground Bullets
        
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The little colored squares on the ground are bullets which can be picked up in order to be shot. The number of bullets you have is the number floating above your player. 
    
    * ###### Bullets
        
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;You can shoot bullets by pressing the space key, they will be fired in the direction your player is facing. They deal 7 damage to whoever they hit, including their shooter. Bullets despawn after 8 seconds.
    
    * ###### Bombs
        
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;You can place a bomb for 10 bullets, it will push you forward and appear behind you. When hit by a bullet, bombs explode and shoot 32 new bullets in a circle. The bullet that triggers a bomb can come from any player or even another bomb.
    
    * ###### Collision
        
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;When players collide they are each dealt as much damage as a bullet.

* ##### Health
    
    * ###### Health
        
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;You start with 100 health which is displayed by the bar above your player. The red part of the bar represents health you have lost. The green part is what you have left.
    
    * ###### Regeneration
        
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Your health regenerates by 0.3 every 0.1 seconds so that it is a smooth increase.
    
    * ###### Life Boosts
        
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Life boosts (the heart shapes) increase your health and max health by 5
