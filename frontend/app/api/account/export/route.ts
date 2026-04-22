import { NextResponse } from 'next/server';
import { getAccountWorkspaceData } from '@/lib/data/authenticated/account-workspace';
import { createLogger, logError } from '@/lib/logger';

const log = createLogger('api.account.export');

export async function GET() {
  try {
    const data = await getAccountWorkspaceData();
    const filename = `politicoresto-account-export-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logError(log, error, { event: 'account.export.failed' });
    return NextResponse.json(
      {
        error: 'Export impossible',
      },
      { status: 500 },
    );
  }
}
