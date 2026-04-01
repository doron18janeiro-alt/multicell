import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (id === currentUser.id) {
      return NextResponse.json(
        { error: "Nao e permitido excluir o proprio usuario." },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        companyId: currentUser.companyId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Funcionario nao encontrado." },
        { status: 404 },
      );
    }

    if (targetUser.role !== "ATTENDANT") {
      return NextResponse.json(
        { error: "Somente atendentes podem ser excluidos." },
        { status: 400 },
      );
    }

    await prisma.user.delete({
      where: { id: targetUser.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[team][DELETE] Error:", error);
    return NextResponse.json(
      { error: "Erro ao excluir funcionario." },
      { status: 500 },
    );
  }
}
