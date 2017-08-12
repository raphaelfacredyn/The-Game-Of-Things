app.post('/setBullets', function (req, res) {
    try {
        if (req.headers.authorization === password) {
            var name = req.body.name;
            var num = req.body.amount;

            var foundUser = false;
            for (var i = 0; i < engine.world.bodies.length; i++) {
                if (engine.world.bodies[i].label === 'player' && engine.world.bodies[i].name === name) {
                    engine.world.bodies[i].numOfBullets = num;
                    foundUser = true;
                }
            }

            if (foundUser) {
                res.end("Success<br>Yipeee");
            } else {
                res.end("The command didn't fail but...<br>The user " + name + " was not found");
            }
        } else {
            res.end("<h3>Wrong Or No Password</h3>");
        }
    } catch (e) {
        res.end("Failed:<br>" + e);
    }
});

app.post('/setHealth', function (req, res) {
    try {
        if (req.headers.authorization === password) {
            var name = req.body.name;
            var num = req.body.amount;

            var foundUser = false;
            for (var i = 0; i < engine.world.bodies.length; i++) {
                if (engine.world.bodies[i].label === 'player' && engine.world.bodies[i].name === name) {
                    engine.world.bodies[i].health = num;
                    foundUser = true;
                }
            }

            if (foundUser) {
                res.end("Success<br>Yipeee");
            } else {
                res.end("The command didn't fail but...<br>The user " + name + " was not found");
            }
        } else {
            res.end("<h3>Wrong Or No Password</h3>");
        }
    } catch (e) {
        res.end("Failed:<br>" + e);
    }
});

app.post('/setMaxHealth', function (req, res) {
    try {
        if (req.headers.authorization === password) {
            var name = req.body.name;
            var num = req.body.amount;

            var foundUser = false;
            for (var i = 0; i < engine.world.bodies.length; i++) {
                if (engine.world.bodies[i].label === 'player' && engine.world.bodies[i].name === name) {
                    engine.world.bodies[i].maxHealth = num;
                    foundUser = true;
                }
            }

            if (foundUser) {
                res.end("Success<br>Yipeee");
            } else {
                res.end("The command didn't fail but...<br>The user " + name + " was not found");
            }
        } else {
            res.end("<h3>Wrong Or No Password</h3>");
        }
    } catch (e) {
        res.end("Failed:<br>" + e);
    }
});

app.post('/setName', function (req, res) {
    try {
        if (req.headers.authorization === password) {
            var name = req.body.name;
            var newName = req.body.newName;

            var foundUser = false;
            for (var i = 0; i < engine.world.bodies.length; i++) {
                if (engine.world.bodies[i].label === 'player' && engine.world.bodies[i].name === name) {
                    engine.world.bodies[i].name = newName;
                    foundUser = true;
                }
            }

            if (foundUser) {
                res.end("Success<br>Yipeee");
            } else {
                res.end("The command didn't fail but...<br>The user " + name + " was not found");
            }
        } else {
            res.end("<h3>Wrong Or No Password</h3>");
        }
    } catch (e) {
        res.end("Failed:<br>" + e);
    }
});

app.post('/setStatic', function (req, res) {
    try {
        if (req.headers.authorization === password) {
            var name = req.body.name;
            var num = req.body.amount;

            var foundUser = false;
            for (var i = 0; i < engine.world.bodies.length; i++) {
                if (engine.world.bodies[i].label === 'player' && engine.world.bodies[i].name === name) {
                    engine.world.bodies[i].isStatic = num !== 0;
                    foundUser = true;
                }
            }

            if (foundUser) {
                res.end("Success<br>Yipeee");
            } else {
                res.end("The command didn't fail but...<br>The user " + name + " was not found");
            }
        } else {
            res.end("<h3>Wrong Or No Password</h3>");
        }
    } catch (e) {
        res.end("Failed:<br>" + e);
    }
});

app.post('/kick', function (req, res) {
    try {
        if (req.headers.authorization === password) {
            var name = req.body.name;

            var foundUser = false;
            for (var i = 0; i < engine.world.bodies.length; i++) {
                if (engine.world.bodies[i].label === 'player' && engine.world.bodies[i].name === name) {
                    io.sockets.connected[engine.world.bodies[i].socketID].disconnect();
                    Matter.World.remove(engine.world, engine.world.bodies[i]);
                    foundUser = true;
                }
            }

            if (foundUser) {
                res.end("Success<br>Yipeee");
            } else {
                res.end("The command didn't fail but...<br>The user " + name + " was not found");
            }
        } else {
            res.end("<h3>Wrong Or No Password</h3>");
        }
    } catch (e) {
        res.end("Failed:<br>" + e);
    }
});

app.get('/getUsers', function (req, res) {
    try {
        if (req.headers.authorization === password) {

            res.end(getUsersTable());
        } else {
            res.end("<h3>Wrong Or No Password</h3>");
        }
    } catch (e) {
        res.end("Failed:<br>" + e);
    }
});

app.get('/getStats', function (req, res) {
    try {
        if (req.headers.authorization === password) {
            res.end(getStatsTable());
        } else {
            res.end("<h3>Wrong Or No Password</h3>");
        }
    } catch (e) {
        res.end("Failed:<br>" + e);
    }
});

function getStatsTable() {
    var numUsers = 0;
    var numGroundBullets = 0;
    var numBullets = 0;
    var numBombs = 0;
    var numLifeBoosts = 0;
    for (var i = 0; i < engine.world.bodies.length; i++) {
        if (engine.world.bodies[i].label === 'player') {
            numUsers++;
        }
        if (engine.world.bodies[i].label === 'groundBullet') {
            numGroundBullets++;
        }
        if (engine.world.bodies[i].label === 'bullet') {
            numBullets++;
        }
        if (engine.world.bodies[i].label === 'bomb') {
            numBombs++;
        }
        if (engine.world.bodies[i].label === 'lifeBoost') {
            numLifeBoosts++;
        }
    }

    var table = '<table class="table table-striped">\n' +
        '    <thead>\n' +
        '      <tr>\n' +
        '        <th>Num of Users</th>\n' +
        '        <th>Num of Ground Bullets</th>\n' +
        '        <th>Num of Bullets</th>\n' +
        '        <th>Num of Bombs</th>\n' +
        '        <th>Num of Life Boosts</th>\n' +
        '      </tr>\n' +
        '    </thead>\n' +
        '    <tbody>\n' +
        '      <tr>\n' +
        '        <td>' + numUsers + '</td>\n' +
        '        <td>' + numGroundBullets + '</td>\n' +
        '        <td>' + numBullets + '</td>\n' +
        '        <td>' + numBombs + '</td>\n' +
        '        <td>' + numLifeBoosts + '</td>\n' +
        '      </tr>\n' +
        '    </tbody>\n' +
        '  </table>';
    return table
}

function getUsersTable() {
    var table = '<table class="table table-striped">\n' +
        '    <thead>\n' +
        '      <tr>\n' +
        '        <th>Name</th>\n' +
        '        <th>Bullets</th>\n' +
        '        <th>Health</th>\n' +
        '        <th>Max Health</th>\n' +
        '      </tr>\n' +
        '    </thead>\n' +
        '    <tbody>\n';
    for (var i = 0; i < engine.world.bodies.length; i++) {
        if (engine.world.bodies[i].label === 'player') {
            var row = '<tr>\n' +
                '<td>' + engine.world.bodies[i].name + '</td>\n' +
                '<td>' + engine.world.bodies[i].numOfBullets + '</td>\n' +
                '<td>' + engine.world.bodies[i].health + '</td>\n' +
                '<td>' + engine.world.bodies[i].maxHealth + '</td>\n' +
                '</tr>\n';
            table += row;
        }
    }
    table+='</tbody>\n' +
        '</table>';
    return table;
}