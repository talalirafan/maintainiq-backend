export const ROLES = {
  ADMINISTRATOR: 'administrator',
  TECHNICIAN: 'technician',
  REPORTER: 'reporter',
  SUPERVISOR: 'supervisor',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const ASSET_STATUS = {
  OPERATIONAL: 'operational',
  ISSUE_REPORTED: 'issue_reported',
  INSPECTION: 'inspection',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service',
  RETIRED: 'retired',
} as const;

export type AssetStatus = (typeof ASSET_STATUS)[keyof typeof ASSET_STATUS];

export const ASSET_CONDITION = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
  CRITICAL: 'critical',
} as const;

export type AssetCondition = (typeof ASSET_CONDITION)[keyof typeof ASSET_CONDITION];

export const ISSUE_STATUS = {
  REPORTED: 'reported',
  ASSIGNED: 'assigned',
  INSPECTION_STARTED: 'inspection_started',
  MAINTENANCE: 'maintenance',
  WAITING_PARTS: 'waiting_parts',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REOPENED: 'reopened',
} as const;

export type IssueStatus = (typeof ISSUE_STATUS)[keyof typeof ISSUE_STATUS];

export const ISSUE_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type IssuePriority = (typeof ISSUE_PRIORITY)[keyof typeof ISSUE_PRIORITY];

export const HISTORY_EVENT = {
  ASSET_CREATED: 'asset_created',
  ASSET_UPDATED: 'asset_updated',
  ISSUE_REPORTED: 'issue_reported',
  ASSIGNED: 'assigned',
  INSPECTION_STARTED: 'inspection_started',
  MAINTENANCE_STARTED: 'maintenance_started',
  PART_REPLACED: 'part_replaced',
  RESOLVED: 'resolved',
  REOPENED: 'reopened',
  RETIRED: 'retired',
} as const;

export type HistoryEvent = (typeof HISTORY_EVENT)[keyof typeof HISTORY_EVENT];

export const COLLECTIONS = {
  USERS: 'users',
  ASSETS: 'assets',
  ISSUES: 'issues',
  MAINTENANCE_RECORDS: 'maintenance_records',
  ASSET_HISTORY: 'asset_history',
  NOTIFICATIONS: 'notifications',
  AI_LOGS: 'ai_logs',
  REFRESH_TOKENS: 'refresh_tokens',
} as const;
