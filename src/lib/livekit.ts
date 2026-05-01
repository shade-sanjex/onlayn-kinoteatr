import { SignJWT } from 'jose';

// Warning: Generating tokens on the client is for development/demonstration only. 
// In a real production app, you should generate these on your backend.
const LIVEKIT_API_KEY = import.meta.env.VITE_LIVEKIT_API_KEY || 'APIYzAEN2XK9Hzu';
const LIVEKIT_API_SECRET = import.meta.env.VITE_LIVEKIT_API_SECRET || 'whAums3gvqodWtyQmUMf8OIX7IJVC2D0OH9ed6TMxLm';
export const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://kinoteatr-olfy4t22.livekit.cloud';

export async function generateLiveKitToken(roomName: string, participantName: string) {
  const secret = new TextEncoder().encode(LIVEKIT_API_SECRET);
  
  const token = await new SignJWT({
    name: participantName,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    }
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(LIVEKIT_API_KEY)
    .setSubject(participantName)
    .setExpirationTime('24h')
    .sign(secret);

  return token;
}
