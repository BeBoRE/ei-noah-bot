import * as context from 'next/headers';
import rscApi from 'utils/rsc';

import RoleScreen from './RoleScreen';

type Props = {
  params: {
    guildId: string;
  };
};

async function RolePage({ params: { guildId } }: Props) {
  const api = await rscApi(context);

  const [customRoles, member, guild] = await Promise.all([
    api.roles.guildCustom({ guildId }),
    api.user.memberMe({ guildId }),
    api.guild.get({ guildId }),
  ]);

  return (
    <RoleScreen
      initialData={{
        customRoles,
        member,
        guild,
      }}
    />
  );
}

export default RolePage;
