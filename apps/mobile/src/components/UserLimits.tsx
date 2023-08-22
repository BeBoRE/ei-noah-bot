import Options from './Options';
import Text from './Text';

type ButtonProps = {
  limit: number;
};

function UserLimitButton({ limit }: ButtonProps) {
  return (
    <Text className="text-3xl font-bold">{limit === 0 ? '∞' : limit}</Text>
  );
}

type Props = {
  currentLimit: number | null;
  onLimitChange: (limit: number) => void;
};

function UserLimitSelector({ currentLimit, onLimitChange }: Props) {
  const limits = new Set([0, 2, 5, 10, currentLimit || 0]);

  return (
    <Options
      items={Array.from(limits)
        .sort((a, b) => a - b)
        .map((limit) => ({
          onPress: () => onLimitChange(limit),
          children: <UserLimitButton limit={limit} />,
          active: limit === currentLimit,
          id: limit.toString(),
        }))}
    />
  );
}

export default UserLimitSelector;
