import { api } from './apiClient';

export const postSOS = async (token: string, location: any) => {
  try {
    const response = await api.post('sos',
      { location },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending SOS:', error);
    throw error;
  }
};

