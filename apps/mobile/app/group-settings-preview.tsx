/** Development-only fixture: the production settings sheet of a group the phone reaches directly,
 * with synthetic in-memory settings (no chat service, computer or account writes).
 * cindy://group-settings-preview?state=on|off|offline|legacy|conflict → 群管理 → 「群里的 Cindy」 */
import { useMemo, useState } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { chatGroupView, type ChatSnapshot } from '@/chat/chatServerClient';
import { MOBILE_VISUAL_MOCK_ENABLED } from '@/config/env';
import { useBotGroupIdentities } from '@/session/BotGroupAvatars';
import { ChatGroupSettingsSheet } from '@/session/ChatGroupSettingsSheet';
import type { useBotGroupSettingsManagement } from '@/session/useBotGroupSettingsManagement';
import { useTheme } from '@/theme';
import { goBackGuarded } from '@/utils/backGuard';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const STATES = ['on', 'off', 'offline', 'legacy', 'conflict'] as const;
type State = typeof STATES[number];

function snapshot(assistant: boolean, revision: number): ChatSnapshot {
  return { cursor: '1', messages: [], room: { id: id(1), name: 'Launch room', kind: 'group', archived: false, revision, assistant,
    response_mode: 'all', speaking_mode: 'auto', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' }, members: [
    { id: id(2), kind: 'human', ownerActorId: id(2), ownerName: '', name: 'You', avatar: null, state: 'joined', role: 'admin' },
    { id: id(3), kind: 'human', ownerActorId: id(3), ownerName: '', name: 'Avery', avatar: null, state: 'joined', role: 'owner' },
    { id: id(4), kind: 'bot', assistant: true, ownerActorId: '', ownerName: '', name: 'Cindy', avatar: null, state: 'joined', role: 'member' },
  ] };
}

export default function GroupSettingsPreview() {
  const params = useLocalSearchParams<{ state?: string }>();
  const state: State = STATES.includes(params.state as State) ? params.state as State : 'on';
  const router = useRouter();
  const { colors } = useTheme();
  const lookup = useBotGroupIdentities('');
  const [room, setRoom] = useState({ assistant: state !== 'off', revision: 5 });
  const group = useMemo(() => ({ ...chatGroupView({ snapshot: snapshot(room.assistant, room.revision), messages: [], before: null }, id(2)),
    ...(state === 'legacy' ? {} : { supportsGroupAssistant: true, assistantEnabled: room.assistant }) }), [room, state]);
  if (!MOBILE_VISUAL_MOCK_ENABLED) return <Redirect href="/" />;
  const management = { group, editable: true, ready: true, loading: false, reason: null, refresh: async () => undefined,
    invite: async () => null,
    act: async (actionId: string, input: Record<string, unknown> = {}) => {
      // A conflict leaves the saved value; the switch must show it again.
      if (state === 'conflict') throw new Error('REVISION_CONFLICT');
      if (actionId === 'set-assistant' && typeof input.assistant === 'boolean') setRoom(current => ({ assistant: input.assistant as boolean, revision: current.revision + 1 }));
      return { effects: [] };
    } } as unknown as ReturnType<typeof useBotGroupSettingsManagement>;
  return <View style={{ flex: 1, backgroundColor: colors.surface }}>
    <ChatGroupSettingsSheet visible group={group} host={{ deviceId: '', deviceName: '' }} online={state !== 'offline'}
      identityFor={(botId, name) => lookup(botId, name, group.members.find(member => member.botId === botId))} act={async () => ({ effects: [] })}
      management={management} onClose={() => goBackGuarded(router)} />
  </View>;
}
