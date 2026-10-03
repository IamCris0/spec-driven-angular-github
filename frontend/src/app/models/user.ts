/** Usuario tal como lo devuelve la API: nunca incluye la contraseña. */
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
