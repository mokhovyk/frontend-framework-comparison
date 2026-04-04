import { ref } from 'vue';

export const isAuthenticated = ref(false);
export const currentUser = ref<string | null>(null);

export function login(username: string) {
  isAuthenticated.value = true;
  currentUser.value = username;
}

export function logout() {
  isAuthenticated.value = false;
  currentUser.value = null;
}
