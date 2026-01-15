import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await request.json();
    const { email, password } = data;

    // Fallback search since ID might not be in old cookies yet, try to find by email from session
    let userId = session.user.id;
    if (!userId) {
      const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
      if (currentUser) {
        userId = currentUser.id;
      } else {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    if (!email && !password) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updateData: any = {};
    if (email) updateData.email = email;
    if (password) {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: { email: updatedUser.email },
    });
  } catch (error) {
    console.error("Settings Update Error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
