import { NextRequest, NextResponse } from "next/server";


const CORRECT_PASSWORD = process.env.LOGIN_PASSWORD
const TOKEN_SECRET = process.env.SECRET_TOKEN || "default_secret";


function generateToken(): string {
  return Buffer.from(Date.now() + TOKEN_SECRET).toString("base64");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { message: "Password is required" },
        { status: 400 }
      );
    }

    if (password === CORRECT_PASSWORD) {
      const token = generateToken();

      const response = NextResponse.json(
        {
          success: true,
          message: "Authentication successful",
          token,
        },
        { status: 200 }
      );

      response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    } else {
      return NextResponse.json(
        { message: "Invalid password" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "Use POST method to authenticate" },
    { status: 405 }
  );
}
