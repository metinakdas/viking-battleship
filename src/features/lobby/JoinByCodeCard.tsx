import { useState } from 'react';

import { t } from '@/i18n';
import { isValidRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from '@/services/room/code';
import { Button, Input } from '@/ui';

import { VoyageCard } from './VoyageCard';

/** Kodla katıl: 6 haneli kod ya da yapıştırılan oda linki. Minyatür: run taşı. */
export function JoinByCodeCard({ onJoin }: { onJoin: (code: string) => void }) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | undefined>();
  const code = normalizeRoomCode(raw);

  const submit = () => {
    if (!isValidRoomCode(code)) {
      setError(t('lobby.join.invalid'));
      return;
    }
    setError(undefined);
    onJoin(code);
  };

  return (
    <VoyageCard
      art="runestone"
      title={t('lobby.join.title')}
      description={t('lobby.join.description')}
      action={
        <Button
          label={t('lobby.join.submit')}
          variant="secondary"
          fullWidth
          disabled={code.length === 0}
          onPress={submit}
        />
      }
    >
      <Input
        aria-label={t('lobby.join.placeholder')}
        placeholder={t('lobby.join.placeholder')}
        value={raw}
        onChangeText={(v) => {
          setRaw(v);
          setError(undefined);
        }}
        // Kod yazarken büyük harf; link yapıştırılırsa uzunluk sınırı engel olmasın.
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={raw.includes('/') ? 200 : ROOM_CODE_LENGTH + 2}
        returnKeyType="go"
        onSubmitEditing={submit}
        error={error}
      />
    </VoyageCard>
  );
}
