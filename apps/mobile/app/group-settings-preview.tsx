/** Development-only fixture: the production settings sheet of a group the phone reaches directly,
 * with synthetic in-memory settings (no chat service, computer or account writes).
 * cindy://group-settings-preview?state=on|off|offline|legacy|conflict → 群管理 → 「群里的 Cindy」
 * cindy://group-settings-preview?state=members → 成员 → 搜「Cindy」: the group's Cindy among same-name companions. */
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
const STATES = ['on', 'off', 'offline', 'legacy', 'conflict', 'members'] as const;
type State = typeof STATES[number];

const person = (n: number, name: string, role: 'owner' | 'admin' | 'member' = 'member') =>
  ({ id: id(n), kind: 'human' as const, ownerActorId: id(n), ownerName: '', name, avatar: null, state: 'joined', role });
const companion = (n: number, name: string, owner: number, avatar: string | null = null) =>
  ({ id: id(n), kind: 'bot' as const, ownerActorId: id(owner), ownerName: '', name, avatar, state: 'joined', role: 'member' as const, guestAccess: 'none' as const });
/** Shaped like the server's members: the group's Cindy has no avatar of its own; one companion also uses Cindy's artwork. */
const SAME_NAME = [person(10, 'Quinn Example'), person(11, '张示例'), person(12, 'Morgan Sample'), person(13, 'Taylor Demo'), person(14, 'Cindy Example'),
  companion(20, 'Cindy', 10, 'cindy://avatar/preset/cindy'), companion(21, 'Cindy Nova', 11), companion(22, 'Cindy', 12), companion(23, 'Cindy-Lab', 13)];

function snapshot(assistant: boolean, revision: number, members = false): ChatSnapshot {
  return { cursor: '1', messages: [], room: { id: id(1), name: 'Launch room', kind: 'group', archived: false, revision, assistant,
    response_mode: 'all', speaking_mode: 'auto', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' }, members: [
    { id: id(2), kind: 'human', ownerActorId: id(2), ownerName: '', name: 'You', avatar: null, state: 'joined', role: 'admin' },
    { id: id(3), kind: 'human', ownerActorId: id(3), ownerName: '', name: 'Avery', avatar: null, state: 'joined', role: 'owner' },
    { id: id(4), kind: 'bot', assistant: true, ownerActorId: '', ownerName: '', name: 'Cindy', avatar: null, state: 'joined', role: 'member', guestAccess: 'none' },
    ...(members ? SAME_NAME : []),
  ] };
}

export default function GroupSettingsPreview() {
  const params = useLocalSearchParams<{ state?: string }>();
  const state: State = STATES.includes(params.state as State) ? params.state as State : 'on';
  const router = useRouter();
  const { colors } = useTheme();
  const lookup = useBotGroupIdentities('');
  const [room, setRoom] = useState({ assistant: state !== 'off', revision: 5 });
  const group = useMemo(() => ({ ...chatGroupView({ snapshot: snapshot(room.assistant, room.revision, state === 'members'), messages: [], before: null }, id(2)),
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
