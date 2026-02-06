import { createClient } from '@sanity/client'

export const sanityClient = createClient({
  projectId: 'lmi10j91',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
})
