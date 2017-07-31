function recalculateBombCost() {
    var bombParams = getBombParams();

    var bullets = bombParams.bullets;
    var trigger = bombParams.trigger;
    var visible = bombParams.visible;

    var cost = bombCostCalc(bullets, trigger, visible);
    $("#bombCost").text("Bomb Cost: " + cost);
}

function getBombParams() {
    var bullets = parseInt($("#bombBullets").val());
    var trigger = parseInt($("#bombTrigger").val());
    var visible = !$("#bombInvisible").is(':checked');
    return {'bullets': bullets, 'trigger': trigger, 'visible': visible}
}

setInterval(function () {
    recalculateBombCost();
}, 100);

$(document).ready(function () {
    recalculateBombCost();

    //Unfocus inputs when mouse leaves bomb selector
    $("#bombSelectorOuter").mouseleave(function() {
        $("*").blur();
    });
});

//Show hide bomb selector and remove its focus
function toggleBombSelector(){
    $("*").blur();
    $("#bombSelectorOuter").slideToggle("fast");
}