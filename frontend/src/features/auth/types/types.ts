export interface User {
  id: number
  username: string
  email: string
}

export interface AuthTokens {
  access_token: string
  token_type: string
}
