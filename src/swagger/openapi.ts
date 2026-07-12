import { env } from '../config/env.js';

/** OpenAPI document — Auth (Phase 2) + Assets (Phase 3). */
export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'MaintainIQ API',
    version: '0.6.0',
    description: 'AI-powered QR maintenance & asset history platform.',
  },
  servers: [{ url: env.apiBaseUrl, description: 'Current environment' }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Assets' },
    { name: 'Public' },
    { name: 'Issues' },
    { name: 'Upload' },
    { name: 'History' },
    { name: 'Dashboard' },
    { name: 'Notifications' },
    { name: 'Settings' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: { '200': { description: 'Service is healthy' } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in',
        responses: { '200': { description: 'Access + refresh tokens and user' } },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token',
        responses: { '200': { description: 'New token pair' } },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Authenticated user profile' } },
      },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List users (admin/supervisor)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Paginated users' } },
      },
      post: {
        tags: ['Users'],
        summary: 'Create user (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'User created' } },
      },
    },
    '/api/assets': {
      get: {
        tags: ['Assets'],
        summary: 'List assets with search, filters, pagination',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Paginated assets' } },
      },
      post: {
        tags: ['Assets'],
        summary: 'Create asset (admin/supervisor) — auto AST-###### code',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Asset created' } },
      },
    },
    '/api/assets/{id}': {
      get: {
        tags: ['Assets'],
        summary: 'Get asset by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Asset details + publicUrl' } },
      },
      patch: {
        tags: ['Assets'],
        summary: 'Update asset',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Asset updated' } },
      },
      delete: {
        tags: ['Assets'],
        summary: 'Delete asset',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Asset deleted' } },
      },
    },
    '/api/assets/{id}/assign': {
      post: {
        tags: ['Assets'],
        summary: 'Assign or unassign technician',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Assignment updated' } },
      },
    },
    '/api/assets/{id}/history': {
      get: {
        tags: ['Assets'],
        summary: 'Append-only asset timeline',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'History events' } },
      },
    },
    '/api/public/assets/{id}': {
      get: {
        tags: ['Public'],
        summary: 'Safe public asset view (no auth)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Public-safe asset fields only' },
          '404': { description: 'Missing or retired asset' },
        },
      },
    },
    '/api/public/assets/{id}/activity': {
      get: {
        tags: ['Public'],
        summary: 'Safe public activity timeline (no auth)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Sanitized recent activity' } },
      },
    },
    '/api/public/assets/{id}/issues': {
      post: {
        tags: ['Public', 'Issues'],
        summary: 'Report issue without authentication',
        responses: { '201': { description: 'Issue created' } },
      },
    },
    '/api/issues': {
      get: {
        tags: ['Issues'],
        summary: 'List issues',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Paginated issues' } },
      },
      post: {
        tags: ['Issues'],
        summary: 'Create issue',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Issue created' } },
      },
    },
    '/api/issues/{id}/assign': {
      post: {
        tags: ['Issues'],
        summary: 'Assign technician',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Assigned' } },
      },
    },
    '/api/issues/{id}/resolve': {
      post: {
        tags: ['Issues'],
        summary: 'Resolve issue',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Resolved' } },
      },
    },
    '/api/upload/evidence': {
      post: {
        tags: ['Upload'],
        summary: 'Upload evidence file',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Uploaded' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
} as const;

