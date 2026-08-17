'use server';

import { prisma } from '@/app/lib/db';

export type HistoryActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';

export type HistoryActor = {
  name?: string;
  email?: string;
  role?: string;
};

export async function writeHistoryLog({
  targetTable,
  targetRowId,
  actionType,
  previousData,
  newData,
  actor,
}: {
  targetTable: string;
  targetRowId: string;
  actionType: HistoryActionType;
  previousData: unknown;
  newData: unknown;
  actor?: HistoryActor;
}) {
  const actorEmail = actor?.email?.trim().toLowerCase() || null;
  const actorName = actor?.name?.trim() || actorEmail || 'System';
  const actorRole = actor?.role?.trim() || null;
  const user = actorEmail ? await prisma.user.findUnique({ where: { email: actorEmail } }) : null;

  return prisma.historyLog.create({
    data: {
      targetTable,
      targetRowId,
      actionType,
      previousData: JSON.stringify(previousData ?? null),
      newData: JSON.stringify(newData ?? null),
      actorName,
      actorEmail,
      actorRole,
      userId: user?.id,
    },
  });
}
