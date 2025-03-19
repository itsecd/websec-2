import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import './index.css'
import App from './App.jsx'
import { ApiProvider } from './context/ApiContext.jsx';


createRoot(document.getElementById('root')).render(
  <MantineProvider>
    <ApiProvider>
      <App />
    </ApiProvider>
  </MantineProvider>,
)
