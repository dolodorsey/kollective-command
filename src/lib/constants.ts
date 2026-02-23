export const DIVISIONS = [
  { key: 'casper', name: 'CASPER GROUP', sub: 'Food & Beverage', color: '#E8772E', icon: '🍽',
    brands: ['Angel Wings','Pasta Bish','Taco Yaki','Patty Daddy','Espresso Co','Morning After',"Toss'd",'Sweet Tooth','Mojo Juice','Mr. Oyster'] },
  { key: 'huglife', name: 'HUGLIFE', sub: 'Events & Experiences', color: '#7C3AED', icon: '🎪',
    brands: ['Espresso','Gangsta Gospel',"Sunday's Best",'Shut Up & Dance','Napkin King','Paparazzi','Pawchella','Black Ball','Beauty & The Beast','Taste of Art','Haunted House',"Monster's Ball",'Snow Ball','Winter Wonderland','NOIR','REMIX'] },
  { key: 'umbrella', name: 'UMBRELLA GROUP', sub: 'Services', color: '#2563EB', icon: '☂',
    brands: ['Umbrella Auto Exchange','Umbrella Injury Network','Umbrella Realty Group','Umbrella Clean Services',"The People's Dept.",'Umbrella Accounting','The Brand Studio','The Automation Office','The Mind Studio','Umbrella Legal & Compliance'] },
  { key: 'bodegea', name: 'BODEGEA', sub: 'Products', color: '#059669', icon: '📦',
    brands: ['Infinity Water','Pronto Energy','Noir (Espresso Liqueur)','Stush'] },
  { key: 'scented', name: 'SCENTED FLOWERS', sub: 'Museum Series', color: '#E11D48', icon: '🌺',
    brands: ['Forever Futbol','Living Legends','Women Make The World','Fallen Stars'] },
  { key: 'opulence', name: 'OPULENCE DESIGNS', sub: 'Art', color: '#D97706', icon: '🎨',
    brands: ['Torches','Angel & Astronauts','Izzy','Country Boy'] },
  { key: 'playmakers', name: 'PLAYMAKERS', sub: 'Non-Profit', color: '#DC2626', icon: '⚽',
    brands: ['Sole Exchange',"Let's Talk About It"] },
  { key: 'innercircle', name: 'INNER CIRCLE', sub: 'Apps', color: '#0D9488', icon: '📱',
    brands: ['Good Times','Roadside','On Call'] },
  { key: 'drdorsey', name: 'DR. DORSEY', sub: 'Personal Brand', color: '#18181B', icon: '👤',
    brands: ['Dr. Dorsey','Linda (Assistant)','DOLO'] },
];

export const BRAND_COLORS: Record<string, string> = {
  casper: '#E8772E', huglife: '#7C3AED', umbrella: '#2563EB', bodegea: '#059669',
  scented: '#E11D48', opulence: '#D97706', playmakers: '#DC2626', innercircle: '#0D9488',
  drdorsey: '#18181B',
};

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

export const COMMAND_LABELS: Record<string, { label: string; desc: string }> = {
  'brand.email_blast': { label: 'Send Email Blast', desc: 'Sends templated email to brand contact list' },
  'brand.ig_outreach': { label: 'Send IG DMs', desc: 'Sends DM scripts to Instagram targets' },
  'brand.scrape_leads': { label: 'Find New Leads', desc: 'Scrapes IG/Google for new contacts' },
  'scrape.&.enrich.leads': { label: 'Scrape + Enrich', desc: 'Finds leads then fills in missing info' },
  'social_outreach_sync': { label: 'Sync Social Targets', desc: 'Pulls latest social targets from sheets' },
  'pr.blast': { label: 'Send PR Pitch', desc: 'Sends press release or pitch to media contacts' },
  'event.launch': { label: 'Launch Event', desc: 'Activates event promotion across all channels' },
  'content.generate': { label: 'Generate Content', desc: 'Creates social media content pack' },
  'social.comment': { label: 'Post Comments', desc: 'Drops comments on target posts' },
  'lead.score': { label: 'Score Leads', desc: 'Runs scoring algorithm on lead database' },
};

export const WORKFLOW_CATEGORIES: Record<string, { label: string; color: string }> = {
  content: { label: 'Content', color: 'text-amber-600' },
  outreach: { label: 'Outreach', color: 'text-blue-600' },
  social: { label: 'Social', color: 'text-pink-600' },
  intel: { label: 'Intel', color: 'text-purple-600' },
  events: { label: 'Events', color: 'text-teal-600' },
  sales: { label: 'Sales', color: 'text-green-600' },
  ops: { label: 'Ops', color: 'text-gray-500' },
  system: { label: 'System', color: 'text-red-600' },
};

export const LEAD_TYPES = ['pr', 'sponsor', 'grant', 'customer', 'influencer', 'dj_host', 'vendor', 'media'];

export const TEAM = [
  { name: 'Sharky', role: 'Operations Lead', focus: ['Attorney (Skyler)', 'Rent/Lease', 'Food Vendors', 'LLC/Banking', 'Pinky Promise', 'Impact Center', 'Company Email/Docs/Logins', 'Social Media', 'Graphics'] },
  { name: 'Nya', role: 'Casper Group + Legal', focus: ['Casper Group', 'Legal', 'Forever Futbol'] },
  { name: 'Vincent', role: 'DJ/Host + Products', focus: ['Iconic / HugLife', 'Products'] },
  { name: 'Nicholas', role: 'Event / Museum', focus: ['Iconic / HugLife', 'NOIR'] },
  { name: 'Eric (Gucci)', role: 'Event / Museum', focus: ['Iconic / HugLife', 'Taste of Art'] },
  { name: 'JRock', role: 'Event', focus: ['Iconic / HugLife', 'REMIX'] },
  { name: 'Bax', role: 'Event', focus: ['Iconic / HugLife', 'WRST BHVR : Napkins'] },
  { name: 'Kei', role: 'Event / Museum', focus: ['Iconic / HugLife', "Sunday's Best"] },
  { name: 'Dom', role: 'Event', focus: ['Iconic / HugLife', 'Paparazzi'] },
  { name: 'Kenny', role: 'Event / Museum', focus: ['Iconic / HugLife'] },
  { name: 'Tim', role: 'Event', focus: ['Iconic / HugLife'] },
  { name: 'Ellori', role: 'Event / Museum', focus: ['Iconic / HugLife'] },
  { name: 'Myia B', role: 'Mind Studio', focus: ['Umbrella Group'] },
  { name: 'Linda', role: 'Executive Assistant', focus: ['Dr. Dorsey'] },
  { name: 'Claire Benton', role: 'Kollective Assistant', focus: ['The Kollective'] },
  { name: 'Evan Clarke', role: 'AI CEO', focus: ['Casper Group'] },
  { name: 'Nova Reed', role: 'AI Rep', focus: ['HugLife'] },
];

export const AI_AGENTS = [
  { name: 'Linda', role: 'Executive Assistant', brand: 'Dr. Dorsey', email: 'drdorseyassistant@gmail.com' },
  { name: 'Claire Benton', role: 'Kollective Assistant', brand: 'The Kollective', email: 'kollectiveassistant@gmail.com' },
  { name: 'Evan Clarke', role: 'CEO', brand: 'Casper Group', email: 'caspergroupceo@gmail.com' },
  { name: 'Luca Romano', role: 'Rep', brand: 'Casper Group', email: '' },
  { name: 'Nova Reed', role: 'Rep', brand: 'HugLife', email: '' },
];

export const CITIES = ['Atlanta, GA', 'Houston, TX', 'Los Angeles, CA', 'Washington, DC', 'Charlotte, NC', 'Las Vegas, NV', 'Miami, FL', 'New York, NY', 'Dallas, TX', 'Chicago, IL'];

export const US_HOLIDAYS_2026 = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-01-19', name: 'MLK Day' },
  { date: '2026-02-14', name: "Valentine's Day" },
  { date: '2026-02-16', name: "Presidents' Day" },
  { date: '2026-03-17', name: "St. Patrick's Day" },
  { date: '2026-04-05', name: 'Easter' },
  { date: '2026-05-05', name: 'Cinco de Mayo' },
  { date: '2026-05-10', name: "Mother's Day" },
  { date: '2026-05-25', name: 'Memorial Day' },
  { date: '2026-06-19', name: 'Juneteenth' },
  { date: '2026-06-21', name: "Father's Day" },
  { date: '2026-07-04', name: 'Independence Day' },
  { date: '2026-09-07', name: 'Labor Day' },
  { date: '2026-10-31', name: 'Halloween' },
  { date: '2026-11-26', name: 'Thanksgiving' },
  { date: '2026-12-25', name: 'Christmas' },
  { date: '2026-12-31', name: "New Year's Eve" },
];

export const CULTURAL_DATES_2026 = [
  { date: '2026-06-25', name: 'BET Awards Weekend', city: 'Los Angeles' },
  { date: '2026-12-04', name: 'Art Basel', city: 'Miami' },
  { date: '2026-02-01', name: 'Black History Month Starts' },
  { date: '2026-03-01', name: "Women's History Month Starts" },
  { date: '2026-06-01', name: 'Pride Month Starts' },
];

export const WORLD_CUP_2026 = { start: '2026-06-11', end: '2026-07-19', cities: ['Atlanta', 'Houston', 'Los Angeles'] };

export const DATA_SOURCES: Record<string, string> = {
  'AI Persona': 'https://docs.google.com/spreadsheets/d/1osiM_NItkparG59DKkVW8nWt6AWCPVbB',
  'PR Database': 'https://docs.google.com/spreadsheets/d/18FbI4m-sHrsmV-qm1pgg5BkOiBsFqJY2lYz_zZryd38',
  'Brand Database': 'https://docs.google.com/spreadsheets/d/13_WRR_tLsMguPLzOx1E7RxhwQPIolu2OXTngNRD25WY',
  'Master Contacts': 'https://docs.google.com/spreadsheets/d/1fW3R0hNSwPtWukcfn4ejZ6702aDBPST_rmz5DVUbpKM',
  'Casper Prospects': 'https://docs.google.com/spreadsheets/d/1YW5A6Q0JsYBF7pXG7AX-KIuH0Lxts4xe',
  'Entertainment DB': 'https://docs.google.com/spreadsheets/d/1jRZ0QjBmHd2Q_62xQi1ei-_ADyqeyDyo',
  'Product Suppliers': 'https://docs.google.com/spreadsheets/d/1YtYPqeLJ6MvXKOmDT8L3XoH-Ridm12Qe5gBT1UFOy7M',
  'VA Team Directory': 'https://docs.google.com/spreadsheets/d/1_SgSs-JM1klP4ebLvHlAQUqT4j3FU3lBwYMr5VXan7Y',
  'Good Times Directory': 'https://docs.google.com/spreadsheets/d/1pzvjbDbl1UKYFDJ-LSWQuJE9I8XDBNOg-fjLb2amo6Q',
  'Outreach Command': 'https://docs.google.com/spreadsheets/d/1_eu4xY-_oRe5zYbrRo4Q7GCXmR9iEmZP_p-QRbQ7qcY',
  'Social Outreach': 'https://docs.google.com/spreadsheets/d/1-CFQeoT1x6KTQkwEbZpb1OxB4pguro4h',
  'Master Budget': 'https://docs.google.com/spreadsheets/d/1PSDPh9iAjZg1knGF3b1w5xNTcRVO6zsZ',
};
