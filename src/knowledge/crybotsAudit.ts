export type CryBotsRouteFact={
  route:string;
  key:string;
  component:string;
  access:"public"|"protected"|"admin"|"mixed";
  area:string;
  sourcePath:string;
};

export type CryBotsRelationship={
  from:string;
  to:string[];
  relationship:string;
};

export type DynamicDataRule={
  topic:string;
  examples:string[];
  rule:"live-from-crybots"|"verified-static";
  reason:string;
};

export const crybotsAudit={
  repository:"jaydencyril67/Kingshall",
  ref:"f0eca3c11019d7a6d2f5516358d1b8a145166d3f",
  verifiedFrom:"src/index.tsx",
  purpose:"v1.3 current CryBots app knowledge audit",
  rule:"The Brain may explain verified navigation, marketplace, WorldScope, developer, security, and history features, but must query CryBots for live account state instead of inventing it."
} as const;

export const verifiedRoutes:CryBotsRouteFact[]=[
{route:"/",key:"landing",component:"LandingPage",access:"public",area:"public",sourcePath:"src/index.tsx"},
{route:"/signup",key:"signup",component:"SignupPage",access:"public",area:"authentication",sourcePath:"src/index.tsx"},
{route:"/signup-confirmation-sent",key:"signup-confirmation-sent",component:"SignupConfirmationSentPage",access:"public",area:"authentication",sourcePath:"src/index.tsx"},
{route:"/verify-email",key:"verify-email",component:"VerifyEmailPage",access:"public",area:"authentication",sourcePath:"src/index.tsx"},
{route:"/account-confirmed",key:"account-confirmed",component:"AccountConfirmedPage",access:"public",area:"authentication",sourcePath:"src/index.tsx"},
{route:"/signin",key:"signin",component:"SigninPage",access:"public",area:"authentication",sourcePath:"src/index.tsx"},
{route:"/forgot-password",key:"forgot-password",component:"ForgotPasswordPage",access:"public",area:"authentication",sourcePath:"src/index.tsx"},
{route:"/home",key:"home",component:"HomePage",access:"protected",area:"core",sourcePath:"src/index.tsx"},
{route:"/details",key:"details",component:"DetailsPage",access:"protected",area:"account",sourcePath:"src/index.tsx"},
{route:"/manage",key:"manage",component:"ManagePage",access:"protected",area:"account",sourcePath:"src/index.tsx"},
{route:"/profile",key:"profile",component:"ProfilePage",access:"protected",area:"account",sourcePath:"src/index.tsx"},
{route:"/statistics",key:"statistics",component:"StatisticsPage",access:"protected",area:"account",sourcePath:"src/index.tsx"},
{route:"/security",key:"security",component:"SecurityPage",access:"protected",area:"security",sourcePath:"src/index.tsx"},
{route:"/danger",key:"danger",component:"DangerPage",access:"protected",area:"account",sourcePath:"src/index.tsx"},
{route:"/pending-deletion",key:"pending-deletion",component:"PendingDeletionPage",access:"mixed",area:"account",sourcePath:"src/index.tsx"},
{route:"/enable-account",key:"enable-account",component:"EnableAccountPage",access:"public",area:"account",sourcePath:"src/index.tsx"},
{route:"/asset",key:"asset",component:"AssetPage",access:"protected",area:"assets",sourcePath:"src/index.tsx"},
{route:"/deposit",key:"deposit",component:"DepositPage",access:"protected",area:"assets",sourcePath:"src/index.tsx"},
{route:"/withdrawals",key:"withdrawals",component:"WithdrawalsPage",access:"protected",area:"assets",sourcePath:"src/index.tsx"},
{route:"/transfer",key:"transfer",component:"TransferPage",access:"protected",area:"assets",sourcePath:"src/index.tsx"},
{route:"/transactions",key:"transactions",component:"TransactionHistoryPage",access:"protected",area:"history",sourcePath:"src/index.tsx"},
{route:"/notifications",key:"notifications",component:"NotificationsPage",access:"protected",area:"notifications",sourcePath:"src/index.tsx"},
{route:"/notifications/:id",key:"notification",component:"NotificationPage",access:"protected",area:"notifications",sourcePath:"src/index.tsx"},
{route:"/alert",key:"alert",component:"AlertPage",access:"protected",area:"notifications",sourcePath:"src/index.tsx"},
{route:"/tickets",key:"tickets",component:"TicketsPage",access:"protected",area:"support",sourcePath:"src/index.tsx"},
{route:"/chat",key:"chat",component:"ChatPage",access:"protected",area:"support",sourcePath:"src/index.tsx"},
{route:"/help",key:"help",component:"HelpPage",access:"protected",area:"support",sourcePath:"src/index.tsx"},
{route:"/faq",key:"faq",component:"FAQPage",access:"protected",area:"support",sourcePath:"src/index.tsx"},
{route:"/trade",key:"trade",component:"TradePage",access:"protected",area:"trading",sourcePath:"src/index.tsx"},
{route:"/chart",key:"chart",component:"Chart",access:"protected",area:"trading",sourcePath:"src/index.tsx"},
{route:"/trade/history",key:"trade-history",component:"TradeHistory",access:"protected",area:"trading",sourcePath:"src/index.tsx"},
{route:"/worldscope",key:"worldscope",component:"WorldScopePage",access:"protected",area:"market-intelligence",sourcePath:"src/components/WorldScopePage.tsx"},
{route:"/market",key:"market",component:"Market",access:"protected",area:"bots",sourcePath:"src/index.tsx"},
{route:"/creation",key:"creation",component:"Creation",access:"protected",area:"bots",sourcePath:"src/index.tsx"},
{route:"/rentals",key:"rentals",component:"RentalsPage",access:"protected",area:"bots",sourcePath:"src/index.tsx"},
{route:"/commerce",key:"commerce",component:"CommercePage",access:"protected",area:"bots",sourcePath:"src/index.tsx"},
{route:"/bots",key:"bots",component:"BotInvestmentsPage",access:"protected",area:"bots",sourcePath:"src/index.tsx"},
{route:"/portfolio",key:"portfolio",component:"Portfolio",access:"protected",area:"portfolio",sourcePath:"src/index.tsx"},
{route:"/logs",key:"logs",component:"LogsPage",access:"protected",area:"history",sourcePath:"src/index.tsx"},
{route:"/options",key:"options",component:"OptionsPage",access:"protected",area:"settings",sourcePath:"src/index.tsx"},
{route:"/theme",key:"theme",component:"ThemePage",access:"protected",area:"settings",sourcePath:"src/index.tsx"},
{route:"/nowbar",key:"nowbar",component:"NowBarPage",access:"protected",area:"navigation",sourcePath:"src/index.tsx"},
{route:"/nowbar-color",key:"nowbar-color",component:"NowBarColorPage",access:"protected",area:"navigation",sourcePath:"src/index.tsx"},
{route:"/nowbar-button-color",key:"nowbar-button-color",component:"NowBarButtonColorPage",access:"protected",area:"navigation",sourcePath:"src/index.tsx"},
{route:"/notification-color",key:"notification-color",component:"NotificationColorPage",access:"protected",area:"notifications",sourcePath:"src/index.tsx"},
{route:"/exit",key:"exit",component:"ExitPage",access:"protected",area:"session",sourcePath:"src/index.tsx"},
{route:"/auto-exit",key:"auto-exit",component:"AutoExitPage",access:"protected",area:"session",sourcePath:"src/index.tsx"},
{route:"/manual-exit",key:"manual-exit",component:"ManualExitPage",access:"protected",area:"session",sourcePath:"src/index.tsx"},
{route:"/tools",key:"tools",component:"ToolsPage",access:"protected",area:"tools",sourcePath:"src/index.tsx"},
{route:"/stats",key:"stats",component:"StatsPage",access:"protected",area:"tools",sourcePath:"src/index.tsx"},
{route:"/menu",key:"menu",component:"MenuPage",access:"protected",area:"tools",sourcePath:"src/index.tsx"},
{route:"/agent",key:"agent",component:"AgentPage",access:"protected",area:"automation",sourcePath:"src/index.tsx"},
{route:"/store",key:"store",component:"StorePage",access:"protected",area:"store",sourcePath:"src/index.tsx"},
{route:"/download",key:"download",component:"DownloadPage",access:"protected",area:"store",sourcePath:"src/index.tsx"},
{route:"/about",key:"about",component:"AboutPage",access:"protected",area:"information",sourcePath:"src/index.tsx"},
{route:"/information",key:"information",component:"InformationPage",access:"protected",area:"information",sourcePath:"src/index.tsx"},
{route:"/privacy-policy",key:"privacy-policy",component:"PrivacyPolicyPage",access:"protected",area:"information",sourcePath:"src/index.tsx"},
{route:"/community-standards",key:"community-standards",component:"CommunityStandardsPage",access:"protected",area:"information",sourcePath:"src/index.tsx"},
{route:"/dev",key:"dev",component:"DevPage",access:"protected",area:"developer",sourcePath:"src/index.tsx"},
{route:"/api-keys",key:"api-keys",component:"ApiKeysPage",access:"protected",area:"developer",sourcePath:"src/index.tsx"},
{route:"/webhooks",key:"webhooks",component:"WebhooksPage",access:"protected",area:"developer",sourcePath:"src/index.tsx"},
{route:"/configure",key:"configure",component:"ConfigurePage",access:"protected",area:"developer",sourcePath:"src/index.tsx"},
{route:"/app-usage",key:"app-usage",component:"AppUsagePage",access:"protected",area:"developer",sourcePath:"src/index.tsx"},
{route:"/admin-home",key:"admin-home",component:"AdminHomePage",access:"admin",area:"admin",sourcePath:"src/index.tsx"},
{route:"/admin/settings",key:"admin-settings",component:"AdminSettingsPage",access:"admin",area:"admin",sourcePath:"src/index.tsx"},
{route:"/admin/users",key:"admin-users",component:"AdminUsersPage",access:"admin",area:"admin",sourcePath:"src/index.tsx"},
{route:"/admin/deposits",key:"admin-deposits",component:"AdminDepositsPage",access:"admin",area:"admin",sourcePath:"src/index.tsx"},
{route:"/admin/deposit-stats/:id",key:"admin-deposit-stats",component:"AdminDepositStatsPage",access:"admin",area:"admin",sourcePath:"src/index.tsx"},
{route:"/admin/alert",key:"admin-alert",component:"AdminAlertPage",access:"admin",area:"admin",sourcePath:"src/index.tsx"},
{route:"/admin/alert/send/:id",key:"admin-alert-send",component:"AdminAlertSendPage",access:"admin",area:"admin",sourcePath:"src/index.tsx"},
{route:"/admin/funds",key:"admin-funds",component:"AdminFundsPage",access:"admin",area:"admin",sourcePath:"src/index.tsx"},
{route:"/admin/funds/send/:id",key:"admin-funds-send",component:"AdminFundsSendPage",access:"admin",area:"admin",sourcePath:"src/index.tsx"},
{route:"/admin/user-stats/:id",key:"admin-user-stats",component:"AdminUserStatsPage",access:"admin",area:"admin",sourcePath:"src/index.tsx"},
{route:"/admin/withdrawals",key:"admin-withdrawals",component:"AdminWithdrawalsPage",access:"admin",area:"admin",sourcePath:"src/index.tsx"},
{route:"/admin/withdrawal-stats/:id",key:"admin-withdrawal-stats",component:"AdminWithdrawalStatsPage",access:"admin",area:"admin",sourcePath:"src/index.tsx"},
{route:"/admin/tickets",key:"admin-tickets",component:"AdminTicketsPage",access:"admin",area:"admin",sourcePath:"src/index.tsx"},
{route:"/admin/chat",key:"admin-chat",component:"AdminChatPage",access:"admin",area:"admin",sourcePath:"src/index.tsx"},
{route:"/admin/chat/:id",key:"admin-chat-user",component:"AdminChatUserPage",access:"admin",area:"admin",sourcePath:"src/index.tsx"},
{route:"/admin/ticket-stats/:id",key:"admin-ticket-stats",component:"AdminTicketStatsPage",access:"admin",area:"admin",sourcePath:"src/index.tsx"}
];

export const verifiedRelationships:CryBotsRelationship[]=[
{from:"/market",to:["/commerce","/rentals","/creation","/bots"],relationship:"parent marketplace"},
{from:"/worldscope",to:[],relationship:"market-intelligence subscriptions and rankings"},
{from:"/asset",to:["/deposit","/withdrawals","/transfer","/manage"],relationship:"asset-management hub"},
{from:"/profile",to:["/details","/statistics","/security","/danger"],relationship:"account hub"},
{from:"/help",to:["/faq","/chat","/tickets"],relationship:"support hub"},
{from:"/dev",to:["/api-keys","/webhooks","/configure"],relationship:"developer hub"},
{from:"/trade",to:["/chart","/trade/history"],relationship:"trading tools"},
{from:"/notifications",to:["/notifications/:id","/alert"],relationship:"notification flow"},
{from:"/exit",to:["/auto-exit","/manual-exit"],relationship:"session exit options"}
];

export const dynamicDataRules:DynamicDataRule[]=[
{topic:"account-state",examples:["balance","profile data","session state","idle-logout settings"],rule:"live-from-crybots",reason:"These values are loaded from authenticated API calls and can change."},
{topic:"transactions",examples:["deposits","withdrawals","transfers","transaction history"],rule:"live-from-crybots",reason:"The UI requests current transaction records from the backend."},
{topic:"bots",examples:["bot status","efficiency","investment","rental expiry","positions","performance"],rule:"live-from-crybots",reason:"Bot state and performance are user/account data and must not be guessed."},
{topic:"market",examples:["prices","movers","symbol results","liquidity"],rule:"live-from-crybots",reason:"The frontend requests current market/creation data."},
{topic:"webhooks",examples:["enabled state","delivery history","attempts","response status","last error"],rule:"live-from-crybots",reason:"Webhook state and delivery results are backend state."},
{topic:"notifications",examples:["unread state","notification records","alert preferences"],rule:"live-from-crybots",reason:"These values are stored and retrieved from the account."},
{topic:"static-app-knowledge",examples:["route names","feature purpose","navigation relationships","supported webhook event labels"],rule:"verified-static",reason:"These are documented directly by the verified frontend source snapshot."}
];
