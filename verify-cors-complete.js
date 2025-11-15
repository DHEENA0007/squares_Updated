#!/usr/bin/env node

/**
 * Comprehensive CORS & API Verification Script
 * Tests all critical endpoints and validates CORS configuration
 */

import https from 'https';
import http from 'http';

const ENDPOINTS = {
  production: {
    name: 'Production (api.buildhomemartsquares.com)',
    url: 'https://api.buildhomemartsquares.com',
    routes: [
      '/health',
      '/api/properties?limit=12&page=1',
      '/api/',
    ]
  },
  local: {
    name: 'Local Development (localhost:8000)',
    url: 'http://localhost:8000',
    routes: [
      '/health',
      '/api/properties?limit=12&page=1',
      '/api/',
    ]
  }
};

const ORIGINS = [
  'http://localhost:8001',
  'https://buildhomemartsquares.com',
  'https://www.buildhomemartsquares.com',
  'https://squares-v2.vercel.app',
];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(`${colors[color]}${args.join(' ')}${colors.reset}`);
}

function makeRequest(url, origin = null) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'CORS-Verification-Script/1.0',
        ...(origin && { 'Origin': origin })
      }
    };

    const request = client.request(options, (response) => {
      const duration = Date.now() - startTime;
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        resolve({
          success: true,
          status: response.statusCode,
          statusText: response.statusMessage,
          headers: response.headers,
          body: data,
          duration,
          origin
        });
      });
    });

    request.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        code: error.code,
        duration: Date.now() - startTime,
        origin
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
        code: 'TIMEOUT',
        duration: Date.now() - startTime,
        origin
      });
    });

    request.end();
  });
}

function validateCorsHeaders(headers, origin) {
  const allowOrigin = headers['access-control-allow-origin'];
  const allowMethods = headers['access-control-allow-methods'];
  const allowHeaders = headers['access-control-allow-headers'];
  
  return {
    allowOrigin: !!allowOrigin,
    allowMethods: !!allowMethods,
    allowHeaders: !!allowHeaders,
    matchesOrigin: allowOrigin === origin || allowOrigin === '*',
    hasPatch: allowMethods?.includes('PATCH'),
    hasCredentials: !!headers['access-control-allow-credentials']
  };
}

async function testEndpoints(baseUrl, name) {
  log('cyan', `\n${'═'.repeat(70)}`);
  log('bright', `📍 Testing: ${name}`);
  log('cyan', `${'═'.repeat(70)}\n`);

  const results = [];

  // Test without origin
  log('blue', '1️⃣  Testing without Origin header:\n');
  for (const route of ENDPOINTS[baseUrl].routes) {
    const fullUrl = `${ENDPOINTS[baseUrl].url}${route}`;
    const result = await makeRequest(fullUrl);
    
    const statusColor = result.success ? (result.status < 400 ? 'green' : 'yellow') : 'red';
    log(statusColor, `${result.success ? '✓' : '✗'} ${route}`);
    log('dim', `  Status: ${result.success ? result.status : result.error} (${result.duration}ms)`);
    
    if (result.success && result.status < 400) {
      const cors = validateCorsHeaders(result.headers, null);
      if (cors.allowOrigin) {
        log('green', `  CORS: Access-Control-Allow-Origin: ${result.headers['access-control-allow-origin']}`);
      } else {
        log('yellow', `  CORS: No Access-Control-Allow-Origin header`);
      }
    }
    results.push(result);
  }

  // Test with origins
  log('blue', '\n2️⃣  Testing with Origin headers:\n');
  for (const origin of ORIGINS) {
    log('dim', `Testing with Origin: ${origin}`);
    for (const route of ENDPOINTS[baseUrl].routes.slice(0, 1)) { // Test first route only
      const fullUrl = `${ENDPOINTS[baseUrl].url}${route}`;
      const result = await makeRequest(fullUrl, origin);
      
      const statusColor = result.success ? (result.status < 400 ? 'green' : 'yellow') : 'red';
      const corsValidation = validateCorsHeaders(result.headers, origin);
      const corsStatus = corsValidation.matchesOrigin ? 'green' : 'yellow';
      
      log(corsStatus, `  ${corsValidation.matchesOrigin ? '✓' : '✗'} ${origin}`);
      
      if (result.headers['access-control-allow-origin']) {
        log('dim', `    → ${result.headers['access-control-allow-origin']}`);
      } else {
        log('dim', `    → (no CORS header)`);
      }
    }
  }
}

function displaySummary(allResults) {
  log('bright', `\n${'═'.repeat(70)}`);
  log('bright', '📊 OVERALL SUMMARY');
  log('bright', `${'═'.repeat(70)}\n`);

  const successful = allResults.filter(r => r.success && r.status < 400).length;
  const corsEnabled = allResults.filter(r => r.headers['access-control-allow-origin']).length;

  log('cyan', `✓ Successful Requests: ${successful}/${allResults.length}`);
  log('cyan', `✓ CORS Headers Present: ${corsEnabled}/${allResults.length}`);

  const issues = [];
  
  if (successful < allResults.length) {
    issues.push('Some endpoints are unreachable or returning errors');
  }
  
  if (corsEnabled < allResults.length) {
    issues.push('Some endpoints are missing CORS headers');
  }

  if (issues.length > 0) {
    log('yellow', '\n⚠️  Issues Detected:\n');
    issues.forEach(issue => {
      log('yellow', `  • ${issue}`);
    });
  } else {
    log('green', '\n✓ All checks passed!');
  }

  log('bright', `\n${'═'.repeat(70)}`);
  log('bright', '💡 RECOMMENDATIONS\n');

  if (corsEnabled === 0) {
    log('yellow', 'Critical: CORS not configured');
    log('dim', '  1. Check NGINX configuration');
    log('dim', '  2. Verify Express CORS middleware is active');
    log('dim', '  3. Check backend is responding');
    log('dim', '  4. Review deployment logs');
  } else if (corsEnabled < allResults.length) {
    log('yellow', 'Some endpoints missing CORS headers');
    log('dim', '  1. Verify NGINX forwards CORS headers');
    log('dim', '  2. Check if middleware is applied to all routes');
    log('dim', '  3. Test with curl: curl -H "Origin: http://localhost:8001" <url>');
  } else {
    log('green', 'CORS configuration looks good!');
    log('dim', '  1. Test frontend connections');
    log('dim', '  2. Monitor browser console for errors');
    log('dim', '  3. Check API response content');
  }

  log('bright', `\n${'═'.repeat(70)}\n`);
}

async function runAllTests() {
  log('bright', '\n╔════════════════════════════════════════════════════════╗');
  log('bright', '║      CORS & API Comprehensive Verification Suite        ║');
  log('bright', '╚════════════════════════════════════════════════════════╝\n');

  const allResults = [];

  // Test production first
  await testEndpoints('production', ENDPOINTS.production.name);
  const prodResults = [];
  
  for (const route of ENDPOINTS.production.routes) {
    const fullUrl = `${ENDPOINTS.production.url}${route}`;
    const result = await makeRequest(fullUrl);
    allResults.push(result);
    prodResults.push(result);
  }

  // Test local if available
  try {
    log('blue', '\n3️⃣  Attempting local connection test...');
    const healthCheck = await makeRequest('http://localhost:8000/health');
    if (healthCheck.success) {
      log('green', '✓ Local backend is running\n');
      await testEndpoints('local', ENDPOINTS.local.name);
      
      for (const route of ENDPOINTS.local.routes) {
        const fullUrl = `${ENDPOINTS.local.url}${route}`;
        const result = await makeRequest(fullUrl);
        allResults.push(result);
      }
    }
  } catch (error) {
    log('dim', 'Local backend not available (this is OK for production)');
  }

  displaySummary(allResults);

  // Exit with appropriate code
  const failedRequests = allResults.filter(r => !r.success || r.status >= 400).length;
  process.exit(failedRequests > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  log('red', '❌ Fatal Error:', error.message);
  process.exit(1);
});
