import axios from 'axios';

const baseURL =
  (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim() ||
  'http://20.17.177.115/api/pengawal';

export const api = axios.create({
  baseURL,
  timeout: 20_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

