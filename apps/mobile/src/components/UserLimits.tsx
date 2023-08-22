import Options from './Options';
import Text from './Text';

type ButtonProps = {
  limit: number;
  currentLimit: number | null;
  onPress: () => void;
};

function UserLimitButton({ limit, currentLimit, onPress }: ButtonProps) {
  const isActive = currentLimit === limit;

  return (
    <Options.Item onPress={onPress} disabled={isActive} active={isActive}>
      <Text className="text-3xl font-bold">{limit === 0 ? '∞' : limit}</Text>
    </Options.Item>
  );
}

type Props = {
  currentLimit: number | null;
  onLimitChange: (limit: number) => void;
};

function UserLimitSelector({ currentLimit, onLimitChange }: Props) {
  const limits = new Set([0, 2, 5, 10, currentLimit || 0]);

  return (
    <Options>
      {Array.from(limits)
        .sort((a, b) => a - b)
        .map((limit) => (
          <UserLimitButton
            limit={limit}
            key={limit}
            onPress={() => onLimitChange(limit)}
            currentLimit={currentLimit}
          />
        ))}
    </Options>
  );
}

export default UserLimitSelector;
