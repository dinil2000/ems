import AsyncStorage from '@react-native-async-storage/async-storage';

// Production Vercel Cloud Backend API
export const VERCEL_CLOUD_API = 'https://mppems.vercel.app/api';
export const DEFAULT_LAN_IP = 'http://10.174.154.52:5000/api';
export const EMULATOR_IP = 'http://10.0.2.2:5000/api';
export const LOCALHOST_IP = 'http://localhost:5000/api';

export const getApiUrlList = async () => {
  try {
    const customUrl = await AsyncStorage.getItem('ems_custom_api_url');
    if (customUrl) {
      return [customUrl, VERCEL_CLOUD_API, DEFAULT_LAN_IP, EMULATOR_IP, LOCALHOST_IP];
    }
  } catch (e) {}

  return [VERCEL_CLOUD_API, DEFAULT_LAN_IP, EMULATOR_IP, LOCALHOST_IP];
};
