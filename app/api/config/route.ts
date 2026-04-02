import { NextResponse } from "next/server";
import {
  createAuthSessionSnapshot,
  getCurrentUser,
  isAdminUser,
  setAuthSession,
} from "@/lib/auth";
import { ensureCompanyProfile, updateCompanyProfile } from "@/lib/company";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await ensureCompanyProfile(currentUser.companyId);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("[api/config][GET] Error:", error);
    return NextResponse.json(
      { error: "Error fetching configuration" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await req.json();
    const profile = await updateCompanyProfile(currentUser.companyId, data);
    await setAuthSession(
      createAuthSessionSnapshot({
      id: currentUser.id,
      email: currentUser.email,
      companyId: currentUser.companyId,
      role: currentUser.role,
      fullName: currentUser.fullName,
      companyName: profile.name,
      segment: profile.segment,
      cpf: currentUser.cpf,
      birthDate: currentUser.birthDate?.toISOString() ?? null,
      isDeveloper: currentUser.isDeveloper,
      }),
    );

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[api/config][PUT] Error:", error);
    return NextResponse.json(
      { error: "Error updating configuration" },
      { status: 500 },
    );
  }
}
