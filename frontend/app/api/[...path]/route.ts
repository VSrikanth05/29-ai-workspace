import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params;
  const backendBase = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!backendBase) {
    return NextResponse.json(
      {
        statusCode: 503,
        message:
          'Backend API is not configured. Please set BACKEND_INTERNAL_URL in your Vercel Environment Variables to your live backend endpoint (e.g. Render / Railway / Supabase).',
        path: pathSegments.join('/'),
      },
      { status: 503 },
    );
  }

  const targetUrl = backendBase.replace(/\/+$/, '') + '/' + pathSegments.join('/') + (req.nextUrl.search || '');

  try {
    const headers = new Headers(req.headers);
    headers.delete('host');
    headers.delete('connection');

    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer();

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        statusCode: 502,
        message: 'Failed to connect to backend server: ' + errorMessage,
        targetUrl,
      },
      { status: 502 },
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
export const OPTIONS = handleProxy;
