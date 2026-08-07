import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[erp-crm] Server running on http://localhost:${PORT}`);
  console.log(`[erp-crm] Environment: ${process.env.NODE_ENV || 'development'}`);
});
