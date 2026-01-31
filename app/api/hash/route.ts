import { NextResponse } from "next/server";

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL_ENV as string;

// generate short hash
function generateHash() {
  return crypto.randomUUID().slice(0, 8);
}

export async function POST(request: Request) {
  try {
    const { uid, company } = await request.json();

    if (!uid || !company) {
      return NextResponse.json(
        { error: "uid and company required" },
        { status: 400 }
      );
    }

    // 1️⃣ Check if hash already exists in Apps Script
    const checkRes = await fetch(
      `${GOOGLE_SCRIPT_URL}?action=getHash&uid=${uid}&company=${company}`
    );

    const checkData = await checkRes.json();

    // 2️⃣ If exists → reuse it
    if (checkData.exists && checkData.hash) {
      return NextResponse.json({
        hash: checkData.hash,
        reused: true,
      });
    }

    // 3️⃣ If not exists → generate new hash in Next.js
    const newHash = generateHash();

    // 4️⃣ Store in Google Sheet via Apps Script
    const storeRes = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "storeHash",
        hash: newHash,
        uid,
        company,
      }),
    });

    const storeData = await storeRes.json();

    if (!storeData.success) {
      return NextResponse.json(
        { error: "Failed to store hash" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      hash: newHash,
      reused: false,
    });

  } catch (error) {
    console.error("Hash API Error:", error);
    return NextResponse.json(
      { error: "Hash service failed" },
      { status: 500 }
    );
  }
}
