//Save Username
window.onbeforeunload = function() {
    localStorage.setItem("name", $('#nameInput').val());
};

$(document).ready(function() {
    //Restore Username
    var name = localStorage.getItem("name");
    if (name !== null) {
        $('#nameInput').val(name);
    }

    //Select the textbox on page load
    $("#nameInput").focus();

    //login when enter is pressed
    $("#nameInput").on('keyup', function(e) {
        if (e.keyCode === 13) {
            login()
        }
    });
});

function login() {

    //get the username
    name=$('#nameInput').val();

    //connect to the server
    socket = io();

    //send the username
    socket.emit('name', name);

    //prepare to receive world dimensions
    socket.on('worldDimensions', setWorldDimensions);

    //prepare to be disconnected on death
    socket.on('disconnect', iDied);

    //prepare to receive the map
    socket.on('worldUpdate', worldUpdate);

    //start the game
    inPlay = true;

    //hide the login
    $("#loginPanel").hide();

    //show the bomb selector
    $("#bombSelectorOuter").show();
}
