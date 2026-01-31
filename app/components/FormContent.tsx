"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { CheckCircle, AlertCircle, Upload, Loader2 } from "lucide-react";

interface FormContentProps {
  uid: string;
  company: string;
}

type FieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "email"
  | "url"
  | "phone"
  | "radio"
  | "dropdown"
  | "multi_select"
  | "checkbox"
  | "file"
  | "date"
  | "range";

interface FormField {
  question: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
}


export default function FormContent({ uid, company }: FormContentProps) {
  const [studentName, setStudentName] = useState("");
  const [jd, setJd] = useState("");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [loadingForm, setLoadingForm] = useState(true);

  const inputBaseClass = "w-full border-2 border-slate-200 p-3 rounded-lg text-black placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all";

  useEffect(() => {
    fetchStudentDetails();
    fetchFormTemplate();
  }, [uid, company]);

  const fetchStudentDetails = async () => {
    try {
      const { data } = await axios.get("/api/sheets", {
        params: { sheetName: company },
      });
      if (data?.error) { setFetchError(true); return; }
      const student = data.find((s: any) => s.uid == uid);
      if (!student) { setFetchError(true); return; }
      setStudentName(student.name);
    } catch { setFetchError(true); }
  };

  const fetchFormTemplate = async () => {
    try {
      const { data } = await axios.get("/api/sheets", { params: { action: "getFormTemplate", company } });
      if (!data || data.error) {
        setFormFields([]);
        setJd("");
        return;
      }
      const parsedTemplate = typeof data.template === "string" ? JSON.parse(data.template) : data.template;
      setFormFields(parsedTemplate || []);
      const parsedJD = typeof data.jd === "string" ? data.jd : JSON.stringify(data.jd);
      setJd(parsedJD || "");
    } catch {
      setFormFields([]);
      setJd("");
    } finally { setLoadingForm(false); }
  };

  const handleInputChange = (question: string, value: any) => {
    setFormData((prev) => ({ ...prev, [question]: value }));
  };

  const handleMultiSelectChange = (question: string, option: string) => {
    const current = formData[question] || [];
    const updated = current.includes(option)
      ? current.filter((v: string) => v !== option)
      : [...current, option];
    handleInputChange(question, updated);
  };

  const isValid = (field: FormField, value: any) => {
    if (!field.required) return true;
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const field of formFields) {
      if (!isValid(field, formData[field.question])) {
        alert(`Please answer: ${field.question}`);
        return;
      }
    }
    setLoading(true);
    try {
      const { data } = await axios.post("/api/sheets", {
        action: "saveResponse",
        sheetName: company,
        uid,
        name: studentName,
        response: formData,
      });
      if (data?.success) setSubmitted(true);
      else alert("Submission failed. Try again.");
    } catch { alert("Error submitting response"); } finally { setLoading(false); }
  };

  const renderField = (field: FormField, index: number) => {
    const value = formData[field.question] ?? "";

    switch (field.type) {
      case "short_text":
      case "email":
      case "url":
      case "phone":
      case "number":
      case "date":
        return (
          <div key={index} className="mb-6">
            <label className="block font-semibold mb-2 text-black">
              {field.question} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.type === "short_text" ? "text" : field.type}
              value={value}
              placeholder={`Enter ${field.question.toLowerCase()}...`}
              onChange={(e) => handleInputChange(field.question, e.target.value)}
              className={inputBaseClass}
            />
          </div>
        );

      case "long_text":
        return (
          <div key={index} className="mb-6">
            <label className="block font-semibold mb-2 text-black">
              {field.question} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={4}
              value={value}
              placeholder="Provide detailed information..."
              onChange={(e) => handleInputChange(field.question, e.target.value)}
              className={inputBaseClass}
            />
          </div>
        );

      case "checkbox":
        return (
          <label key={index} className="flex items-center gap-3 mb-6 cursor-pointer text-black">
            <input
              type="checkbox"
              className="w-5 h-5 accent-blue-600"
              checked={!!value}
              onChange={(e) => handleInputChange(field.question, e.target.checked)}
            />
            {field.question}
          </label>
        );

      case "radio":
        return (
          <div key={index} className="mb-6">
            <p className="font-semibold mb-2 text-black">
              {field.question} {field.required && <span className="text-red-500">*</span>}
            </p>
            {field.options?.map((opt) => (
              <label key={opt} className="flex items-center gap-2 mb-2 cursor-pointer text-black">
                <input
                  type="radio"
                  className="w-4 h-4 accent-blue-600"
                  checked={value === opt}
                  onChange={() => handleInputChange(field.question, opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        );

      case "dropdown":
        return (
          <div key={index} className="mb-6">
            <label className="block font-semibold mb-2 text-black">
              {field.question} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleInputChange(field.question, e.target.value)}
              className={`${inputBaseClass} bg-white`}
            >
              <option value="" className="text-gray-400">Select an option</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );

      case "multi_select":
        return (
          <div key={index} className="mb-6">
            <p className="font-semibold mb-2 text-black">
              {field.question} {field.required && <span className="text-red-500">*</span>}
            </p>
            {field.options?.map((opt) => (
              <label key={opt} className="flex items-center gap-2 mb-2 cursor-pointer text-black">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-blue-600"
                  checked={(value || []).includes(opt)}
                  onChange={() => handleMultiSelectChange(field.question, opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        );

      case "file":
        return (
          <div key={index} className="mb-6">
            <label className="block font-semibold mb-2 text-black">
              {field.question} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <Upload className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                type="url"
                value={value}
                onChange={(e) => handleInputChange(field.question, e.target.value)}
                placeholder="Paste Google Drive link here"
                className={`${inputBaseClass} pl-10`}
              />
            </div>
          </div>
        );

      case "range":
        return (
          <div key={index} className="mb-6">
            <label className="block font-semibold mb-2 text-black">
              {field.question}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={10}
                className="w-full accent-blue-600"
                value={value || 5}
                onChange={(e) => handleInputChange(field.question, e.target.value)}
              />
              <span className="font-bold text-black min-w-5">{value || 5}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (fetchError) {
    return (
      <div className=" bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-black font-semibold">Student record not found.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-600 mb-2">Thank You!</h2>
          <p className="text-slate-600 mb-4">Your response has been submitted successfully.</p>
          <p className="text-sm text-slate-500">We'll get back to you soon regarding the {company} opportunity.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 bg-blue-600 text-white rounded-t-xl">
          <h1 className="text-2xl font-bold">{company}</h1>
          <p className="opacity-90">Placement Opportunity</p>
        </div>

        <div className="p-6 border-b border-slate-100">
          <p className="text-sm text-gray-400">UID: {uid}</p>
        </div>

        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-black mb-2">Job Description</h2>
          <p className="whitespace-pre-wrap text-black text-sm leading-relaxed">{jd || "No description provided."}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {loadingForm ? (
            <div className="py-10 text-center">
              <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-gray-400 text-sm">Loading your form...</p>
            </div>
          ) : (
            <>
              {formFields.map(renderField)}
              <button
                disabled={loading}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-lg font-bold transition-colors disabled:bg-slate-300"
              >
                {loading ? "Submitting..." : "Submit Application"}
              </button>
            </>
          )}
        </form>
      </div>
    </main>
  );
}

