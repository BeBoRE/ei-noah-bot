import Router from '../Router';
const Discord = require('discord.js');

const router = new Router();

router.use('set', async ({ msg, guildUser}) => 
{
    msg.channel.send('Je verjaardag kan ook later toegevoegd worden.');
});

router.use('give', async ({ msg, guildUser}) =>
{
    //Toevoeging van een role op basis van ID
    msg.member.roles.add('744926444756533358');
    msg.channel.send('You have gained a birthday.');
});

export default router;