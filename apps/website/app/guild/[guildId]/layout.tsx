import { Button } from "app/_components/ui/button";
import { Separator } from "app/_components/ui/separator";
import { CDNRoutes, ImageFormat, RouteBases } from "discord-api-types/v10";
import { Settings, Users } from "lucide-react";
import * as context from "next/headers";
import Image from "next/image";
import Link from "next/link";
import rscApi from "utils/rsc";

type Props = {
  children?: React.ReactNode;
  params: {
    guildId: string;
  };
}

const GuildLayout = async ({children, params: {guildId}}: Props) => {
  const api = await rscApi(context);

  const guild = await api.guild.get({guildId})

  const icon =
    guild?.icon &&
    `${RouteBases.cdn}/${CDNRoutes.guildIcon(
      guild.id,
      guild.icon,
      ImageFormat.PNG,
    )}`;

  return (
    <div className="flex flex-1 py-4 container gap-2">
      <div className="w-3/12">
        <h1 className="flex items-center gap-3 p-2 rounded-md text-center text-2xl text-primary-900 dark:text-primary-300 bg-primary-900">
          <span>
            {icon && (
              <Image
                src={icon}
                alt={`${guild.name} icon`}
                width={48}
                height={48}
                className="rounded-full"
              />
            )}
          </span>
          {guild?.name}
        </h1>
        <div className="py-2">
          <Button asChild className="w-full justify-start" variant="outline">
            <Link href={`/guild/${guildId}/roles`}><Users className="mr-2 h-4 w-4" />Roles</Link>
          </Button>
        </div>
        <Separator />
        <div className="py-2">
          <Button asChild className="w-full justify-start" variant="outline">
            <Link href={`/guild/${guildId}/settings`}><Settings className="mr-2 h-w w-4" />Settings</Link>
          </Button>
        </div>
      </div>
      {children}
    </div>
  )
}

export default GuildLayout;
