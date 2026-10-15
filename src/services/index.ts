import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { MockAuthService, type AuthService } from './auth';
import { MockChatService } from './chat/MockChatService';
import type { ChatService } from './chat/types';
import { MockMatchmakingService } from './room/MockMatchmakingService';
import { MockRoomService } from './room/MockRoomService';
import type { MatchmakingService, RoomService } from './room/types';
import { createOnlineSession } from './transport/sessions';

/** Paylaşılan oda linki: web'de bu sitenin adresi, uygulamada amiralbatti://room/CODE. */
function roomUrl(code: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/room/${code}`;
  }
  return Linking.createURL(`/room/${code}`);
}

const chat = new MockChatService();

/**
 * Servis kayıt defteri. UI servisleri yalnızca buradan alır; gerçek sağlayıcılar
 * (Supabase/Firebase kimlik, WebSocket oda/sohbet) geldiğinde değişen tek yer burası olur.
 */
export const services: {
  auth: AuthService;
  chat: ChatService;
  rooms: RoomService;
  matchmaking: MatchmakingService;
} = {
  auth: new MockAuthService(AsyncStorage),
  chat,
  rooms: new MockRoomService({
    chat,
    onBotJoined: (code, bot) => chat.setAutoReply(code, bot),
    buildUrl: roomUrl,
    startSession: (room, me, opponent) =>
      createOnlineSession({
        me,
        opponent,
        chat,
        channel: room.code,
        roomCode: room.code,
        settings: room.settings,
      }).id,
  }),
  matchmaking: new MockMatchmakingService({
    startSession: (me, opponent) => {
      const session = createOnlineSession({ me, opponent, chat });
      chat.setAutoReply(session.id, opponent);
      return session.id;
    },
  }),
};
