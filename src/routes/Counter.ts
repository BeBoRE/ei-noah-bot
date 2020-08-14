import { getRepository } from 'typeorm';
import Router from '../Router';
import { User } from '../entity/User';

const router = new Router();

router.use('add', async ({ msg }) => {
  const userRep = getRepository(User);
  let user = await userRep.findOne({ where: { id: msg.author.id, guildId: msg.guild.id } });

  if (!user) {
    user = userRep.create();
    user.id = msg.author.id;
    user.guildId = msg.guild.id;
    user.count = 1;
  } else {
    user.count += 1;
  }

  userRep.save(user);

  msg.channel.send(`${msg.author} has counted to ${user.count}`);
});

router.use('remove', async ({ msg }) => {
  const userRep = getRepository(User);
  let user = await userRep.findOne({ where: { id: msg.author.id, guildId: msg.guild.id } });

  if (!user) {
    user = userRep.create();
    user.id = msg.author.id;
    user.count = -1;
  } else {
    user.count += -1;
  }

  userRep.save(user);

  msg.channel.send(`${msg.author} has counted down to ${user.count}`);
});

export default router;
