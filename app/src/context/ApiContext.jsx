import { createContext, useContext } from 'react';
import axios from 'axios';

export const ApiContext = createContext();

export const ApiProvider = ({ children }) => {
  const apiKey = import.meta.env.VITE_YANDEX_API_KEY; 

  const getData = async (endpoint, params = {}) => {
    try {
      const response = await axios.get(`https://api.rasp.yandex.net/v3.0${endpoint}`, {
        params: {
          apikey: apiKey,
          ...params,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error('API request is failed: ' + error.message);
    }
  };

  return (
    <ApiContext.Provider value={{ getData }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => useContext(ApiContext); 