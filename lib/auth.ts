import { cookies } from "next/headers";

export type Session = {
  user: {
    email: string;
    companyId: string;
  };
} | null;

export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");

  if (!token) return null;

  try {
    const sessionData = JSON.parse(token.value);
    return {
      user: {
        email: sessionData.email,
        companyId: sessionData.companyId,
      },
    };
  } catch (e) {
    return null;
  }
}
      user: {
        email: sessionData.email,
        companyId: sessionData.companyId,
      },
    };
  } catch (e) {
    return null;
  }
}
