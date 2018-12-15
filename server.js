var fs = require('fs');

//Import server-client-commons
eval(fs.readFileSync('public/server-client-commons.js') + '');


//Server Setup
var express = require('express');
var app = express();
var server = app.listen(8888);

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

var password = "Basic dXNlcjpwYXNz";

//Parameters
var worldDimensions = {
    x: 1600,
    y: 1600
};

var playerSpeed = 10;
var bulletSpeed = 2.5 * playerSpeed;
var defaultPlayerSize = 80;
var fps = 20;
var bulletDamage = 7;
var lifeBoostGain = 5;
var startingHealth = 100;
var groundBulletDensity = 20000; // less is more
var numOfGroundBullets = worldDimensions.x * worldDimensions.y / groundBulletDensity;
var lifeBoostDensity = 960000; // less is more
var numOfLifeBoosts = worldDimensions.x * worldDimensions.y / lifeBoostDensity;
var bulletLifeTime = 8;
var timeBetweenRegenerations = 100;
var regenerateAmount = 0.3;
var playerCollisionDamage = bulletDamage;
var maxCollisionGroup = -1000000;
var currPlayerCollisionGroup = -1;

//Import matter-js (physics engine)
var Matter = require('matter-js');
var engine = Matter.Engine.create();

//Set gravity
engine.world.gravity = {
    x: 0,
    y: 0
};

var wallWidth = 50;

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

//Add Ground Bullets and Life Boosts
createGroundBullets();
createLifeBoosts();

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
    io.sockets.volatile.emit('worldUpdate', simplifiedBodies);
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
                respawn(pair.bodyB);
            }
            if (pair.bodyA.label === 'groundBullet' && pair.bodyB.label === 'player') {
                respawn(pair.bodyA);
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
                respawn(pair.bodyB);
            }
            if (pair.bodyA.label === 'lifeBoost' && pair.bodyB.label === 'player') {
                respawn(pair.bodyA);
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
            if (pair.bodyA.label === 'player' && pair.bodyB.label === 'bullet' && pair.bodyA.socketID !== pair.bodyB.socketID) {
                //Deal the damage to the player
                pair.bodyA.health -= bulletDamage;
                //Remove the bullet
                Matter.World.remove(engine.world, pair.bodyB);
                //If the player has no more health, disconnect them
                if (pair.bodyA.health <= 0) {
                    io.sockets.connected[pair.bodyA.socketID].disconnect(); //Disconnect on death
                }
            }
            if (pair.bodyA.label === 'bullet' && pair.bodyB.label === 'player' && pair.bodyA.socketID !== pair.bodyB.socketID) {
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
    var bomb;
    var other;
    try {
        var pairs = event.pairs;
        //Loop through all the pairs of collisions
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            //Check for both cases of bomb-bullet or bullet-bomb
            if (pair.bodyA.label === 'bomb') {
                bomb = pair.bodyA;
                other = pair.bodyB;
                switch (bomb.trigger) {
                    case 0: //Any bullet hits
                        if (other.label === 'bullet') {
                            bulletCircle(bomb.position, bomb.angle, bomb.numOfBullets, bomb.socketID, bomb.collisionGroup);
                            Matter.World.remove(engine.world, bomb);
                            Matter.World.remove(engine.world, other)
                        }
                        break;
                    case 1: //Bullet from player
                        if (other.label === 'bullet' && bomb.socketID === other.socketID) {
                            bulletCircle(bomb.position, bomb.angle, bomb.numOfBullets, bomb.socketID, bomb.collisionGroup);
                            Matter.World.remove(engine.world, bomb);
                            Matter.World.remove(engine.world, other);
                        }
                        break;
                    case 2: //A player hits that is not the bomb's placer
                        if (other.label === 'player' && other.socketID !== bomb.socketID) {
                            bulletCircle(bomb.position, bomb.angle, bomb.numOfBullets, bomb.socketID, bomb.collisionGroup);
                            Matter.World.remove(engine.world, bomb);
                            Matter.World.remove(engine.world, other);
                        }
                        break;
                }
            }
            if (pair.bodyB.label === 'bomb') {
                bomb = pair.bodyB;
                other = pair.bodyA;
                switch (bomb.trigger) {
                    case 0: //Any bullet hits
                        if (other.label === 'bullet') {
                            bulletCircle(bomb.position, bomb.angle, bomb.numOfBullets, bomb.socketID, bomb.collisionGroup);
                            Matter.World.remove(engine.world, bomb);
                            Matter.World.remove(engine.world, other)
                        }
                        break;
                    case 1: //Bullet from player
                        if (other.label === 'bullet' && bomb.socketID === other.socketID) {
                            bulletCircle(bomb.position, bomb.angle, bomb.numOfBullets, bomb.socketID, bomb.collisionGroup);
                            Matter.World.remove(engine.world, bomb);
                            Matter.World.remove(engine.world, other)
                        }
                        break;
                    case 2: //A player hits that is not the bomb's placer
                        if (other.label === 'player' && other.socketID !== bomb.socketID) {
                            bulletCircle(bomb.position, bomb.angle, bomb.numOfBullets, bomb.socketID, bomb.collisionGroup);
                            Matter.World.remove(engine.world, bomb);
                        }
                        break;
                }
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
    checkForEscapedObjects();
}, 500);

function checkForEscapedObjects() {
    try {
        for (var i = 0; i < engine.world.bodies.length; i++) {
            if ((engine.world.bodies[i].position.x < 0 || engine.world.bodies[i].position.x > worldDimensions.x || engine.world.bodies[i].position.y < 0 || engine.world.bodies[i].position.y > worldDimensions.y) && engine.world.bodies[i].label !== "wall") {
                if (engine.world.bodies[i].label !== "bullet" && engine.world.bodies[i].label !== "bomb") {
                    Matter.Body.setPosition(engine.world.bodies[i], randomPosition(100));
                    setTimeout(function () {
                        Matter.Body.setVelocity(engine.world.bodies[i], {'x': 0, 'y': 0});
                    }, 1000 / fps)
                } else {
                    Matter.World.remove(engine.world, engine.world.bodies[i]);
                }
            }
        }
    } catch (e) {
    }
}

function createBomb(position, socketID, bullets, trigger, visible, angle, collisionGroup) {
    var bombHeading = {
        x: Math.cos(angle),
        y: Math.sin(angle)
    };
    //Make sure the vector is a unit vector
    bombHeading = getUnitVector(bombHeading);

    var bomb = Matter.Bodies.polygon(position.x - bombHeading.x * defaultPlayerSize, position.y - bombHeading.y * defaultPlayerSize, 8, 25, {
        chamfer: {
            radius: 10
        }
    });
    bomb.label = "bomb";
    bomb.visible = visible;
    bomb.numOfBullets = bullets;
    bomb.trigger = trigger;
    bomb.restitution = 0.8;
    bomb.socketID = socketID;
    bomb.collisionGroup = collisionGroup;
    Matter.Body.setAngle(bomb, angle);
    Matter.World.add(engine.world, bomb);
}

function bulletCircle(position, angle, numOfBullets, socketID, collisionGroup) {
    for (var i = -Math.PI; i < Math.PI; i += Math.PI / (numOfBullets / 2)) {
        newBullet(i + angle, position, socketID, collisionGroup)
    }
}

function newBullet(angle, position, socketID, collisionGroup) {
    //Calculate a vector for the bullets direction
    var bulletHeading = {
        x: Math.cos(angle),
        y: Math.sin(angle)
    };

    //Make sure the vector is a unit vector
    bulletHeading = getUnitVector(bulletHeading);

    //Place the bullet a little bit away from the starting position with the specified default bullet size
    var bullet = Matter.Bodies.polygon(position.x + bulletHeading.x * defaultPlayerSize, position.y + bulletHeading.y * defaultPlayerSize, 3, 10);

    //Make it have very little friction
    bullet.frictionAir = 0.001;

    //Name it bullet
    bullet.label = 'bullet';

    //Start the clock of how long it has existed
    bullet.timeSinceBorn = 0;

    //Set the bullets origin
    bullet.socketID = socketID;

    bullet.collisionFilter.group = collisionGroup;

    Matter.Body.setAngle(bullet, angle + Math.PI / 3);

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
    var player = Matter.Bodies.rectangle(randomPosition(defaultPlayerSize * 2).x, randomPosition(defaultPlayerSize * 2).y, defaultPlayerSize, defaultPlayerSize);
    player.label = 'player';
    player.socketID = socket.id;
    player.name = 'Unnamed';
    player.numOfBullets = 0;
    player.skinID = random(numOfSkins) - 1;
    player.health = startingHealth;
    player.maxHealth = player.health;
    player.restitution = 0.8;

    if (currPlayerCollisionGroup < maxCollisionGroup) {
        currPlayerCollisionGroup = -1;
    }
    player.collisionFilter.group = currPlayerCollisionGroup;
    currPlayerCollisionGroup--;

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
            newBullet(player.angle, player.position, player.socketID, player.collisionFilter.group);
            //Remove a bullet from the player
            player.numOfBullets--;
        }
    });

    socket.on('newBomb', function (bullets, trigger, visible) {
        var cost = bombCostCalc(bullets, trigger, visible);
        if (player.numOfBullets >= cost) {
            createBomb(player.position, player.socketID, bullets, trigger, visible, player.angle, player.collisionFilter.group);
            player.numOfBullets -= cost;
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
        if (oldBody.visible !== false) {
            var vertices;
            if (oldBody.label in objectVertices) {
                vertices = oldBody.label;
            } else {
                vertices = [];
                for (var j = 0; j < oldBody.vertices.length; j++) {
                    vertices.push({
                        x: oldBody.vertices[j].x,
                        y: oldBody.vertices[j].y
                    })
                }
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
                'socketID': oldBody.socketID
            })
        }
    }
    return newBodies;
}

function randomPosition(padding) {
    var position = {'x': 0, 'y': 0};
    position.x = random(worldDimensions.x - padding * 2) + padding;
    position.y = random(worldDimensions.y - padding * 2) + padding;
    return position;
}

function createGroundBullets() {
    //Create the specified number of ground bullets
    for (var i = 0; i < numOfGroundBullets; i++) {
        //Create the bullet at a random position with the specified ground bullet size
        var groundBullet = Matter.Bodies.fromVertices(randomPosition(100).x, randomPosition(100).y, Matter.Vertices.create(objectVertices['groundBullet']));
        //Rotate it by a random amount
        Matter.Body.rotate(groundBullet, Math.random() * 2 * Math.PI);
        //Name it groundBullet
        groundBullet.label = "groundBullet";
        //Make it bouncy
        groundBullet.restitution = 0.8;

        //Add it to the world
        Matter.World.add(engine.world, groundBullet);
    }
}

function createLifeBoosts() {
    for (var i = 0; i < numOfLifeBoosts; i++) {
        //Create the life boost based off of the vertices
        var lifeBoost = Matter.Bodies.polygon(randomPosition(100).x, randomPosition(100).y, 5, 10);
        Matter.Body.rotate(lifeBoost, Math.random() * 2 * Math.PI);
        lifeBoost.label = "lifeBoost";
        lifeBoost.restitution = 0.8;
        Matter.World.add(engine.world, lifeBoost);
    }
}

function respawn(body) {
    Matter.Body.setPosition(body, randomPosition(100));
    setTimeout(function () {
        Matter.Body.setVelocity(body, {'x': 0, 'y': 0});
    }, 1000 / fps)
}

//API
eval(fs.readFileSync('api.js') + '');
