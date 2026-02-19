export const DIVISIONS = [
  { key: 'casper', name: 'CASPER GROUP', sub: 'Food & Beverage', color: '#D4603A', icon: '🍽',
    brands: ['Angel Wings','Pasta Bish','Taco Yaki','Patty Daddy','Espresso Co','Morning After',"Toss'd",'Sweet Tooth','Mojo Juice','Mr. Oyster'] },
  { key: 'huglife', name: 'HUGLIFE', sub: 'Events & Experiences', color: '#9C27B0', icon: '🎪',
    brands: ['NOIR','Gangsta Gospel',"Sunday's Best",'REMIX','WRST BHVR : NAPKIN WARS','Paparazzi','Pawchella','Black Ball','Beauty & The Beast','Taste of Art','Haunted House',"Monster's Ball",'Snow Ball','Winter Wonderland'] },
  { key: 'umbrella', name: 'UMBRELLA GROUP', sub: 'Services', color: '#1E88E5', icon: '☂',
    brands: ['Umbrella Auto Exchange','Umbrella Injury Network','Umbrella Realty Group','Umbrella Clean Services',"The People's Dept.",'Umbrella Accounting','The Brand Studio','The Automation Office','The Mind Studio','Umbrella Legal & Compliance'] },
  { key: 'bodegea', name: 'BODEGEA', sub: 'Products', color: '#43A047', icon: '📦',
    brands: ['Infinity Water','Pronto Energy','Noir (Espresso Liqueur)','Stush'] },
  { key: 'scented', name: 'SCENTED FLOWERS', sub: 'Museum Series', color: '#E91E63', icon: '🌺',
    brands: ['Forever Futbol','Living Legends','Women Make The World','Fallen Stars'] },
  { key: 'opulence', name: 'OPULENCE DESIGNS', sub: 'Art', color: '#FF9800', icon: '🎨',
    brands: ['Torches','Angel & Astronauts','Izzy','Country Boy'] },
  { key: 'playmakers', name: 'PLAYMAKERS', sub: 'Non-Profit', color: '#00BCD4', icon: '⚽',
    brands: ['Sole Exchange',"Let's Talk About It"] },
  { key: 'innercircle', name: 'INNER CIRCLE', sub: 'Apps', color: '#7C4DFF', icon: '📱',
    brands: ['Good Times','Roadside','On Call'] },
];

export const WORKFLOWS = [
  { id: 'T7ZOnFaSEvcYvwbM', name: 'Content Factory', cat: 'content', webhook: '/webhook/content-campaign' },
  { id: 'bGdwLiVFcqP0FcIG', name: 'PR Send Pitch', cat: 'outreach', webhook: null },
  { id: 'rrGMta9UjYxkPcgz', name: 'Social Inbox', cat: 'social', webhook: '/webhook/social-inbox' },
  { id: '0paDyU807bccvZYQ', name: 'Influencer Outreach', cat: 'outreach', webhook: null },
  { id: 'ya3S4B89sgViCZY7', name: 'Competitive Monitoring', cat: 'intel', webhook: null },
  { id: 'ca5RBVlllApR4F61', name: 'Event Launch Engine', cat: 'events', webhook: '/webhook/event-launch' },
  { id: 'LcSKrYBhoMOvK0YD', name: 'Brand Voice', cat: 'content', webhook: '/webhook/brand-voice-analyze' },
  { id: '3RZbP7GLiYqztNRO', name: 'Lead Revenue', cat: 'sales', webhook: '/webhook/lead-revenue' },
  { id: 'gY9i3dPy3UIvjU00', name: 'Casper Ops', cat: 'ops', webhook: null },
  { id: 'vk5Rd1MO5YnGhHrF', name: 'Vendor Ops', cat: 'ops', webhook: null },
  { id: '7sSvlSzCeIx2SdQ2', name: 'Webhook Health', cat: 'system', webhook: null },
  { id: 'kf48VVHafFcqkm1I', name: 'Command Authority', cat: 'system', webhook: '/webhook/command-authority' },
  { id: 'RlKxBDXVEL5u1ztH', name: 'Failure Intelligence', cat: 'system', webhook: null },
  { id: 'yGGm5IVIqFGprFBn', name: 'Scheduled Messenger', cat: 'outreach', webhook: '/webhook/schedule-text' },
  { id: 'm1JYqHCsULRYvwMZ', name: 'Contact Sourcer', cat: 'sales', webhook: '/webhook/source-contacts' },
  { id: 'IccJ2L56lxKI2FKv', name: 'Social Send DMs', cat: 'social', webhook: '/webhook/send-dms' },
  { id: 'bKyPsFlvQ6xSvVzr', name: 'Social Message Gen', cat: 'social', webhook: '/webhook/social-message-gen' },
  { id: 'FJfgKLj7sXHqYBjR', name: 'LINDA Dispatch', cat: 'system', webhook: '/webhook/linda' },
];

export const WORKFLOW_CATEGORIES: Record<string, { label: string; color: string }> = {
  content: { label: 'Content', color: 'text-status-warning' },
  outreach: { label: 'Outreach', color: 'text-status-info' },
  social: { label: 'Social', color: 'text-status-pink' },
  intel: { label: 'Intel', color: 'text-status-purple' },
  events: { label: 'Events', color: 'text-status-cyan' },
  sales: { label: 'Sales', color: 'text-status-success' },
  ops: { label: 'Ops', color: 'text-muted-foreground' },
  system: { label: 'System', color: 'text-status-error' },
};

export const TEAM = [
  { name: 'Sharky', role: 'Operations Lead', focus: ['Attorney (Skyler)', 'Rent/Lease', 'Food Vendors', 'LLC/Banking', 'Pinky Promise', 'Impact Center', 'Company Email/Docs/Logins', 'Social Media', 'Graphics'] },
  { name: 'Nya', role: 'Field Operations', focus: ['10 Locations/Day', 'Food Vendor', 'Indeed Pool', 'Water/Energy Outreach', 'Legal Update'] },
  { name: 'Alandra', role: 'Field Operations', focus: ['10 Locations/Day', 'Food Vendor', 'Indeed Pool', 'Water/Energy Outreach'] },
  { name: 'Stephanie', role: 'Billing & Licensing', focus: ['Billing', 'Licensing Services'] },
  { name: 'Samara', role: 'Personal', focus: ['Unemployment', 'Meta Glasses', 'Lottery Office', 'Shopify', 'Puff Logo'] },
];

export const CITIES = ['Atlanta, GA', 'Houston, TX', 'Los Angeles, CA', 'Washington, DC', 'Charlotte, NC', 'Las Vegas, NV', 'Miami, FL'];
