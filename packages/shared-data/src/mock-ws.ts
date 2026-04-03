import type { DashboardBatch } from './types.js';
import { createDashboardStream, type DashboardStream } from './generators/dashboard-data.js';

export interface MockWebSocket {
  connect: (onMessage: (batch: DashboardBatch) => void) => void;
  disconnect: () => void;
  setRate: (batchesPerSecond: number) => void;
  isConnected: () => boolean;
}

/**
 * Creates a mock WebSocket that simulates real-time dashboard data.
 * Wraps the dashboard stream with a WebSocket-like interface.
 */
export function createMockWebSocket(seed: number = 42): MockWebSocket {
  let stream: DashboardStream | null = null;
  let connected = false;

  return {
    connect(onMessage) {
      if (connected) return;
      stream = createDashboardStream(seed);
      stream.start(onMessage);
      connected = true;
    },

    disconnect() {
      if (stream) {
        stream.stop();
        stream = null;
      }
      connected = false;
    },

    setRate(batchesPerSecond) {
      if (stream) {
        stream.setRate(batchesPerSecond);
      }
    },

    isConnected() {
      return connected;
    },
  };
}
