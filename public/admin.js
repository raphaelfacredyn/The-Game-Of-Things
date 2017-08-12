function sendRequest(location, data, type) {
    var settings = {
        "async": true,
        "crossDomain": true,
        "url": "http://raphael-macbook.local:8080/" + location,
        "method": type,
        "headers": {
            "content-type": "application/json",
            "ocp-apim-subscription-key": "123456789ABCDE",
            "authorization": getAuth(),
            "cache-control": "no-cache"
        },
        "processData": false,
        "data": data
    };

    $.ajax(settings).done(function (response) {
        $("#" + location + "OutputDiv").html(response);
    });
}

function getAuth() {
    var username = $('#inputUsername').val();
    var password = $('#inputPassword').val();
    return 'Basic ' + b64EncodeUnicode(username + ':' + password);
}

function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
}

function getStats() {
    sendRequest("getStats", "", "GET");
}

function getUsers() {
    sendRequest("getUsers", "", "GET");
}

function setBullets(name, amount) {
    sendRequest("setBullets", JSON.stringify(
        {
            "name": name,
            "amount": parseInt(amount)
        }
    ), "POST");
}

function setHealth(name, amount) {
    sendRequest("setHealth", JSON.stringify(
        {
            "name": name,
            "amount": parseInt(amount)
        }
    ), "POST");
}

function setMaxHealth(name, amount) {
    sendRequest("setMaxHealth", JSON.stringify(
        {
            "name": name,
            "amount": parseInt(amount)
        }
    ), "POST");
}

function setName(name, newName) {
    sendRequest("setName", JSON.stringify(
        {
            "name": name,
            "newName": newName
        }
    ), "POST");
}

function setStatic(name, amount) {
    sendRequest("setStatic", JSON.stringify(
        {
            "name": name,
            "amount": parseInt(amount)
        }
    ), "POST");
}

function kick(name) {
    sendRequest("kick", JSON.stringify(
        {
            "name": name
        }
    ), "POST");
}

setInterval(function () {
    getStats();
    getUsers();
}, 500);