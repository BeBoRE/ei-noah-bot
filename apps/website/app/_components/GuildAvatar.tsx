import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

type GuildAvatarProps = {
  name: string;
  icon?: string | null;
  width?: number;
  height?: number;
};

export function GuildAvatar({
  name,
  icon,
  width = 32,
  height = 32,
}: GuildAvatarProps) {
  const fallbackText = name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('');

  return (
    <Avatar>
      {icon && (
        <AvatarImage
          src={icon}
          alt={`${name} icon`}
          width={width}
          height={height}
        />
      )}
      <AvatarFallback>{fallbackText}</AvatarFallback>
    </Avatar>
  );
}
