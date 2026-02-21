import axios from 'axios';

// Replace with your actual API base URL
const BASE_URL = 'https://api.goldestimation.com/v1';

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor for adding auth token (if needed in future)
apiClient.interceptors.request.use(
    async (config) => {
        // const token = await SecureStore.getItemAsync('token');
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;
