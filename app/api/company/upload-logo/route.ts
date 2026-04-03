import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { updateCompanyProfile } from "@/lib/company";

const MAX_LOGO_UPLOAD_SIZE = 10 * 1024 * 1024;

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Selecione uma imagem para enviar." },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Envie apenas arquivos de imagem." },
        { status: 400 },
      );
    }

    if (file.size > MAX_LOGO_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "A logo deve ter no maximo 10 MB." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    const profile = await updateCompanyProfile(currentUser.companyId, {
      logoUrl: dataUrl,
    });

    return NextResponse.json({
      success: true,
      logoUrl: profile.logoUrl || dataUrl,
      message: "Logo enviada com sucesso.",
    });
  } catch (error) {
    console.error("[api/company/upload-logo][POST] Error:", error);
    return NextResponse.json(
      { error: "Nao foi possivel enviar a logo." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await updateCompanyProfile(currentUser.companyId, {
      logoUrl: null,
    });

    return NextResponse.json({
      success: true,
      logoUrl: null,
      message: "Logo removida com sucesso.",
    });
  } catch (error) {
    console.error("[api/company/upload-logo][DELETE] Error:", error);
    return NextResponse.json(
      { error: "Nao foi possivel remover a logo." },
      { status: 500 },
    );
  }
}

