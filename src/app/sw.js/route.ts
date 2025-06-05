import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // 空のサービスワーカーを返す
  const swContent = `
// Property Photo App Service Worker
self.addEventListener('install', function(event) {
  console.log('Service Worker installing');
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating');
});
`
  
  return new NextResponse(swContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache',
    },
  })
} 