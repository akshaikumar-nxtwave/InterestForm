"use client";

import { useState } from "react";
import { Send, Users, Loader2, Building2, Mail, FileText } from "lucide-react";

interface Student {
  uid: string;
  name: string;
  phone: string;
  status: string;
  sc_email: string;
}

export default function SCSendLinksPage() {
  const [companyName, setCompanyName] = useState("");
  const [scEmail, setScEmail] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [scEmails, setScEmails] = useState<string[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [hashMap, setHashMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [preparingLinks, setPreparingLinks] = useState(false);
//   const [jd, setJd] = useState("");

  const fetchStudents = async () => {
    if (!companyName.trim()) {
      alert("Please enter Company Name");
      return;
    }

    setLoading(true);
    setHashMap({});
    setStudents([]);
    setScEmails([]);
    setFilteredStudents([]);
    setScEmail("");

    try {
      const res = await fetch(`/api/sheets?sheetName=${companyName}`);
      const data = await res.json();

      if (data.error) {
        alert("Sheet not found: " + data.error);
        setLoading(false);
        return;
      }

      const list: Student[] = Array.isArray(data) ? data : [];
      setStudents(list);

      // Extract unique sc_emails
      const uniqueEmails: string[] = [];
      list.forEach((student) => {
        if (student.sc_email && !uniqueEmails.includes(student.sc_email)) {
          uniqueEmails.push(student.sc_email);
        }
      });
      setScEmails(uniqueEmails);
    } catch (error) {
      console.error("Fetch error:", error);
      alert("Failed to fetch students");
    }

    setLoading(false);
  };

  const handleScEmailChange = (selectedEmail: string) => {
    setScEmail(selectedEmail);
    if (students.length > 0) {
      const filtered = students.filter(
        (s) => s.sc_email && s.sc_email.toLowerCase() === selectedEmail.toLowerCase(),
      );
      setFilteredStudents(filtered);
      prepareHashes(filtered);
    }
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

      setFilteredStudents((prev) =>
        prev.map((s) => (s.uid === student.uid ? { ...s, status: "Sent" } : s)),
      );

      const formLink = `${window.location.origin}/apply/${hash}`;
      const message = `Hi *${student.name || ""}*! 👋
Sharing an internship opportunity from *${companyName}* that can add strong value to your learning and career journey.

Apply here: ${formLink}`;

      const whatsappUrl = `https://wa.me/${student.phone}?text=+91${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
    } catch (error) {
      console.error(error);
      alert("Failed to send WhatsApp message");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      {" "}
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {" "}
        <div className="p-6 border-b border-gray-100 bg-white">
          {" "}
          <h1 className="text-3xl font-black text-black mb-2">
            Click & Send
          </h1>{" "}
          <p className="text-gray-600 font-medium">
            Send localized application links to your assigned students.
          </p>{" "}
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-black flex items-center gap-2">
                <Building2 size={16} /> Company Name
              </label>
              <input
                type="text"
                placeholder="e.g. Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full border-2 border-gray-200 p-3 rounded-xl text-black focus:border-black outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-black flex items-center gap-2">
                <Mail size={16} /> Your SC Email
              </label>
              <select
                value={scEmail}
                onChange={(e) => handleScEmailChange(e.target.value)}
                disabled={scEmails.length === 0}
                className="w-full border-2 border-gray-200 p-3 rounded-xl text-black focus:border-black outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {scEmails.length === 0
                    ? "Load company first to see SC emails"
                    : "Select SC Email"}
                </option>
                {scEmails.map((email) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={fetchStudents}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-blue-900 disabled:bg-gray-400 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Loading students please wait...
              </>
            ) : (
              "Load Students"
            )}
          </button>
        </div>
        <div className="bg-gray-50 p-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm">
              <Users size={18} className="text-black" />
              <span className="font-bold text-black">
                {filteredStudents.length} Students Found
              </span>
            </div>
            {preparingLinks && (
              <span className="text-blue-700 text-sm font-bold flex items-center gap-2">
                <Loader2 className="animate-spin" size={14} /> Generating
                individual tokens...
              </span>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filteredStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="p-4 text-black font-black uppercase text-xs tracking-wider">
                        UID
                      </th>
                      <th className="p-4 text-black font-black uppercase text-xs tracking-wider">
                        Name
                      </th>
                      <th className="p-4 text-black font-black uppercase text-xs tracking-wider">
                        Status
                      </th>
                      <th className="p-4 text-black font-black uppercase text-xs tracking-wider text-center">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.uid}
                        className="hover:bg-gray-50 even:bg-white odd:bg-gray-100 transition-colors"
                      >
                        <td className="p-4 text-black font-medium">
                          {student.uid}
                        </td>
                        <td className="p-4 text-black font-medium">
                          {student.name}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              student.status === "Sent"
                                ? "bg-green-100 text-green-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {student.status || "Pending"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => sendWhatsApp(student)}
                            disabled={
                              preparingLinks
                            }
                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-bold transition-all disabled:opacity-30 disabled:grayscale"
                          >
                            <Send size={16} />
                            {student.status === "Sent" ? "Resend" : "Send"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-20 text-center">
                <Users size={48} className="mx-auto text-gray-200 mb-4" />
                <p className="text-gray-400 font-bold">
                  List is empty. Enter credentials to load students.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

