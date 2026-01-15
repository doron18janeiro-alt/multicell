import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = session.user.companyId;

    // Fetch all daily closings descending (newest first)
    const closings = await prisma.dailyClosing.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
    });

    if (closings.length === 0) {
      return NextResponse.json({ closings: [], bestDay: null, worstDay: null });
    }

    // Determine Best and Worst Day based on Net Total
    const sortedByValue = [...closings].sort((a, b) => b.totalNet - a.totalNet);
    const bestDay = sortedByValue[0];
    const worstDay = sortedByValue[sortedByValue.length - 1];

    return NextResponse.json({
      closings,
      bestDay,
      worstDay,
    });
  } catch (error) {
    console.error("Error fetching performance:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
