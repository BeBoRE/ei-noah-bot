import Router from '../Router';

const router = new Router();

router.use('create', (info) => {
  info.msg.channel.send('Creating channel');
});

router.use('remove', (info) => {
  info.msg.channel.send('Removing channel');
});

export default router;
