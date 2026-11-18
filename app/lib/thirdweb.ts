import { createThirdwebClient } from 'thirdweb';

// thirdweb client IDs are public by design (they identify the app, they are
// not secrets). Restrict the allowed domains in the thirdweb dashboard and set
// VITE_THIRDWEB_CLIENT_ID per environment; the fallback keeps local dev working.
const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID || '16362e5b3d37d7ad46c62131459dc05b';

export const client = createThirdwebClient({ clientId });
