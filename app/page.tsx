"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, RefreshCw, Building2, FileText, Users, Loader2, LogOut } from "lucide-react";

interface Student {
  uid: string;
  name: string;
  phone: string;
  "completion%": number;
  status: string;
}

export default function PlacementDashboard() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [jd, setJd] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [hashMap, setHashMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [preparingLinks, setPreparingLinks] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/login");
  };

  const fetchStudents = async () => {
    if (!companyName.trim()) {
      alert("Please enter company name");
      return;
    }

    setLoading(true);
    setHashMap({});

    try {
      const res = await fetch(`/api/sheets?sheetName=${companyName}`);
      const data = await res.json();

      if (data.error) {
        alert("Sheet not found: " + data.error);
        setStudents([]);
        setLoading(false);
        return;
      }

      const list: Student[] = Array.isArray(data) ? data : [];
      setStudents(list);
      await prepareHashes(list);

    } catch (error) {
      console.error("Fetch error:", error);
      alert("Failed to fetch students");
      setStudents([]);
    }

    setLoading(false);
  };

  const prepareHashes = async (list: Student[]) => {
    setPreparingLinks(true);
    const map: Record<string, string> = {};

    for (const student of list) {
      try {
        const res = await fetch("/api/hash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: student.uid,
            company: companyName,
          }),
        });

        const data = await res.json();
        if (data.hash) {
          map[student.uid] = data.hash;
        }
      } catch (err) {
        console.error("Hash error for", student.uid, err);
      }
    }

    setHashMap(map);
    setPreparingLinks(false);
  };

  const sendWhatsApp = async (student: Student) => {
    if (!jd.trim()) {
      alert("Please enter Job Description first");
      return;
    }

    const hash = hashMap[student.uid];

    if (!hash) {
      alert("Hash not ready yet. Please wait.");
      return;
    }

    try {
      await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateStatus",
          sheetName: companyName,
          uid: student.uid,
          status: "Sent",
        }),
      });

      setStudents((prev) =>
        prev.map((s) =>
          s.uid === student.uid ? { ...s, status: "Sent" } : s
        )
      );

      const formLink = `${window.location.origin}/apply/${hash}`;

      const message = `Hi *${student.name || ""}*! 👋

Sharing an internship opportunity from *${companyName}* that can add strong value to your learning and career journey.

*Job Details:*
${jd}

*Apply here:* ${formLink}`;

      const whatsappUrl = `https://wa.me/${student.phone}?text=${encodeURIComponent(
        message
      )}`;

      window.open(whatsappUrl, "_blank");

    } catch (error) {
      console.error(error);
      alert("Failed to send WhatsApp message");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-black">PlacementOps</h1>
            <p className="text-sm font-medium text-gray-600">
              Automated Interest Collection Tool
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg">
              <Users size={18} className="text-blue-700" />
              <span className="text-sm font-bold text-blue-700">
                {students.length} Students
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition text-red-700 font-medium"
              title="Logout"
            >
              <LogOut size={18} />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="text-blue-600" />
              <h2 className="text-lg font-bold text-black">Company Details</h2>
            </div>

            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter Sheet Name (e.g. Google_2024)"
              className="w-full border border-gray-300 p-3 rounded-lg mb-4 text-black focus:ring-2 focus:ring-blue-600 outline-hidden"
            />

            <button
              onClick={fetchStudents}
              disabled={loading || preparingLinks}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:bg-gray-400 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Loading Students...
                </>
              ) : preparingLinks ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Preparing Links...
                </>
              ) : (
                "Load Students"
              )}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="text-green-600" />
              <h2 className="text-lg font-bold text-black">Job Description</h2>
            </div>

            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              rows={6}
              placeholder="Paste the job description details here..."
              className="w-full border border-gray-300 p-3 rounded-lg text-black focus:ring-2 focus:ring-green-600 outline-hidden"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-black">Student List</h2>
            {preparingLinks && (
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                <Loader2 className="animate-spin" size={16} />
                Generating Hashes...
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {students.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr className="bg-white">
                    <th className="px-6 py-4 text-black font-bold">UID</th>
                    <th className="px-6 py-4 text-black font-bold">Name</th>
                    <th className="px-6 py-4 text-black font-bold">Status</th>
                    <th className="px-6 py-4 text-black font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.uid} className="hover:bg-gray-50 even:bg-white odd:bg-gray-100 transition-colors">
                      <td className="px-6 py-4 text-black font-medium">{student.uid}</td>
                      <td className="px-6 py-4 text-black font-medium">{student.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          student.status === "Sent" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {student.status || "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => sendWhatsApp(student)}
                          disabled={student.status === "Sent" || preparingLinks}
                          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-bold transition-colors disabled:bg-gray-300"
                        >
                          <Send size={16} />
                          {student.status === "Sent" ? "Resend" : "Send"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-20 text-center">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">No students found. Please enter a company name and load the list.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// "use client";

// import { useState } from "react";
// import { Send, RefreshCw, Building2, FileText, Users } from "lucide-react";

// interface Student {
//   uid: string;
//   name: string;
//   phone: string;
//   "completion%": number;
//   status: string;
// }

// export default function PlacementDashboard() {
//   const [companyName, setCompanyName] = useState("");
//   const [jd, setJd] = useState("");
//   const [students, setStudents] = useState<Student[]>([]);
//   const [hashMap, setHashMap] = useState<Record<string, string>>({});
//   const [loading, setLoading] = useState(false);
//   const [preparingLinks, setPreparingLinks] = useState(false);

//   // ================= LOAD STUDENTS =================
//   const fetchStudents = async () => {
//     if (!companyName.trim()) {
//       alert("Please enter company name");
//       return;
//     }

//     setLoading(true);
//     setHashMap({});

//     try {
//       const res = await fetch(`/api/sheets?sheetName=${companyName}`);
//       const data = await res.json();

//       if (data.error) {
//         alert("Sheet not found: " + data.error);
//         setStudents([]);
//         return;
//       }

//       const list: Student[] = Array.isArray(data) ? data : [];
//       setStudents(list);

//       // 🔹 Pre-generate hashes
//       await prepareHashes(list);

//     } catch (error) {
//       console.error("Fetch error:", error);
//       alert("Failed to fetch students");
//       setStudents([]);
//     }

//     setLoading(false);
//   };

//   // ================= PREPARE HASHES =================
//   const prepareHashes = async (list: Student[]) => {
//     setPreparingLinks(true);
//     const map: Record<string, string> = {};

//     for (const student of list) {
//       try {
//         const res = await fetch("/api/hash", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             uid: student.uid,
//             company: companyName,
//           }),
//         });

//         const data = await res.json();
//         if (data.hash) {
//           map[student.uid] = data.hash;
//         }
//       } catch (err) {
//         console.error("Hash error for", student.uid, err);
//       }
//     }

//     setHashMap(map);
//     setPreparingLinks(false);
//   };

//   // ================= SEND WHATSAPP =================
//   const sendWhatsApp = async (student: Student) => {
//     if (!jd.trim()) {
//       alert("Please enter Job Description first");
//       return;
//     }

//     const hash = hashMap[student.uid];

//     if (!hash) {
//       alert("Hash not ready yet. Please wait.");
//       return;
//     }

//     try {
//       // update status in sheet
//       await fetch("/api/sheets", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           action: "updateStatus",
//           sheetName: companyName,
//           uid: student.uid,
//           status: "Sent",
//         }),
//       });

//       setStudents((prev) =>
//         prev.map((s) =>
//           s.uid === student.uid ? { ...s, status: "Sent" } : s
//         )
//       );

//       const formLink = `${window.location.origin}/apply/${hash}`;

//       const message = `Hi *${student.name || ""}*! 👋

// Sharing an internship opportunity from *${companyName}* that can add strong value to your learning and career journey.

// *Job Details:*
// ${jd}

// *Apply here:* ${formLink}`;

//       const whatsappUrl = `https://wa.me/${student.phone}?text=${encodeURIComponent(
//         message
//       )}`;

//       window.open(whatsappUrl, "_blank");

//     } catch (error) {
//       console.error(error);
//       alert("Failed to send WhatsApp message");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50">

//       {/* Navbar */}
//       <nav className="bg-white shadow-md border-b border-slate-200">
//         <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between">
//           <div>
//             <h1 className="text-2xl font-bold text-slate-800">PlacementOps</h1>
//             <p className="text-sm text-slate-500">
//               Automated Interest Collection Tool
//             </p>
//           </div>
//           <div className="flex items-center gap-4">
//             <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
//               <Users size={18} className="text-blue-600" />
//               <span className="text-sm font-semibold text-blue-600">
//                 {students.length} Students
//               </span>
//             </div>
//           </div>
//         </div>
//       </nav>

//       <main className="max-w-7xl mx-auto px-6 py-8">

//         {/* Input Cards */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

//           {/* Company */}
//           <div className="bg-white rounded-xl shadow-md border p-6">
//             <div className="flex items-center gap-3 mb-4">
//               <Building2 className="text-blue-600" />
//               <h2 className="text-lg font-bold">Company Details</h2>
//             </div>

//             <input
//               type="text"
//               value={companyName}
//               onChange={(e) => setCompanyName(e.target.value)}
//               placeholder="Sheet Name"
//               className="w-full border p-3 rounded-lg mb-4"
//             />

//             <button
//               onClick={fetchStudents}
//               disabled={loading || preparingLinks}
//               className="w-full bg-blue-600 text-white py-3 rounded-lg"
//             >
//               {loading
//                 ? "Loading Students..."
//                 : preparingLinks
//                 ? "Preparing Links..."
//                 : "Load Students"}
//             </button>
//           </div>

//           {/* JD */}
//           <div className="bg-white rounded-xl shadow-md border p-6">
//             <div className="flex items-center gap-3 mb-4">
//               <FileText className="text-green-600" />
//               <h2 className="text-lg font-bold">Job Description</h2>
//             </div>

//             <textarea
//               value={jd}
//               onChange={(e) => setJd(e.target.value)}
//               rows={8}
//               placeholder="Enter job description..."
//               className="w-full border p-3 rounded-lg"
//             />
//           </div>
//         </div>

//         {/* Table */}
//         <div className="bg-white rounded-xl shadow-md border overflow-hidden">

//           <div className="px-6 py-4 border-b bg-slate-50">
//             <h2 className="text-lg font-bold">Student Applications</h2>
//             {preparingLinks && (
//               <p className="text-sm text-blue-600 mt-1">
//                 Preparing application links...
//               </p>
//             )}
//           </div>

//           {students.length > 0 ? (
//             <table className="w-full">
//               <thead className="bg-slate-100">
//                 <tr>
//                   <th className="px-4 py-2">UID</th>
//                   <th className="px-4 py-2">Name</th>
//                   <th className="px-4 py-2">Phone</th>
//                   <th className="px-4 py-2">Status</th>
//                   <th className="px-4 py-2 text-right">Action</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {students.map((student) => (
//                   <tr key={student.uid} className="border-t">
//                     <td className="px-4 py-2">{student.uid}</td>
//                     <td className="px-4 py-2">{student.name}</td>
//                     <td className="px-4 py-2">{student.phone}</td>
//                     <td className="px-4 py-2">
//                       {student.status || "Not Sent"}
//                     </td>
//                     <td className="px-4 py-2 text-right">
//                       <button
//                         onClick={() => sendWhatsApp(student)}
//                         disabled={
//                           student.status === "Sent" || preparingLinks
//                         }
//                         className="bg-green-600 text-white px-4 py-2 rounded-lg"
//                       >
//                         <Send size={14} />{" "}
//                         {student.status === "Sent" ? "Sent" : "Send"}
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           ) : (
//             <div className="p-10 text-center text-slate-500">
//               No students loaded
//             </div>
//           )}
//         </div>
//       </main>
//     </div>
//   );
// }


// "use client";
// import { useState } from "react";
// import { Send, RefreshCw, Building2, FileText, Users } from "lucide-react";

// interface Student {
//   uid: string;
//   name: string;
//   phone: string;
//   "completion%": number;
//   status: string;
// }

// export default function PlacementDashboard() {
//   const [companyName, setCompanyName] = useState("");
//   const [jd, setJd] = useState("");
//   const [students, setStudents] = useState<Student[]>([]);
//   const [loading, setLoading] = useState(false);

//   const fetchStudents = async () => {
//     if (!companyName.trim()) {
//       alert("Please enter company name");
//       return;
//     }

//     setLoading(true);
//     try {
//       const res = await fetch(`/api/sheets?sheetName=${companyName}`);
//       const data = await res.json();

//       if (data.error) {
//         alert("Sheet not found: " + data.error);
//         setStudents([]);
//       } else {
//         setStudents(Array.isArray(data) ? data : []);
//       }
//     } catch (error) {
//       console.error("Fetch error:", error);
//       alert("Failed to fetch students");
//       setStudents([]);
//     }
//     setLoading(false);
//   };

//   const sendWhatsApp = async (student: Student) => {
//     if (!jd.trim()) {
//       alert("Please enter Job Description first");
//       return;
//     }

//     try {
//       const res = await fetch("/api/sheets", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           action: "generateLink",
//           uid: student.uid,
//           company: companyName,
//         }),
//       });

//       const result = await res.json();

//       if (!result.hash) {
//         alert("Failed to generate application link");
//         return;
//       }

//       await fetch("/api/sheets", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           action: "updateStatus",
//           sheetName: companyName,
//           uid: student.uid,
//           status: "Sent",
//         }),
//       });

//       setStudents((prev) =>
//         prev.map((s) => (s.uid === student.uid ? { ...s, status: "Sent" } : s)),
//       );

//       const formLink = `${window.location.origin}/apply/${result.hash}`;
//       const message = `Hi *${student.name || ""}*! 👋\n\nSharing an internship opportunity from *${companyName}* that can add strong value to your learning and career journey. Opportunities like these help you gain hands-on exposure and stand out in placements.\n\n*Apply here:* ${formLink}`;
//       const whatsappUrl = `https://wa.me/${student.phone}?text=${encodeURIComponent(message)}`;
//       window.open(whatsappUrl, "_blank");
//     } catch (error) {
//       console.error(error);
//       alert("Failed to send WhatsApp message");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50">
//       {/* Navbar */}
//       <nav className="bg-white shadow-md border-b border-slate-200">
//         <div className="max-w-7xl mx-auto px-6 py-4">
//           <div className="flex items-center justify-between">
//             <div>
//               <h1 className="text-2xl font-bold text-slate-800">
//                 PlacementOps
//               </h1>
//               <p className="text-sm text-slate-500 mt-1">
//                 Automated Interest Collection Tool
//               </p>
//             </div>
//             <div className="flex items-center gap-4">
//               <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
//                 <Users size={18} className="text-blue-600" />
//                 <span className="text-sm font-semibold text-blue-600">
//                   {students.length} Students
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </nav>


//       <main className="max-w-7xl mx-auto px-6 py-8">

//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

//           <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
//             <div className="flex items-center gap-3 mb-4">
//               <div className="p-2 bg-blue-100 rounded-lg">
//                 <Building2 className="text-blue-600" size={24} />
//               </div>
//               <h2 className="text-lg font-bold text-slate-800">
//                 Company Details
//               </h2>
//             </div>
            
//             <div className="space-y-4 my-auto">
//               <div>
//                 <label className="block text-sm font-semibold text-slate-700 mb-2">
//                   Company/Sheet Name *
//                 </label>
//                 <input
//                   type="text"
//                   value={companyName}
//                   onChange={(e) => setCompanyName(e.target.value)}
//                   placeholder="e.g., TechCorp"
//                   className="w-full border border-slate-300 placeholder:text-gray-400 text-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                 />
//                 <p className="text-xs text-slate-500 mt-1.5">
//                   Must match the exact tab name in Google Sheets
//                 </p>
//               </div>

//               <button
//                 onClick={fetchStudents}
//                 disabled={loading}
//                 className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
//               >
//                 <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
//                 {loading ? "Loading..." : "Load Students"}
//               </button>
//             </div>
//           </div>

//           {/* Job Description Card */}
//           <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
//             <div className="flex items-center gap-3 mb-4">
//               <div className="p-2 bg-green-100 rounded-lg">
//                 <FileText className="text-green-600" size={24} />
//               </div>
//               <h2 className="text-lg font-bold text-slate-800">
//                 Job Description
//               </h2>
//             </div>
            
//             <div>
//               <label className="block text-sm font-semibold text-slate-700 mb-2">
//                 Job Details *
//               </label>
//               <textarea
//                 value={jd}
//                 onChange={(e) => setJd(e.target.value)}
//                 placeholder="Enter job description, requirements, and other details..."
//                 rows={8}
//                 className="w-full border placeholder:text-gray-400 text-slate-700 border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition resize-none"
//               />
//               <p className="text-xs text-slate-500 mt-1.5">
//                 This will be used when sending WhatsApp messages
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Students Table */}
//         <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
//           <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
//             <h2 className="text-lg font-bold text-slate-800">
//               Student Applications
//             </h2>
//             <p className="text-sm text-slate-500 mt-1">
//               {students.length > 0
//                 ? `Showing ${students.length} student${students.length !== 1 ? "s" : ""}`
//                 : "No students loaded yet"}
//             </p>
//           </div>

//           {loading ? (
//             <div className="px-6 py-12 text-center">
//               <RefreshCw className="animate-spin mx-auto mb-3 text-blue-600" size={32} />
//               <p className="text-slate-600">Loading students from Google Sheets...</p>
//             </div>
//           ) : students.length > 0 ? (
//             <div className="overflow-x-auto">
//               <table className="w-full">
//                 <thead className="bg-slate-50 border-b border-slate-200">
//                   <tr>
//                     <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
//                       UID
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
//                       Student Name
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
//                       Phone
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
//                       Status
//                     </th>
//                     <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
//                       Action
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-200">
//                   {students.map((student, index) => (
//                     <tr
//                       key={student.uid}
//                       className={`hover:bg-slate-50 transition ${
//                         index % 2 === 0 ? "bg-white" : "bg-slate-25"
//                       }`}
//                     >
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <span className="text-sm font-medium text-slate-900">
//                           {student.uid}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <span className="text-sm font-semibold text-slate-800">
//                           {student.name}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <span className="text-sm text-slate-600">
//                           {student.phone}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <span
//                           className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
//                             student.status === "Sent"
//                               ? "bg-green-100 text-green-700"
//                               : "bg-gray-100 text-gray-600"
//                           }`}
//                         >
//                           {student.status || "Not Sent"}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-right">
//                         <button
//                           onClick={() => sendWhatsApp(student)}
//                           disabled={student.status === "Sent"}
//                           className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
//                         >
//                           <Send size={14} />
//                           {student.status === "Sent" ? "Sent" : "Send"}
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           ) : (
//             <div className="px-6 py-12 text-center">
//               <div className="max-w-sm mx-auto">
//                 <Users className="mx-auto mb-3 text-slate-400" size={48} />
//                 <p className="text-slate-600 font-medium mb-2">
//                   No students loaded
//                 </p>
//                 <p className="text-sm text-slate-500">
//                   Enter a company name and click "Load Students" to view the list
//                 </p>
//               </div>
//             </div>
//           )}
//         </div>
//       </main>
//     </div>
//   );
// }
