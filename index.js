const getLunch = require('./lunch');
const getLatte = require('./latte');
const req = require('request');
const discordURL = 'your_discord_url';

var food = {};

Promise.all( [ getLunch(), getLatte() ])
.then( ([ lunch, sandwiches ]) => {
    food.lunch = lunch;
    food.sandwiches = sandwiches;
    var jsoncontent = {username : 'Lunchbot', embeds: [{fields : []}]}
    var fields = [];
    fields.push({name :':stew: Soep', value : food.lunch.dishes[0].rawText, inline: true});
    fields.push({name :':poultry_leg: Dagschotel', value: food.lunch.dishes[1].rawText, inline: true});
    fields.push({name :':salad: Vegetarisch', value: food.lunch.dishes[2].rawText});
    fields.push({name :':spaghetti: Pasta', value : food.lunch.dishes[3].rawText, inline: true});
    fields.push({name: ':ramen: Around the world', value: food.lunch.world[0]});
    fields.push({name: ':taco: Around the world', value: food.lunch.world[1]});
    fields.push({name :':french_bread: Broodje latte', value : food.sandwiches.latte});
    fields.push({name :':hamburger: Broodje corda', value : food.sandwiches.corda});

    jsoncontent.embeds[0].fields = fields;

    //Concatenate string of dishes for discord message and post to discord
    var discordString = '';
    food.lunch.dishes.forEach(dish => { discordString = discordString.concat(dish.rawText + '\n') });
    discordString = discordString.concat(food.sandwiches.latte + '\n' + food.sandwiches.corda);

    console.log(JSON.stringify(jsoncontent));
    req.post(discordURL, { json: jsoncontent }, function (err, res, body) {
        if (!err) {
            //console.log(JSON.stringify(jsoncontent));
            console.log(body);
            console.log(res.statusCode);
            //console.log(res);
        }
    })
})