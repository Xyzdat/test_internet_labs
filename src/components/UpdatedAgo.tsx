import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

type Props = { since: Date };

export function UpdatedAgo({ since }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [since]);

  const seconds = Math.max(0, Math.floor((now - since.getTime()) / 1000));
  return <Text style={styles.text}>Обновлено {seconds} сек назад</Text>;
}

const styles = StyleSheet.create({
  text: { fontSize: 13, color: '#6b7280' },
});
