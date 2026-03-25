export type FailureType = 'hallucination' | 'incomplete' | 'irrelevant' | 'verbose' | 'inconsistent';

export type Confidence = 'high' | 'medium' | 'low';
export type Priority = 'critical' | 'improvement';

export interface AIRun {
  id: string;
  input: string;
  output: string;
  context?: string;
  expected?: string;
  failureTypes: FailureType[];
  confidence: Confidence;
  priority: Priority;
  source: string;
  model: string;
  tokens: { input: number; output: number; total: number };
  timestamp: string;
  sessionId?: string;
  tags?: string[];
  whatFailed: string;
  whyFailed: string;
  rootCause: string;
  fix: string;
}

export interface IssueGroup {
  type: FailureType;
  count: number;
  priority: Priority;
  affectedPercentage: number;
  runs: string[];
}

export const sampleRuns: AIRun[] = [
  {
    id: 'run-001',
    input: 'What is the refund policy for premium subscribers?',
    output: 'Premium subscribers can request a full refund within 30 days of purchase. Simply contact our support team and they will process your refund within 3-5 business days.',
    context: 'Refund Policy: All subscribers, including premium, are eligible for a full refund within 14 days of purchase. Refunds are processed within 7-10 business days.',
    failureTypes: ['hallucination'],
    confidence: 'high',
    priority: 'critical',
    source: 'chat_handler.ts:42',
    model: 'gpt-4o',
    tokens: { input: 245, output: 89, total: 334 },
    timestamp: '2026-03-25T10:23:45Z',
    sessionId: 'sess-a1',
    tags: ['support', 'billing'],
    whatFailed: 'Refund window stated as 30 days instead of 14 days; processing time stated as 3-5 days instead of 7-10 days',
    whyFailed: 'Output contradicts provided context. Context states "14 days" but output says "30 days". Context states "7-10 business days" but output says "3-5 business days".',
    rootCause: 'Model ignored retrieved context and relied on parametric knowledge. Likely cause: context not placed in a high-attention position in the prompt template.',
    fix: `- prompt: "Answer the user's question."
+ prompt: "Answer the user's question using ONLY the provided context. Do not use prior knowledge. If the context doesn't contain the answer, say so."`,
  },
  {
    id: 'run-002',
    input: 'Explain the main causes and solutions for memory leaks in Node.js applications',
    output: 'Memory leaks in Node.js are primarily caused by:\n\n1. **Global variables** - Variables attached to the global scope persist throughout the application lifecycle\n2. **Event listeners** - Not removing event listeners when they are no longer needed\n3. **Closures** - Closures that reference large objects prevent garbage collection\n4. **Forgotten timers** - setInterval and setTimeout callbacks holding references',
    failureTypes: ['incomplete'],
    confidence: 'high',
    priority: 'critical',
    source: 'docs_assistant.ts:128',
    model: 'gpt-4o',
    tokens: { input: 156, output: 203, total: 359 },
    timestamp: '2026-03-25T10:25:12Z',
    sessionId: 'sess-a2',
    tags: ['docs', 'technical'],
    whatFailed: 'User asked for both causes AND solutions, but only causes were provided',
    whyFailed: 'The output lists 4 causes of memory leaks but provides zero solutions. The user explicitly requested "causes and solutions".',
    rootCause: 'Model ran out of generation budget or failed to plan for both parts of the query. No instruction to ensure all parts of the question are addressed.',
    fix: `- prompt: "Answer the user's question comprehensively."
+ prompt: "Answer the user's question. Ensure you address ALL parts of their query. If they ask for X and Y, include both X and Y in your response."`,
  },
  {
    id: 'run-003',
    input: 'What is your refund policy?',
    output: 'Our standard shipping takes 3-5 business days for domestic orders and 7-14 business days for international orders. We offer free shipping on orders over $50. Express shipping is available for an additional $12.99 and arrives within 1-2 business days.',
    failureTypes: ['irrelevant'],
    confidence: 'high',
    priority: 'critical',
    source: 'support_bot.ts:67',
    model: 'gpt-3.5-turbo',
    tokens: { input: 89, output: 156, total: 245 },
    timestamp: '2026-03-25T10:28:33Z',
    sessionId: 'sess-a3',
    tags: ['support'],
    whatFailed: 'Response about shipping policy when user asked about refund policy',
    whyFailed: 'Zero semantic overlap between the question (refund policy) and the response (shipping details). The response addresses an entirely different topic.',
    rootCause: 'Retrieval system returned wrong document chunk. The embedding similarity likely confused "policy" as a shared term between refund and shipping policies.',
    fix: `// In retrieval pipeline:
- const results = await search(query, { limit: 3 });
+ const results = await search(query, { limit: 5, rerank: true, min_score: 0.82 });`,
  },
  {
    id: 'run-004',
    input: 'How do I reset my password?',
    output: 'To reset your password, you need to follow these steps. First, you will want to navigate to the login page. The login page is where you enter your credentials. On the login page, you will see a link that says "Forgot Password" or it might say "Reset Password" depending on the version. Click on that link. After clicking the link, you will be taken to a new page. On this new page, you will see a form. The form will ask you to enter your email address. Enter the email address that is associated with your account. Make sure it is the correct email address. After entering your email address, click the "Submit" button or it might say "Send Reset Link". After you click submit, the system will send you an email. Check your email inbox. The email might take a few minutes to arrive. If you don\'t see it, check your spam folder. The email will contain a link. Click on that link. The link will take you to a page where you can create a new password. Enter your new password. Make sure your new password is strong. A strong password has at least 8 characters, includes uppercase and lowercase letters, numbers, and special characters. After entering your new password, confirm it by typing it again. Then click "Save" or "Update Password".',
    failureTypes: ['verbose'],
    confidence: 'high',
    priority: 'improvement',
    source: 'help_center.ts:89',
    model: 'gpt-4o',
    tokens: { input: 67, output: 498, total: 565 },
    timestamp: '2026-03-25T10:31:05Z',
    sessionId: 'sess-a4',
    tags: ['support', 'auth'],
    whatFailed: '498 tokens for a simple password reset flow — 5x expected length',
    whyFailed: 'Response uses 498 output tokens for a question that should take ~100 tokens. Excessive repetition ("click", "page", "email") and redundant elaboration.',
    rootCause: 'No max_tokens constraint. System prompt lacks conciseness instruction. Temperature likely too high causing verbose generation.',
    fix: `- system: "You are a helpful assistant."
+ system: "You are a helpful assistant. Be concise. Use numbered steps for how-to questions. Aim for under 150 words."
+ max_tokens: 200`,
  },
  {
    id: 'run-005',
    input: 'What programming languages does your API support?',
    output: 'Our API supports JavaScript, Python, Ruby, Go, and Java.',
    context: 'Supported Languages: JavaScript/TypeScript, Python, Ruby, Go, Java, PHP, C#, Rust, Kotlin',
    failureTypes: ['incomplete'],
    confidence: 'high',
    priority: 'improvement',
    source: 'api_docs_bot.ts:34',
    model: 'gpt-4o-mini',
    tokens: { input: 178, output: 45, total: 223 },
    timestamp: '2026-03-25T10:34:21Z',
    sessionId: 'sess-a5',
    tags: ['docs', 'api'],
    whatFailed: 'Listed 5 of 9 supported languages, missing PHP, C#, Rust, Kotlin',
    whyFailed: 'Context lists 9 languages but output only mentions 5. Missing: PHP, C#, Rust, Kotlin. 44% of supported languages omitted.',
    rootCause: 'Model truncated the list. No instruction to be exhaustive when listing from provided context.',
    fix: `- prompt: "Answer based on the context."
+ prompt: "Answer based on the context. When listing items from the context, include ALL items — do not truncate or summarize lists."`,
  },
  {
    id: 'run-006',
    input: 'Summarize the quarterly earnings report',
    output: 'Q3 2025 showed revenue of $142M, up 23% YoY. Operating margin improved to 18%. Key growth drivers included enterprise adoption (+45%) and international expansion. The company raised full-year guidance to $580M.',
    failureTypes: ['hallucination'],
    confidence: 'high',
    priority: 'critical',
    source: 'finance_assistant.ts:156',
    model: 'gpt-4o',
    tokens: { input: 1245, output: 167, total: 1412 },
    timestamp: '2026-03-25T10:38:42Z',
    sessionId: 'sess-a6',
    tags: ['finance', 'reporting'],
    context: 'Q3 2025 Revenue: $138M (up 19% YoY). Operating margin: 15.2%. Enterprise growth: 34%. Full-year guidance: $550M.',
    whatFailed: 'Revenue stated as $142M (actual: $138M), growth as 23% (actual: 19%), margin as 18% (actual: 15.2%)',
    whyFailed: 'Four numerical values in the output differ from the context: revenue ($142M vs $138M), YoY growth (23% vs 19%), operating margin (18% vs 15.2%), guidance ($580M vs $550M).',
    rootCause: 'Model hallucinated more optimistic numbers. Financial data requires exact reproduction. No instruction to quote numbers verbatim from source.',
    fix: `- prompt: "Summarize the report."
+ prompt: "Summarize the report. Quote all numbers, percentages, and financial figures EXACTLY as they appear in the source. Do not round or estimate."`,
  },
  {
    id: 'run-007',
    input: 'What is the status of order #12847?',
    output: 'Your order #12847 is currently being processed and should ship within 2-3 business days.',
    context: 'Order #12847: Status: Delivered on March 20, 2026. Tracking: UPS 1Z999AA10123456784.',
    failureTypes: ['hallucination'],
    confidence: 'high',
    priority: 'critical',
    source: 'order_tracker.ts:91',
    model: 'gpt-3.5-turbo',
    tokens: { input: 198, output: 56, total: 254 },
    timestamp: '2026-03-25T10:41:18Z',
    sessionId: 'sess-a1',
    tags: ['support', 'orders'],
    whatFailed: 'Stated order is "being processed" when it was already delivered on March 20',
    whyFailed: 'Context clearly states "Delivered on March 20, 2026" but output claims the order is "being processed". Complete status contradiction.',
    rootCause: 'Model generated a generic response instead of using the specific order data from context. The retrieval result was correct but the model ignored it.',
    fix: `- prompt: "Help the user with their order inquiry."
+ prompt: "Help the user with their order inquiry. Use the EXACT status from the order data. Never guess or generalize order status."`,
  },
  {
    id: 'run-008',
    input: 'Compare React and Vue for building SPAs',
    output: 'React is a JavaScript library for building user interfaces, maintained by Meta. It uses a virtual DOM and JSX syntax. React has a large ecosystem with tools like Redux, React Router, and Next.js.',
    failureTypes: ['incomplete'],
    confidence: 'high',
    priority: 'improvement',
    source: 'tech_advisor.ts:203',
    model: 'gpt-4o-mini',
    tokens: { input: 134, output: 112, total: 246 },
    timestamp: '2026-03-25T10:44:55Z',
    sessionId: 'sess-a7',
    tags: ['technical', 'comparison'],
    whatFailed: 'Only described React — completely omitted Vue comparison',
    whyFailed: 'User asked to "Compare React and Vue" but the response only covers React. Vue is not mentioned at all. No comparison structure provided.',
    rootCause: 'Model generated a description instead of a comparison. No structured output format enforced for comparison queries.',
    fix: `- prompt: "Answer the user's technical question."
+ prompt: "Answer the user's technical question. For comparison queries, use a structured format covering both/all items with the same criteria."`,
  },
  {
    id: 'run-009',
    input: 'What is the capital of France?',
    output: 'The capital of France is Paris.',
    failureTypes: ['inconsistent'],
    confidence: 'high',
    priority: 'improvement',
    source: 'general_qa.ts:12',
    model: 'gpt-4o',
    tokens: { input: 45, output: 18, total: 63 },
    timestamp: '2026-03-25T10:48:30Z',
    sessionId: 'sess-a8',
    tags: ['general'],
    whatFailed: 'Same question answered differently across 3 runs: "Paris", "Paris, France", "The capital city of France is Paris, located in the Île-de-France region"',
    whyFailed: 'Three identical inputs produced outputs with varying length and detail (8 tokens, 12 tokens, 34 tokens). While factually correct, inconsistent formatting breaks downstream parsing.',
    rootCause: 'Non-zero temperature without output format specification. Each generation samples differently.',
    fix: `- temperature: 0.7
+ temperature: 0
+ prompt: "Answer factual questions in a single sentence with no elaboration."`,
  },
  {
    id: 'run-010',
    input: 'List the top 3 features of our enterprise plan',
    output: 'Our enterprise plan includes many great features! Here are the top features you should know about:\n\n1. **Advanced Analytics** - Our enterprise plan comes with advanced analytics that help you understand your data better. These analytics include real-time dashboards, custom reports, historical data analysis, trend forecasting, and anomaly detection. With these analytics, you can make data-driven decisions.\n\n2. **Priority Support** - Enterprise customers get priority support which means faster response times. Our support team is available 24/7 to help you.\n\n3. **Custom Integrations** - You can create custom integrations with your existing tools and workflows. We support REST APIs, webhooks, GraphQL, and native integrations with popular tools like Slack, Jira, and Salesforce.',
    context: 'Enterprise Plan Features: 1) SSO & SAML authentication 2) 99.99% SLA 3) Dedicated account manager',
    failureTypes: ['hallucination', 'verbose'],
    confidence: 'high',
    priority: 'critical',
    source: 'sales_bot.ts:78',
    model: 'gpt-4o',
    tokens: { input: 210, output: 389, total: 599 },
    timestamp: '2026-03-25T10:52:14Z',
    sessionId: 'sess-a2',
    tags: ['sales', 'enterprise'],
    whatFailed: 'Listed fabricated features (Analytics, Priority Support, Custom Integrations) instead of actual features (SSO, SLA, Account Manager)',
    whyFailed: 'None of the 3 features listed match the context. Context says: SSO & SAML, 99.99% SLA, Dedicated account manager. Output invented: Advanced Analytics, Priority Support, Custom Integrations.',
    rootCause: 'Model completely ignored context and generated generic enterprise features. Context positioning in prompt is ineffective.',
    fix: `- system: "You are a sales assistant."
+ system: "You are a sales assistant. ONLY describe features listed in the provided context. Never invent or add features not in the source material."
+ // Move context to end of prompt (recency bias)`,
  },
  {
    id: 'run-011',
    input: 'How do I configure CORS in Express.js?',
    output: 'To configure CORS in Express.js, install the cors package and add it as middleware:\n\n```javascript\nconst cors = require(\'cors\');\napp.use(cors({ origin: \'http://localhost:3000\' }));\n```',
    failureTypes: [],
    confidence: 'high',
    priority: 'improvement',
    source: 'docs_assistant.ts:145',
    model: 'gpt-4o',
    tokens: { input: 123, output: 89, total: 212 },
    timestamp: '2026-03-25T10:55:02Z',
    sessionId: 'sess-a9',
    tags: ['technical', 'backend'],
    whatFailed: '',
    whyFailed: '',
    rootCause: '',
    fix: '',
  },
  {
    id: 'run-012',
    input: 'Explain OAuth 2.0 flow',
    output: 'OAuth 2.0 is an authorization framework. OAuth 2.0 allows third-party applications to access resources. The OAuth 2.0 flow involves several steps. In OAuth 2.0, the client first redirects the user. The user is redirected to the authorization server. The authorization server in OAuth 2.0 authenticates the user. After authentication in OAuth 2.0, the user grants consent. OAuth 2.0 then issues an authorization code. The authorization code in OAuth 2.0 is exchanged for tokens. OAuth 2.0 tokens include an access token. The access token in OAuth 2.0 is used to access resources.',
    failureTypes: ['verbose'],
    confidence: 'high',
    priority: 'improvement',
    source: 'docs_assistant.ts:167',
    model: 'gpt-3.5-turbo',
    tokens: { input: 98, output: 312, total: 410 },
    timestamp: '2026-03-25T10:58:44Z',
    sessionId: 'sess-a10',
    tags: ['technical', 'auth'],
    whatFailed: '"OAuth 2.0" repeated 10 times in 312 tokens — excessive repetition',
    whyFailed: 'The term "OAuth 2.0" appears 10 times in a 312-token response. Each sentence restates the subject unnecessarily. Information density is extremely low.',
    rootCause: 'Model exhibiting repetitive pattern. No deduplication instruction. Temperature and frequency_penalty not tuned.',
    fix: `+ frequency_penalty: 0.5
+ system: "...Be concise. Avoid repeating terms unnecessarily. Use pronouns after first mention."`,
  },
  {
    id: 'run-013',
    input: 'What database should I use for time-series data?',
    output: 'For time-series data, I recommend using MongoDB because it\'s very popular and easy to use.',
    context: 'Time-series databases comparison: TimescaleDB (PostgreSQL extension, best for SQL users), InfluxDB (purpose-built, best write performance), QuestDB (fastest for aggregations), ClickHouse (best for analytics at scale).',
    failureTypes: ['irrelevant', 'hallucination'],
    confidence: 'high',
    priority: 'critical',
    source: 'tech_advisor.ts:89',
    model: 'gpt-3.5-turbo',
    tokens: { input: 267, output: 54, total: 321 },
    timestamp: '2026-03-25T11:02:33Z',
    sessionId: 'sess-a7',
    tags: ['technical', 'database'],
    whatFailed: 'Recommended MongoDB (not in context) instead of specialized time-series databases listed in context',
    whyFailed: 'Context lists 4 specialized time-series databases (TimescaleDB, InfluxDB, QuestDB, ClickHouse) but output recommends MongoDB, which is not mentioned in the context and is not optimized for time-series workloads.',
    rootCause: 'Model defaulted to popular general-purpose database recommendation, ignoring domain-specific context. Context authority not established.',
    fix: `- prompt: "Recommend a database."
+ prompt: "Recommend a database based ONLY on the options in the provided context. Explain trade-offs between the listed options."`,
  },
  {
    id: 'run-014',
    input: 'What are the pricing tiers?',
    output: 'We offer three pricing tiers:\n\n**Free** - $0/month\n- 100 API calls/day\n- Community support\n\n**Pro** - $29/month\n- 10,000 API calls/day\n- Email support\n- Advanced features\n\n**Enterprise** - Custom pricing\n- Unlimited API calls\n- Priority support\n- Custom features',
    context: 'Pricing: Starter ($0, 500 calls/day), Growth ($49/month, 50,000 calls/day, priority email), Scale ($199/month, 500,000 calls/day, dedicated support), Enterprise (custom).',
    failureTypes: ['hallucination'],
    confidence: 'high',
    priority: 'critical',
    source: 'sales_bot.ts:112',
    model: 'gpt-4o-mini',
    tokens: { input: 198, output: 178, total: 376 },
    timestamp: '2026-03-25T11:06:19Z',
    sessionId: 'sess-a3',
    tags: ['sales', 'pricing'],
    whatFailed: 'Fabricated tier names and pricing — none match actual pricing structure',
    whyFailed: 'Context has 4 tiers (Starter/Growth/Scale/Enterprise) but output shows 3 different tiers (Free/Pro/Enterprise) with different prices, limits, and names.',
    rootCause: 'Model generated generic SaaS pricing instead of using provided pricing data. Same pattern as run-010 — context ignored for common patterns.',
    fix: `+ system: "When answering about pricing, reproduce the EXACT tier names, prices, and limits from the provided data. Do not use generic pricing templates."`,
  },
  {
    id: 'run-015',
    input: 'Translate "Hello, how are you?" to Spanish',
    output: '¡Hola! ¿Cómo estás?\n\nNote: This is the informal version. For formal speech, you would say "¿Cómo está usted?" The informal version is commonly used among friends, family, and people of similar age. The formal version is used in professional settings, with elders, or with people you don\'t know well. In some Latin American countries, the informal version is more widely accepted even in semi-formal situations.',
    failureTypes: ['verbose'],
    confidence: 'high',
    priority: 'improvement',
    source: 'translator.ts:23',
    model: 'gpt-4o',
    tokens: { input: 78, output: 198, total: 276 },
    timestamp: '2026-03-25T11:10:45Z',
    sessionId: 'sess-a4',
    tags: ['translation'],
    whatFailed: 'Simple translation request got 198 tokens of cultural commentary — only needed ~10 tokens',
    whyFailed: 'User asked for a translation (expected: ~10 tokens). Got 198 tokens including unsolicited cultural context about formal vs informal speech.',
    rootCause: 'System prompt does not constrain output to translation-only. Model defaults to being "helpful" by adding context.',
    fix: `- system: "You are a translator."
+ system: "You are a translator. Respond with ONLY the translation. No explanations, notes, or cultural context unless explicitly asked."`,
  },
];

export const issueGroups: IssueGroup[] = [
  { type: 'hallucination', count: 24, priority: 'critical', affectedPercentage: 12, runs: ['run-001', 'run-006', 'run-007', 'run-010', 'run-013', 'run-014'] },
  { type: 'incomplete', count: 12, priority: 'critical', affectedPercentage: 6, runs: ['run-002', 'run-005', 'run-008'] },
  { type: 'irrelevant', count: 8, priority: 'critical', affectedPercentage: 4, runs: ['run-003', 'run-013'] },
  { type: 'verbose', count: 18, priority: 'improvement', affectedPercentage: 9, runs: ['run-004', 'run-010', 'run-012', 'run-015'] },
  { type: 'inconsistent', count: 6, priority: 'improvement', affectedPercentage: 3, runs: ['run-009'] },
];

export const failureTypeConfig: Record<FailureType, { label: string; emoji: string; colorClass: string; bgClass: string; borderClass: string }> = {
  hallucination: { label: 'Hallucination', emoji: '👻', colorClass: 'text-hallucination', bgClass: 'bg-hallucination/10', borderClass: 'border-hallucination/30' },
  incomplete: { label: 'Incomplete', emoji: '🧩', colorClass: 'text-incomplete', bgClass: 'bg-incomplete/10', borderClass: 'border-incomplete/30' },
  irrelevant: { label: 'Irrelevant', emoji: '🎯', colorClass: 'text-irrelevant', bgClass: 'bg-irrelevant/10', borderClass: 'border-irrelevant/30' },
  verbose: { label: 'Token Waste', emoji: '💬', colorClass: 'text-verbose', bgClass: 'bg-verbose/10', borderClass: 'border-verbose/30' },
  inconsistent: { label: 'Inconsistent', emoji: '🔀', colorClass: 'text-inconsistent', bgClass: 'bg-inconsistent/10', borderClass: 'border-inconsistent/30' },
};

export const getRunById = (id: string) => sampleRuns.find(r => r.id === id);
export const getRunsBySession = (sessionId: string) => sampleRuns.filter(r => r.sessionId === sessionId);
export const getFailedRuns = () => sampleRuns.filter(r => r.failureTypes.length > 0);
export const getSessions = () => {
  const sessions = new Map<string, AIRun[]>();
  sampleRuns.forEach(run => {
    if (run.sessionId) {
      const existing = sessions.get(run.sessionId) || [];
      existing.push(run);
      sessions.set(run.sessionId, existing);
    }
  });
  return sessions;
};
