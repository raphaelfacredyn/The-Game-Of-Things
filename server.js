//Parameters
var worldDimensions = {
    x: 1600,
    y: 1600
};
var express = require('express');
var app = express();
var server = app.listen(8080);
var playerSpeed = 10;
var bulletSpeed = 2.5 * playerSpeed;
var defaultPlayerSize = 80;
var defaultBulletSize = 8;
var fps = 20;
var bulletDamage = 7;
var lifeBoostGain = 5;
var startingHealth = 100;
var groundBulletDensity = 20000; // less is more
var numOfGroundBullets = worldDimensions.x * worldDimensions.y / groundBulletDensity;
var lifeBoostDensity = 960000; // less is more
var numOfLifeBoosts = worldDimensions.x * worldDimensions.y / lifeBoostDensity;
var groundBulletSize = 6;
var bulletLifeTime = 8;
var timeBetweenRegenerations = 100;
var regenerateAmount = 0.3;
var playerCollisionDamage = bulletDamage;
var numOfColors = 6;
var bulletsNeededForABomb = 10;
var bulletsPerBomb = 32;

//Import matter-js (physics engine)
var Matter = require('matter-js');
var engine = Matter.Engine.create();

//Set gravity
engine.world.gravity = {
    x: 0,
    y: 0
};

var wallWidth = 100;

//Make the walls
Matter.World.add(engine.world, [
    Matter.Bodies.rectangle(worldDimensions.x / 2, -wallWidth / 2, worldDimensions.x + 2 * wallWidth, wallWidth, {
        isStatic: true
    }),
    Matter.Bodies.rectangle(worldDimensions.x / 2, worldDimensions.y + wallWidth / 2, worldDimensions.x + 2 * wallWidth, wallWidth, {
        isStatic: true
    }),
    Matter.Bodies.rectangle(worldDimensions.x + wallWidth / 2, worldDimensions.y / 2, wallWidth, worldDimensions.y + 2 * wallWidth, {
        isStatic: true
    }),
    Matter.Bodies.rectangle(-wallWidth / 2, worldDimensions.y / 2, wallWidth, worldDimensions.y + 2 * wallWidth, {
        isStatic: true
    })
]);

//Name the walls wall and make them white
for (var i = 0; i < engine.world.bodies.length; i++) {
    engine.world.bodies[i].label = 'wall';
    engine.world.bodies[i].render.fillStyle = '#ffffff'
}

//Server setup
app.use(express.static('public'));

//Socket.io (live communication engine) setup
var socket = require('socket.io');
var io = socket(server);


//Send the world to the players every frame
setInterval(function () {
    //Update bullet life time and delete old ones
    for (var i = 0; i < engine.world.bodies.length; i++) {
        if (engine.world.bodies[i].label === 'bullet') {
            engine.world.bodies[i].timeSinceBorn += 1 / fps
        }
        if (engine.world.bodies[i].timeSinceBorn >= bulletLifeTime) {
            Matter.World.remove(engine.world, engine.world.bodies[i])
        }
    }

    //Tell the physics engine to move forward one tick
    Matter.Engine.update(engine, 1000 / fps);

    //Change bodies array to not refer itself because otherwise it becomes infinitely large
    var simplifiedBodies = simplifyBodies(engine.world.bodies);

    //Send the bodies array to each client so that they can display it
    io.sockets.emit('worldUpdate', simplifiedBodies)
}, 1000 / fps);

//Makes ground bullets disappear on contact and add themselves to player
Matter.Events.on(engine, 'collisionStart', function (event) {
    //Try catch because sometimes the pairs are undefined for some reason
    try {
        var pairs = event.pairs;
        //Loop through all the pairs of collisions
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            //Check for both cases of player-groundBullet or groundBullet-player
            if (pair.bodyA.label === 'player' && pair.bodyB.label === 'groundBullet') {
                //Give the player a bullet
                pair.bodyA.numOfBullets++;
                //Remove the ground bullet
                Matter.World.remove(engine.world, pair.bodyB)
            }
            if (pair.bodyA.label === 'groundBullet' && pair.bodyB.label === 'player') {
                Matter.World.remove(engine.world, pair.bodyA);
                pair.bodyB.numOfBullets++;
            }
        }
    } catch (e) {
    }
});

//makes life boosts disappear on contact and add themselves to player
Matter.Events.on(engine, 'collisionStart', function (event) {
    //Try catch because sometimes the pairs are undefined for some reason
    try {
        var pairs = event.pairs;
        //Loop through all the pairs of collisions
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            //Check for both cases of player-lifeBoost or lifeBoost-player
            if (pair.bodyA.label === 'player' && pair.bodyB.label === 'lifeBoost') {
                //Increase the player's maxHealth
                pair.bodyA.maxHealth += lifeBoostGain;
                //Increase the player's health by the same amount
                pair.bodyA.health += lifeBoostGain;
                //Remove the life boost
                Matter.World.remove(engine.world, pair.bodyB)
            }
            if (pair.bodyA.label === 'lifeBoost' && pair.bodyB.label === 'player') {
                Matter.World.remove(engine.world, pair.bodyA);
                pair.bodyB.maxHealth += lifeBoostGain;
                pair.bodyB.health += lifeBoostGain;
            }
        }
    } catch (e) {
    }
});

//Hurt people when they hit a bullet
Matter.Events.on(engine, 'collisionStart', function (event) {
    //Try catch because sometimes the pairs are undefined for some reason
    try {
        var pairs = event.pairs;
        //Loop through all the pairs of collisions
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            //Check for both cases of player-bullet or bullet-player
            if (pair.bodyA.label === 'player' && pair.bodyB.label === 'bullet') {
                //Deal the damage to the player
                pair.bodyA.health -= bulletDamage;
                //Remove the bullet
                Matter.World.remove(engine.world, pair.bodyB);
                //If the player has no more health, disconnect them
                if (pair.bodyA.health <= 0) {
                    io.sockets.connected[pair.bodyA.socketID].disconnect(); //Disconnect on death
                }
            }
            if (pair.bodyA.label === 'bullet' && pair.bodyB.label === 'player') {
                Matter.World.remove(engine.world, pair.bodyA);
                pair.bodyB.health -= bulletDamage;
                if (pair.bodyB.health <= 0) {
                    io.sockets.connected[pair.bodyB.socketID].disconnect(); //Disconnect on death
                }
            }
        }
    } catch (e) {
    }
});

//Make bombs explode when a bullets hits them
Matter.Events.on(engine, 'collisionStart', function (event) {
    //Try catch because sometimes the pairs are undefined for some reason
    try {
        var pairs = event.pairs;
        //Loop through all the pairs of collisions
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            //Check for both cases of bomb-bullet or bullet-bomb
            if (pair.bodyA.label === 'bomb' && pair.bodyB.label === 'bullet') {
                //Create the new bullets in circle
                for (var i = -Math.PI; i < Math.PI; i += Math.PI / (bulletsPerBomb / 2)) {
                    //Create the bullet starting at the bomb and at the specified angle
                    newBullet(i + pair.bodyA.angle, pair.bodyA.position)
                }
                //Delete the bomb
                Matter.World.remove(engine.world, pair.bodyA);
                //Delete the bullet
                Matter.World.remove(engine.world, pair.bodyB)
            }
            if (pair.bodyA.label === 'bullet' && pair.bodyB.label === 'bomb') {
                for (var i = -Math.PI; i < Math.PI; i += Math.PI / (bulletsPerBomb / 2)) {
                    newBullet(i + pair.bodyB.angle, pair.bodyB.position)
                }

                Matter.World.remove(engine.world, pair.bodyA);
                Matter.World.remove(engine.world, pair.bodyB)
            }
        }
    } catch (e) {
    }
});

//Damage players when they hit each other
Matter.Events.on(engine, 'collisionStart', function (event) {
    //Try catch because sometimes the pairs are undefined for some reason
    try {
        var pairs = event.pairs;
        //Loop through all the pairs of collisions
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            //Check player-player
            if (pair.bodyA.label === 'player' && pair.bodyB.label === 'player') {
                //Hurt both players
                pair.bodyA.health -= playerCollisionDamage;
                pair.bodyB.health -= playerCollisionDamage;
            }
        }
    } catch (e) {
    }
});

// Regenerate Life
setInterval(function () {
    //Loop through all the bodies in the world
    for (var i = 0; i < engine.world.bodies.length; i++) {
        //Check if they are a player
        if (engine.world.bodies[i].label === 'player') {
            var body = engine.world.bodies[i];
            //If they regeneration would give the player too much health then just max out their health
            if (body.health + regenerateAmount > body.maxHealth) {
                body.health = body.maxHealth
            }
            // otherwise increase it by the regenerate amount
            else {
                body.health += regenerateAmount
            }
        }
    }
}, timeBetweenRegenerations);

// Reset ground bullets and life boosts periodically
setInterval(function () {
    removeAllGroundBullets();
    removeAllLifeBoosts();
    createGroundBullets();
    createLifeBoosts()
}, 5000);

function removeAllGroundBullets() {
    //Loop through all the bodies in the world
    for (var i = 0; i < engine.world.bodies.length; i++) {
        var body = engine.world.bodies[i];
        //If the body is a ground bullet then remove it
        if (body.label === "groundBullet") {
            Matter.World.remove(engine.world, body)
        }
    }
}

function createGroundBullets() {
    //Create the specified number of ground bullets
    for (var i = 0; i < numOfGroundBullets; i++) {
        //Create the bullet at a random position with the specified ground bullet size
        var groundBullet = Matter.Bodies.rectangle(random(worldDimensions.x), random(worldDimensions.y), groundBulletSize, groundBulletSize);
        //Rotate it by a random amount
        Matter.Body.rotate(groundBullet, Math.random() * 2 * Math.PI);
        //Name it groundBullet
        groundBullet.label = "groundBullet";
        //Make it bouncy
        groundBullet.restitution = 0.8;
        //Add it to the world
        Matter.World.add(engine.world, groundBullet)
    }
}

function removeAllLifeBoosts() {
    for (var i = 0; i < engine.world.bodies.length; i++) {
        var body = engine.world.bodies[i];
        if (body.label === "lifeBoost") {
            Matter.World.remove(engine.world, body)
        }
    }
}

function createLifeBoosts() {
    for (var i = 0; i < numOfLifeBoosts; i++) {
        //Create the life boost based off of the vertices
        var lifeBoost = Matter.Bodies.fromVertices(random(worldDimensions.x), random(worldDimensions.y), Matter.Vertices.fromPath("0 -4 4 -8 8 -8 12 -4 12 0 0 16 -12 0 -12 -4 -8 -8 -4 -8 0 -4"));
        Matter.Body.rotate(lifeBoost, Math.random() * 2 * Math.PI);
        lifeBoost.label = "lifeBoost";
        lifeBoost.restitution = 0.8;
        Matter.World.add(engine.world, lifeBoost)
    }
}

function createBomb32Collide(position, socketID) {
    var bomb = Matter.Bodies.fromVertices(position.x, position.y, Matter.Vertices.fromPath("-20 30 0 30 10 20 10 0 0 -10 -20 -10 -30 0 -30 20 -20 30"));
    bomb.label = "bomb";
    bomb.restitution = 0.8;
    bomb.playerID = socketID;
    Matter.World.add(engine.world, bomb)
}

function newBullet(angle, position, playerID) {
    //Calculate a vector for the bullets direction
    var bulletHeading = {
        x: Math.cos(angle),
        y: Math.sin(angle)
    };
    //Make sure the vector is a unit vector
    bulletHeading = getUnitVector(bulletHeading);

    //Place the bullet a little bit away from the starting position with the specified default bullet size
    var bullet = Matter.Bodies.circle(position.x + bulletHeading.x * defaultPlayerSize, position.y + bulletHeading.y * defaultPlayerSize, defaultBulletSize, {
        frictionAir: 0.001
    });
    //Name it bullet
    bullet.label = 'bullet';
    //Start the clock of how long it has existed
    bullet.timeSinceBorn = 0;

    //Make the vector be the bullet's speed
    bulletHeading.x *= bulletSpeed;
    bulletHeading.y *= bulletSpeed;

    //Set the bullet's speed
    Matter.Body.setVelocity(bullet, bulletHeading);

    //Make the bullet bouncy
    bullet.restitution = 0.8;

    //Add the bullet to the world
    Matter.World.add(engine.world, bullet)
}

io.sockets.on('connection', newConnection);

//Detect new connections
function newConnection(socket) {
    //Create the player
    var player = Matter.Bodies.rectangle(random(worldDimensions.x - 4 * defaultPlayerSize) + 2 * defaultPlayerSize, random(worldDimensions.y - 4 * defaultPlayerSize) + 2 * defaultPlayerSize, defaultPlayerSize, defaultPlayerSize);
    player.label = 'player';
    player.socketID = socket.id;
    player.name = 'Unnamed';
    player.numOfBullets = 0;
    player.skinID = random(numOfColors) - 1;
    player.health = startingHealth;
    player.maxHealth = player.health;
    player.restitution = 0.8;

    //Add the player to the world
    Matter.World.add(engine.world, player);

    //The the world dimensions to the client
    socket.emit('worldDimensions', worldDimensions);

    socket.on('name', setName);

    //Assign the player's name
    function setName(newName) {
        player.name = newName
    }

    socket.on('heading', updateHeading);

    //Update the player's direction
    function updateHeading(heading) {
        //get a unit vector
        heading = getUnitVector(heading);
        //set the player's speed
        heading.x *= playerSpeed;
        heading.y *= playerSpeed;
        //Calculate the player's angle
        player.angle = Math.atan2(heading.y, heading.x);
        //Set the player's velocity in the right direction
        Matter.Body.setVelocity(player, heading)
    }

    //Create the bullet if the player has enough ground bullets
    socket.on('newBullet', function () {
        if (player.numOfBullets > 0) {
            //Create the bullets in the player's direction
            newBullet(player.angle, player.position);
            //Remove a bullet from the player
            player.numOfBullets--;
        }
    });

    socket.on('newBomb', function () {
        if (player.numOfBullets >= bulletsNeededForABomb) {
            createBomb32Collide(player.position, player.socketID);
            player.numOfBullets -= bulletsNeededForABomb;
        }
    });

    //Remove the player on disconnect
    socket.on('disconnect', function () {
        Matter.World.remove(engine.world, player)
    });
}

function random(max) {
    return Math.floor(Math.random() * max + 1);
}

function getUnitVector(v) {
    var scale = Math.sqrt(v.x * v.x + v.y * v.y);
    if (scale !== 0) {
        v.x = v.x / scale;
        v.y = v.y / scale
    }
    return v;
}

//Removes the self referring parts of the bodies array by only taking specific ones
function simplifyBodies(bodies) {
    var newBodies = [];
    for (var i = 0; i < bodies.length; i++) {
        var oldBody = bodies[i];
        var vertices = [];
        for (var j = 0; j < oldBody.vertices.length; j++) {
            vertices.push({
                x: oldBody.vertices[j].x,
                y: oldBody.vertices[j].y
            })
        }
        newBodies.push({
            'angle': oldBody.angle,
            'position': oldBody.position,
            'label': oldBody.label,
            'render': oldBody.render,
            'vertices': vertices,
            'numOfBullets': oldBody.numOfBullets,
            'health': oldBody.health,
            'maxHealth': oldBody.maxHealth,
            'skinID': oldBody.skinID,
            'name': oldBody.name,
            'socketID': oldBody.socketID,
            'playerID': oldBody.playerID
        })
    }
    return newBodies;
}
