var socket

var position = {
  x: 1,
  y: 1
};

var heading;

var nameSize = 18;

var playerImages = [];

var b;
//Variable is set by server later on
var worldDimensions = {
  x: 1,
  y: 1
};

var inPlay = false;

function setup() {
  createCanvas(windowWidth, windowHeight)

  var playerImageOptions = ['Blue.png', 'Green.png', 'Orange.png', 'Purple.png', 'Red.png', 'Turq.png']

  for (path in playerImageOptions) {
    playerImages.push(loadImage("sprites/players/" + playerImageOptions[path]))
  }

  var name = prompt("What is your name?", "Unnamed");;

  socket = io.connect('raphael-macbook.local:8080')

  socket.emit('name', name)

  socket.on('worldDimensions', setWorldDimensions)

  socket.on('disconnect', iDied);

  socket.on('worldUpdate', worldUpdate)

  inPlay = true;

  imageMode(CENTER)
}


function setWorldDimensions(wd) {
  worldDimensions = wd;
}


function iDied() {
  location.reload();
}

function drawGrid(sqrWidth, border) {
  fill(30)
  for (x = 0; x < worldDimensions.x - 1; x += (sqrWidth + border)) {
    for (y = 0; y < worldDimensions.y - 1; y += (sqrWidth + border)) {
      rect(x, y, sqrWidth, sqrWidth)
    }
  }
}


function worldUpdate(bodies) {
  background(25)
  translate(-position.x + width / 2, -position.y + height / 2)
  drawGrid(60, 20);
  displayBodies(bodies)
}

function displayBodies(bodies) {
  b=bodies
  for (var i = 0; i < bodies.length; i++) {
    var body = bodies[i]
    if (body.label.split('_')[0] == 'player') {
      push()
      translate(body.position.x, body.position.y)
      rotate(body.angle)
      image(playerImages[body.skinID], 0, 0);

      pop()
      var bodyColor = color(body.render.fillStyle);
      fill(color(255 - red(bodyColor), 255 - green(bodyColor), 255 - blue(bodyColor)))
      var name = body.label.split('_')[2];
      textSize(nameSize);
      if (body.label.split('_')[1] == socket.id) {
        position = body.position
        text(body.numOfBullets, body.position.x - textWidth(body.numOfBullets) / 2, body.position.y - 60)
      } else {
        text(name, body.position.x - textWidth(name) / 2, body.position.y)
      }
      var barSize = body.maxHealth / 2
      fill(255, 0, 0)
      rect(body.position.x - barSize / 2, body.position.y - 45, barSize, 10)
      fill(0, 255, 0)
      rect(body.position.x - barSize / 2, body.position.y - 45, barSize * body.health / body.maxHealth, 10)
      console.log(body.angle)
    } else {
      strokeWeight(body.render.lineWidth)
      fill(body.render.fillStyle)
      stroke(body.render.strokeStyle)
      beginShape();
      for (var j = 0; j < body.vertices.length; j++) {
        var v = body.vertices[j]
        vertex(v.x, v.y)
      }
      endShape(CLOSE);
    }
  }
}

function draw() {
  if (inPlay) {
    heading = {
      x: (mouseX - width / 2),
      y: (mouseY - height / 2)
    }
    heading = getUnitVector(heading)
    socket.emit('heading', heading)
  }
}

function getUnitVector(v) {
  var scale = Math.sqrt(v.x * v.x + v.y * v.y)
  if (scale != 0) {
    v.x = v.x / scale
    v.y = v.y / scale
  }
  return v;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}

function keyReleased() {
  if (key == ' ') {
    socket.emit('newBullet')
  }
  if (key == 'B') {
    socket.emit('newBomb')
  }
}
