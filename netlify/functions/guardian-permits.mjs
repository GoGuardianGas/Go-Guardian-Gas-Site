import { getStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';
import { createPermitHandler } from '../lib/permit-core.mjs';

export default createPermitHandler({
  getStore: context => getStore({ name: context.deploy?.context === 'production' ? 'guardian-permits-v1' : `guardian-permits-preview-${context.deploy?.id || 'local'}`, consistency: 'strong' }),
  getStaff: () => getUser()
});

export const config = { rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
