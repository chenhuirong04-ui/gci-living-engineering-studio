import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {QuotationShellWrapper} from './shell/QuotationShellWrapper';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QuotationShellWrapper>
      <App />
    </QuotationShellWrapper>
  </StrictMode>,
);
