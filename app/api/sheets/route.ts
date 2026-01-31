import { NextResponse } from "next/server";

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL_ENV as string;

// ================= GET =================
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const sheetName = searchParams.get("sheetName");

  try {
    // decode hash
    if (action === "decodeHash") {
      const hash = searchParams.get("hash");
      const res = await fetch(
        `${GOOGLE_SCRIPT_URL}?action=decodeHash&hash=${hash}`
      );
      const data = await res.json();
      return NextResponse.json(data);
    }

    // get form template
    if (action === "getFormTemplate") {
      const company = searchParams.get("company");
      const res = await fetch(
        `${GOOGLE_SCRIPT_URL}?action=getFormTemplate&company=${company}`
      );
      const data = await res.json();
      return NextResponse.json(data);
    }

    // get students
    if (!sheetName) {
      return NextResponse.json(
        { error: "sheetName required" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${GOOGLE_SCRIPT_URL}?action=getStudents&sheetName=${sheetName}`
    );

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

// ================= POST =================
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json(
      { error: "Request failed" },
      { status: 500 }
    );
  }
}


// import { NextResponse } from 'next/server';

// const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL_ENV as string;
// // const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL_ENV;

// export async function GET(request: Request) {
//   const { searchParams } = new URL(request.url);
//   const action = searchParams.get('action');
  
//   if (action === 'decodeHash') {
//     const hash = searchParams.get('hash');
//     try {
//       const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=decodeHash&hash=${hash}`);
//       const data = await response.json();
//       return NextResponse.json(data);
//     } catch (error) {
//       return NextResponse.json({ error: 'Failed to decode hash' }, { status: 500 });
//     }
//   }
  
//   if (action === 'getFormTemplate') {
//     const company = searchParams.get('company');
//     try {
//       const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getFormTemplate&company=${company}`);
//       const data = await response.json();
//       return NextResponse.json(data);
//     } catch (error) {
//       return NextResponse.json({ error: 'Failed to fetch form template' }, { status: 500 });
//     }
//   }
  
//   const sheetName = searchParams.get('sheetName');
  
//   if (!sheetName) {
//     return NextResponse.json({ error: 'sheetName required' }, { status: 400 });
//   }
  
//   try {
//     const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getStudents&sheetName=${sheetName}`);
//     const data = await response.json();
//     return NextResponse.json(data);
//   } catch (error) {
//     return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
//   }
// }

// export async function POST(request: Request) {
//   const body = await request.json();
  
//   try {
//     const response = await fetch(GOOGLE_SCRIPT_URL, {
//       method: 'POST',
//       body: JSON.stringify(body),
//     });
//     const result = await response.json();
//     return NextResponse.json(result);
//   } catch (error) {
//     return NextResponse.json({ error: 'Request failed' }, { status: 500 });
//   }
// }
