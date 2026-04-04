import type { ApiResponse, TableRow } from './types.js';
import { generateTableData } from './generators/table-data.js';

export interface MockApi {
  fetchTableData: (count?: number) => Promise<ApiResponse<TableRow[]>>;
  fetchDashboardData: () => Promise<ApiResponse<{ kpis: number[]; tableRows: number[][] }>>;
  login: (username: string, password: string) => Promise<ApiResponse<{ token: string; user: string }>>;
  fetchNotifications: (count?: number) => Promise<ApiResponse<{ id: number; message: string; read: boolean }[]>>;
  search: (query: string) => Promise<ApiResponse<{ id: number; title: string; snippet: string }[]>>;
}

/**
 * Creates a mock API with configurable delay.
 * All responses are deterministic for a given set of parameters.
 */
export function createMockApi(delay: number = 50): MockApi {
  function simulateDelay<T>(data: T): Promise<ApiResponse<T>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data,
          timestamp: Date.now(),
          delay,
        });
      }, delay);
    });
  }

  return {
    fetchTableData(count = 1000) {
      return simulateDelay(generateTableData(count));
    },

    fetchDashboardData() {
      return simulateDelay({
        kpis: [1250, 8734, 342, 98.5],
        tableRows: Array.from({ length: 50 }, (_, i) =>
          Array.from({ length: 5 }, (_, j) => (i + 1) * 100 + j)
        ),
      });
    },

    login(username, _password) {
      return simulateDelay({
        token: 'mock-jwt-token-' + username,
        user: username,
      });
    },

    fetchNotifications(count = 500) {
      const notifications = Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        message: `Notification #${i + 1}: Lorem ipsum dolor sit amet.`,
        read: i < count * 0.3,
      }));
      return simulateDelay(notifications);
    },

    search(query) {
      const results = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Result ${i + 1} for "${query}"`,
        snippet: `This is a search result snippet containing ${query} in context...`,
      }));
      return simulateDelay(results);
    },
  };
}
