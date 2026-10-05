import { useEffect, useRef } from 'react';
import { socket } from './socketClient';
import type { ServerToClientEvents } from '@/types';

export function useSocketEvent<E extends keyof ServerToClientEvents>(
  event: E,
  handler: ServerToClientEvents[E]
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = ((...args: any[]) => {
      // @ts-expect-error dynamic spread for typed handler
      handlerRef.current(...args);
    }) as any;

    socket.on(event as any, listener);

    return () => {
      socket.off(event as any, listener);
    };
  }, [event]);
}
