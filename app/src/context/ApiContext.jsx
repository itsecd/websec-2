import { createContext, useContext } from 'react';
import axios from 'axios';

export const ApiContext = createContext();

export const ApiProvider = ({ children }) => {
  const getData = async (endpoint, params = {}) => {
    try {
      const response = await axios.get(`http://localhost:3001/api${endpoint}`, {
        params, 
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