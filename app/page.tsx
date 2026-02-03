"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Building2,
  FileText,
  Users,
  Loader2,
  LogOut,
} from "lucide-react";

interface Student {
  uid: string;
  name: string;
  phone: string;
  sc_email: string;
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

  const scEmails = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((student) => {
      if (student.sc_email) {
        counts[student.sc_email] = (counts[student.sc_email] || 0) + 1;
      }
    });

    return Object.entries(counts).map(([scEmail, scCount]) => ({
      scEmail,
      scCount,
    }));
  }, [students]);

  useEffect(() => {
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
    document.cookie =
      "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
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
        alert(data.error);
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
        prev.map((s) => (s.uid === student.uid ? { ...s, status: "Sent" } : s)),
      );

      const formLink = `${window.location.origin}/apply/${hash}`;

      const message = `Hi *${student.name || ""}*! 👋
Sharing an internship opportunity from ${companyName} that can add strong value to your learning and career journey.

Job Details: ${jd}

Apply here: ${formLink}`;

      const whatsappUrl = `[https://wa.me/$](https://wa.me/$){student.phone}?text=${encodeURIComponent(
        message,
      )}`;

      window.open(whatsappUrl, "_blank");
    } catch (error) {
      console.error(error);
      alert("Failed to send WhatsApp message");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {" "}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        {" "}
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          {" "}
          <div>
            {" "}
            <h1 className="text-2xl font-black text-black">
              PlacementOps
            </h1>{" "}
            <p className="text-sm font-medium text-gray-600">
              {" "}
              Automated Interest Collection Tool{" "}
            </p>{" "}
          </div>{" "}
          <div className="flex items-center gap-4">
            {" "}
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg">
              {" "}
              <Users size={18} className="text-blue-700" />{" "}
              <span className="text-sm font-bold text-blue-700">
                {" "}
                {students.length} Students{" "}
              </span>{" "}
            </div>{" "}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition text-red-700 font-medium"
              title="Logout"
            >
              {" "}
              <LogOut size={18} /> <span className="text-sm">Logout</span>{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
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

        <div className="bg-gray-50 border-b border-gray-200 p-4">
  <div className="flex items-center gap-2 mb-3 px-2">
    <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
      Email Distribution
    </h3>
  </div>
  
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
    {scEmails.map((emailObj) => (
      <div
        key={emailObj.scEmail}
        className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-colors"
      >
        <div className="flex flex-col truncate mr-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-tight">
            Source
          </span>
          <span className="text-sm font-bold text-black truncate">
            {emailObj.scEmail}
          </span>
        </div>
        <div className="flex flex-col items-end min-w-fit">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-tight">
            Count
          </span>
          <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 text-sm font-black px-2.5 py-0.5 rounded-md border border-blue-100">
            {emailObj.scCount}
          </span>
        </div>
      </div>
    ))}
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
                    <th className="px-6 py-4 text-black font-bold">SC Email</th>
                    <th className="px-6 py-4 text-black font-bold">Status</th>
                    <th className="px-6 py-4 text-black font-bold text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr
                      key={student.uid}
                      className="hover:bg-gray-50 even:bg-white odd:bg-gray-100 transition-colors"
                    >
                      <td className="px-6 py-4 text-black font-medium">
                        {student.uid}
                      </td>
                      <td className="px-6 py-4 text-black font-medium">
                        {student.name}
                      </td>
                      <td className="px-6 py-4 text-black font-medium">
                        {student.sc_email}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            student.status === "Sent"
                              ? "bg-green-100 text-green-800"
                              : "text-gray-800"
                          }`}
                        >
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
                <p className="text-gray-500 font-medium">
                  No students found. Please enter a company name and load the
                  list.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { Send, Building2, FileText, Users, Loader2, LogOut } from "lucide-react";

// interface Student {
//   uid: string;
//   name: string;
//   phone: string;
//   sc_email: string;
//   status: string;
// }

// interface ScEmailCount {
//   scEmail: string,
//   scCount: number
// }

// export default function PlacementDashboard() {
//   const router = useRouter();
//   const [companyName, setCompanyName] = useState("");
//   const [jd, setJd] = useState("");
//   const [students, setStudents] = useState<Student[]>([]);
//   const [hashMap, setHashMap] = useState<Record<string, string>>({});
//   const [loading, setLoading] = useState(false);
//   const [preparingLinks, setPreparingLinks] = useState(false);
//   const [scEmails, setScEmails] = useState<ScEmailCount[]>([])

//     students.forEach((student) => {
//       if(!scEmails.some((emailObj: any) => emailObj.scEmail === student.sc_email)){
//         setScEmails((prev) => [...prev, {scEmail: student.sc_email, scCount: 1}]);
//       } else{
//         setScEmails((prev) => prev.map((emailObj: any) =>
//           emailObj.scEmail === student.sc_email ? {...emailObj, scCount: emailObj.scCount + 1} : emailObj
//         ));
//       }
//     });

//   useEffect(() => {
//     // Check if user is authenticated
//     const checkAuth = async () => {
//       const token = localStorage.getItem("auth_token");
//       if (!token) {
//         router.push("/login");
//       }
//     };
//     checkAuth();
//   }, [router]);

//   const handleLogout = () => {
//     localStorage.removeItem("auth_token");
//     document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
//     router.push("/login");
//   };

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
//         setLoading(false);
//         return;
//       }

//       const list: Student[] = Array.isArray(data) ? data : [];
//       setStudents(list);
//       await prepareHashes(list);

//     } catch (error) {
//       console.error("Fetch error:", error);
//       alert("Failed to fetch students");
//       setStudents([]);
//     }

//     setLoading(false);
//   };

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
//     <div className="min-h-screen bg-gray-50">
//       <nav className="bg-white shadow-sm border-b border-gray-200">
//         <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
//           <div>
//             <h1 className="text-2xl font-black text-black">PlacementOps</h1>
//             <p className="text-sm font-medium text-gray-600">
//               Automated Interest Collection Tool
//             </p>
//           </div>
//           <div className="flex items-center gap-4">
//             <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg">
//               <Users size={18} className="text-blue-700" />
//               <span className="text-sm font-bold text-blue-700">
//                 {students.length} Students
//               </span>
//             </div>
//             <button
//               onClick={handleLogout}
//               className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition text-red-700 font-medium"
//               title="Logout"
//             >
//               <LogOut size={18} />
//               <span className="text-sm">Logout</span>
//             </button>
//           </div>
//         </div>
//       </nav>

//       <main className="max-w-7xl mx-auto px-6 py-8">
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <div className="flex items-center gap-3 mb-4">
//               <Building2 className="text-blue-600" />
//               <h2 className="text-lg font-bold text-black">Company Details</h2>
//             </div>

//             <input
//               type="text"
//               value={companyName}
//               onChange={(e) => setCompanyName(e.target.value)}
//               placeholder="Enter Sheet Name (e.g. Google_2024)"
//               className="w-full border border-gray-300 p-3 rounded-lg mb-4 text-black focus:ring-2 focus:ring-blue-600 outline-hidden"
//             />

//             <button
//               onClick={fetchStudents}
//               disabled={loading || preparingLinks}
//               className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:bg-gray-400 transition-colors"
//             >
//               {loading ? (
//                 <>
//                   <Loader2 className="animate-spin" size={20} />
//                   Loading Students...
//                 </>
//               ) : preparingLinks ? (
//                 <>
//                   <Loader2 className="animate-spin" size={20} />
//                   Preparing Links...
//                 </>
//               ) : (
//                 "Load Students"
//               )}
//             </button>
//           </div>

//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <div className="flex items-center gap-3 mb-4">
//               <FileText className="text-green-600" />
//               <h2 className="text-lg font-bold text-black">Job Description</h2>
//             </div>

//             <textarea
//               value={jd}
//               onChange={(e) => setJd(e.target.value)}
//               rows={6}
//               placeholder="Paste the job description details here..."
//               className="w-full border border-gray-300 p-3 rounded-lg text-black focus:ring-2 focus:ring-green-600 outline-hidden"
//             />
//           </div>
//         </div>

//         <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
//           <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
//             <h2 className="text-lg font-bold text-black">Student List</h2>
//             {preparingLinks && (
//               <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
//                 <Loader2 className="animate-spin" size={16} />
//                 Generating Hashes...
//               </div>
//             )}
//           </div>

//           {
//             scEmails.map((emailObj) => (
//               <div key={emailObj.scEmail} className="px-6 py-2 border-b border-gray-200 flex justify-between items-center bg-gray-50">
//                 <span className="text-black font-medium">{emailObj.scEmail}</span>
//                 <span className="text-black font-medium">Count: {emailObj.scCount}</span>
//               </div>
//             ))
//           }

//           <div className="overflow-x-auto">
//             {students.length > 0 ? (
//               <table className="w-full text-left">
//                 <thead className="bg-gray-100 border-b border-gray-200">
//                   <tr className="bg-white">
//                     <th className="px-6 py-4 text-black font-bold">UID</th>
//                     <th className="px-6 py-4 text-black font-bold">Name</th>
//                     <th className="px-6 py-4 text-black font-bold">SC Email</th>
//                     <th className="px-6 py-4 text-black font-bold">Status</th>
//                     <th className="px-6 py-4 text-black font-bold text-center">Action</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-gray-200">
//                   {students.map((student) => (
//                     <tr key={student.uid} className="hover:bg-gray-50 even:bg-white odd:bg-gray-100 transition-colors">
//                       <td className="px-6 py-4 text-black font-medium">{student.uid}</td>
//                       <td className="px-6 py-4 text-black font-medium">{student.name}</td>
//                       <td className="px-6 py-4 text-black font-medium">{student.sc_email}</td>
//                       <td className="px-6 py-4">
//                         <span className={`px-3 py-1 rounded-full text-xs font-bold ${
//                           student.status === "Sent"
//                             ? "bg-green-100 text-green-800"
//                             : "bg-gray-100 text-gray-800"
//                         }`}>
//                           {student.status || "Pending"}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 text-right">
//                         <button
//                           onClick={() => sendWhatsApp(student)}
//                           disabled={student.status === "Sent" || preparingLinks}
//                           className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-bold transition-colors disabled:bg-gray-300"
//                         >
//                           <Send size={16} />
//                           {student.status === "Sent" ? "Resend" : "Send"}
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             ) : (
//               <div className="p-20 text-center">
//                 <Users size={48} className="mx-auto text-gray-300 mb-4" />
//                 <p className="text-gray-500 font-medium">No students found. Please enter a company name and load the list.</p>
//               </div>
//             )}
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }
