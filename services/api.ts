import axios from 'axios';

const baseURL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://20.17.177.115/api';

export const api = axios.create({
  baseURL,
  timeout: 20_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export type LoginPayload = {
  login: string;
  password: string;
  lat: number;
  long: number;
};

export async function postLogin(payload: LoginPayload) {
  const res = await api.post('/pengawal/login', payload);
  return res.data as unknown;
}

