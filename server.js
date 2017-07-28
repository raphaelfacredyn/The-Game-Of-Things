//World Setup
var Matter = require('matter-js')
var engine = Matter.Engine.create();

//Set Gravity
engine.world.gravity = {
  x: 0,
  y: 0
}

//Make Walls
var worldDimensions = {
  x: 1600,
  y: 1600
}
var wallWidth = 100;
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

//Name the walls wall
for (var i = 0; i < engine.world.bodies.length; i++) {
  engine.world.bodies[i].label = 'wall'
  engine.world.bodies[i].render.fillStyle = '#ffffff'
}


//Server Setup
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
var groundBulletDensity = 20000; // less is more bullets
var numOfGroundBullets = worldDimensions.x * worldDimensions.y / groundBulletDensity;
var lifeBoostDensity = 960000; // less is more bullets
var numOfLifeBoosts = worldDimensions.x * worldDimensions.y / lifeBoostDensity;
var groundBulletSize = 6;
var lifeBoostSize = 20;
var bulletLifeTime = 8;
var timeBetweenRegenerations = 100;
var regenerateAmount = 0.3;
var playerCollisionDamage = bulletDamage;
var numOfColors = 6;
var bulletsNeededForABomb = 10;

app.use(express.static('public'))

var socket = require('socket.io')

var io = socket(server)


//send the world to the players
setInterval(function() {
  //Update Bullet Life Time
  for (var i = 0; i < engine.world.bodies.length; i++) {
    if (engine.world.bodies[i].label == 'bullet') {
      engine.world.bodies[i].timeSinceBorn += 1 / fps
    }
    if (engine.world.bodies[i].timeSinceBorn >= bulletLifeTime) {
      Matter.World.remove(engine.world, engine.world.bodies[i])
    }
  }
  Matter.Engine.update(engine, 1000 / fps);
  var simplifyiedBodies = simplifyBodies(engine.world.bodies);
  io.sockets.emit('worldUpdate', simplifyiedBodies)
}, 1000 / fps);

//makes ground bullets dissapear on contact and add themselves to player
Matter.Events.on(engine, 'collisionStart', function(event) {
  try {
    var pairs = event.pairs;
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      if (pair.bodyA.label.split('_')[0] == 'player' && pair.bodyB.label == 'groundBullet') {
        pair.bodyA.numOfBullets++;
        Matter.World.remove(engine.world, pair.bodyB)
      }
      if (pair.bodyA.label == 'groundBullet' && pair.bodyB.label.split('_')[0] == 'player') {
        Matter.World.remove(engine.world, pair.bodyA)
        pair.bodyB.numOfBullets++;
      }
    }
  } catch (e) {}
});

//makes life boosts dissapear on contact and add themselves to player
Matter.Events.on(engine, 'collisionStart', function(event) {
  try {
    var pairs = event.pairs;
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      if (pair.bodyA.label.split('_')[0] == 'player' && pair.bodyB.label == 'lifeBoost') {
        pair.bodyA.maxHealth += lifeBoostGain;
        pair.bodyA.health += lifeBoostGain;
        Matter.World.remove(engine.world, pair.bodyB)
      }
      if (pair.bodyA.label == 'lifeBoost' && pair.bodyB.label.split('_')[0] == 'player') {
        Matter.World.remove(engine.world, pair.bodyA)
        pair.bodyB.maxHealth += lifeBoostGain;
        pair.bodyB.health += lifeBoostGain;
      }
    }
  } catch (e) {}
});

//Hurt people when they hit a bullet
Matter.Events.on(engine, 'collisionStart', function(event) {
  try {
    var pairs = event.pairs;
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      if (pair.bodyA.label.split('_')[0] == 'player' && pair.bodyB.label == 'bullet') {
        pair.bodyA.health -= bulletDamage
        Matter.World.remove(engine.world, pair.bodyB)
        if (pair.bodyA.health <= 0) {
          try {
            io.sockets.connected[pair.bodyA.label.split('_')[1]].disconnect(); //Disconnect on death
          } catch (e) {}
        }
      }
      if (pair.bodyA.label == 'bullet' && pair.bodyB.label.split('_')[0] == 'player') {
        Matter.World.remove(engine.world, pair.bodyA)
        pair.bodyB.health -= bulletDamage
        if (pair.bodyB.health <= 0) {
          io.sockets.connected[pair.bodyB.label.split('_')[1]].disconnect(); //Disconnect on death
        }
      }
    }
  } catch (e) {}
});

//Make bombs explode when a bullets hits them
Matter.Events.on(engine, 'collisionStart', function(event) {
  try {
    var pairs = event.pairs;
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      if (pair.bodyA.label == 'bomb' && pair.bodyB.label == 'bullet') {
        for (var i = -Math.PI; i < Math.PI; i += Math.PI / 4) {
          newBullet(i + pair.bodyA.angle, pair.bodyA.position)
        }

        Matter.World.remove(engine.world, pair.bodyA)
        Matter.World.remove(engine.world, pair.bodyB)
      }
      if (pair.bodyA.label == 'bullet' && pair.bodyB.label == 'bomb') {
        for (var i = -Math.PI; i < Math.PI; i += Math.PI / 4) {
          newBullet(i + pair.bodyB.angle, pair.bodyB.position)
        }

        Matter.World.remove(engine.world, pair.bodyA)
        Matter.World.remove(engine.world, pair.bodyB)
      }
    }
  } catch (e) {}
});

//Damage players when they hit each other
Matter.Events.on(engine, 'collisionStart', function(event) {
  try {
    var pairs = event.pairs;
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      if (pair.bodyA.label.split('_')[0] == 'player' && pair.bodyB.label.split('_')[0] == 'player') {
        pair.bodyA.health -= playerCollisionDamage;
        pair.bodyB.health -= playerCollisionDamage;
      }
    }
  } catch (e) {}
});

// Regenerate Life
setInterval(function() {
  for (var i = 0; i < engine.world.bodies.length; i++) {
    if (engine.world.bodies[i].label.split('_')[0] == 'player') {
      var body = engine.world.bodies[i]
      if (body.health + regenerateAmount > body.maxHealth) {
        body.health = body.maxHealth
      } else {
        body.health += regenerateAmount
      }
    }
  }
}, timeBetweenRegenerations);

// Reset ground bullets and life boosts periodically
setInterval(function() {
  removeAllGroundBullets()
  removeAllLifeBoosts()
  createGroundBullets()
  createLifeBoosts()
}, 5000);

function removeAllGroundBullets() {
  for (var i = 0; i < engine.world.bodies.length; i++) {
    var body = engine.world.bodies[i];
    if (body.label == "groundBullet") {
      Matter.World.remove(engine.world, body)
    }
  }
}

function createGroundBullets() {
  for (var i = 0; i < numOfGroundBullets; i++) {
    var groundBullet = Matter.Bodies.rectangle(random(worldDimensions.x), random(worldDimensions.y), groundBulletSize, groundBulletSize);
    groundBullet.label = "groundBullet"
    groundBullet.restitution = 0.8
    Matter.World.add(engine.world, groundBullet)
  }
}

function removeAllLifeBoosts() {
  for (var i = 0; i < engine.world.bodies.length; i++) {
    var body = engine.world.bodies[i];
    if (body.label == "lifeBoost") {
      Matter.World.remove(engine.world, body)
    }
  }
}

function createLifeBoosts() {
  for (var i = 0; i < numOfLifeBoosts; i++) {
    var lifeBoost = Matter.Bodies.fromVertices(random(worldDimensions.x), random(worldDimensions.y), Matter.Vertices.fromPath("0 -4 4 -8 8 -8 12 -4 12 0 0 16 -12 0 -12 -4 -8 -8 -4 -8 0 -4"));
    Matter.Body.rotate(lifeBoost, Math.random() * 2 * Math.PI)
    lifeBoost.label = "lifeBoost"
    lifeBoost.restitution = 0.8
    Matter.World.add(engine.world, lifeBoost)
  }
}

function createBomb(position) {
  var bomb = Matter.Bodies.fromVertices(position.x, position.y, Matter.Vertices.fromPath("-20 30 0 30 10 20 10 0 0 -10 -20 -10 -30 0 -30 20 -20 30"));
  bomb.label = "bomb"
  bomb.restitution = 0.8
  Matter.World.add(engine.world, bomb)
}

function newBullet(angle, position) {
  var bulletHeading = {
    x: Math.cos(angle),
    y: Math.sin(angle)
  }
  bulletHeading = getUnitVector(bulletHeading)

  var bullet = Matter.Bodies.circle(position.x + bulletHeading.x * defaultPlayerSize, position.y + bulletHeading.y * defaultPlayerSize, defaultBulletSize, { frictionAir: 0.001 });
  bullet.label = 'bullet'
  bullet.timeSinceBorn = 0

  bulletHeading.x *= bulletSpeed
  bulletHeading.y *= bulletSpeed

  bullet.restitution = 0.8

  Matter.Body.setVelocity(bullet, bulletHeading)
  Matter.World.add(engine.world, bullet)
}

io.sockets.on('connection', newConnection)

function newConnection(socket) {
  var player = Matter.Bodies.rectangle(random(worldDimensions.x - 4 * defaultPlayerSize) + 2 * defaultPlayerSize, random(worldDimensions.y - 4 * defaultPlayerSize) + 2 * defaultPlayerSize, defaultPlayerSize, defaultPlayerSize);
  player.label = 'player_' + socket.id + '_Unnamed'
  player.numOfBullets = 0;
  player.skinID = random(numOfColors) - 1;
  player.health = startingHealth;
  player.maxHealth = player.health;
  player.restitution = 0.8
  Matter.World.add(engine.world, player)

  socket.emit('worldDimensions', worldDimensions)

  socket.on('name', setName)

  function setName(newName) {
    player.label = 'player_' + socket.id + '_' + newName
  }

  socket.on('heading', updateHeading)

  function updateHeading(heading) {
    heading = getUnitVector(heading)
    heading.x *= playerSpeed
    heading.y *= playerSpeed
    player.angle = Math.atan2(heading.y, heading.x)
    Matter.Body.setVelocity(player, heading)
  }

  socket.on('newBullet', function() {
    if (player.numOfBullets > 0) {
      newBullet(player.angle, player.position)
      player.numOfBullets--;
    }
  })

  socket.on('newBomb', function() {
    if (player.numOfBullets >= bulletsNeededForABomb) {
      createBomb(player.position)
      player.numOfBullets -= bulletsNeededForABomb;
    }
  })

  socket.on('disconnect', function() {
    Matter.World.remove(engine.world, player)
  });
}

function random(max) {
  return Math.floor(Math.random() * max + 1);
}

function getUnitVector(v) {
  var scale = Math.sqrt(v.x * v.x + v.y * v.y)
  if (scale != 0) {
    v.x = v.x / scale
    v.y = v.y / scale
  }
  return v;
}

function simplifyBodies(bodies) {
  var newBodies = [];
  for (var i = 0; i < bodies.length; i++) {
    var oldBody = bodies[i]
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
      'skinID': oldBody.skinID
    })
  }
  return newBodies;
}
